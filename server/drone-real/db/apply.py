"""Run with host administrator privileges; credentials remain inside the DB container."""
import hashlib, json, pathlib, re, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
DOCKER=['/home/se/sandboxes/drone-server/runtime/docker/docker','-H','unix:///home/se/sandboxes/drone-server/runtime/docker.sock']
CONTAINER='drone-services-20261005-database-1'
def psql(sql,database='drone_dev'):
    command='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec psql -X -q -v ON_ERROR_STOP=1 -U drone_owner -d "$1" -At'
    return subprocess.check_output(DOCKER+['exec','-i',CONTAINER,'sh','-c',command,'sh',database],input=sql,text=True)
def apply(database):
    migrations=sorted((ROOT/'db/migrations').glob('*.sql'))
    if not migrations or any(not re.fullmatch(r'\d{3}_[a-z0-9_]+',f.stem) for f in migrations):
        raise ValueError('Migration names must be NNN_lowercase_name.sql')
    if len({f.name[:3] for f in migrations}) != len(migrations):
        raise ValueError('Duplicate migration number')
    expected={f.stem:hashlib.sha256(f.read_bytes()).hexdigest() for f in migrations}
    actual={}
    exists=psql("SELECT to_regclass('drone.schema_migration') IS NOT NULL;",database).strip()=='t'
    if exists:
        actual=dict(line.split('|') for line in psql('SELECT version,checksum FROM drone.schema_migration ORDER BY version;',database).splitlines())
        if list(actual.items()) != list(expected.items())[:len(actual)]:
            raise RuntimeError('Applied migrations were changed, removed or reordered')
        if actual==expected: print('Verified identical migration checksums; already applied'); return
    elif psql("SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='drone');",database).strip()=='t':
        raise RuntimeError('Existing untracked drone schema; refusing replacement')
    roles='''DO $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='drone_schema_owner') THEN CREATE ROLE drone_schema_owner NOLOGIN; END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='drone_migrator') THEN CREATE ROLE drone_migrator NOLOGIN; END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='drone_reader') THEN CREATE ROLE drone_reader NOLOGIN; END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='drone_vision') THEN CREATE ROLE drone_vision NOLOGIN; END IF;
    END $$;
    GRANT drone_schema_owner TO drone_migrator;
    '''
    # Recheck under one transaction lock; a concurrent deployment must not race the preflight read.
    snapshot=json.dumps(actual)
    guard=f'''DO $$ DECLARE recorded jsonb; BEGIN
      IF to_regclass('drone.schema_migration') IS NOT NULL THEN
        SELECT coalesce(jsonb_object_agg(version,checksum),'{{}}'::jsonb) INTO recorded FROM drone.schema_migration;
      ELSE
        IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='drone') THEN RAISE EXCEPTION 'untracked drone schema'; END IF;
        recorded := '{{}}'::jsonb;
      END IF;
      IF recorded <> '{snapshot}'::jsonb THEN RAISE EXCEPTION 'Migration history changed during preflight; retry'; END IF;
    END $$;'''
    body=['BEGIN;','SET LOCAL lock_timeout=\'10s\';','SELECT pg_advisory_xact_lock(20261005,2);',guard]
    if not actual: body.append(roles)
    pending=migrations[len(actual):]
    for f in pending:
        body += [f.read_text(encoding='utf-8'),f"INSERT INTO drone.schema_migration(version,checksum) VALUES ('{f.stem}','{expected[f.stem]}');"]
    body+=['COMMIT;']
    print(psql('\n'.join(body),database))
    print(f'Applied {len(pending)} new migration(s); {len(migrations)} total in {database}')
if __name__=='__main__': apply(sys.argv[1] if len(sys.argv)>1 else 'drone_dev')
