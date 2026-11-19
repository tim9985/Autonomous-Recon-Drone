"""Back up and verify review fixes in disposable databases before applying to drone_dev."""
import concurrent.futures, datetime, hashlib, json, pathlib, subprocess, tempfile, time
import apply as migration
from apply import ROOT, DOCKER, CONTAINER, psql
from review_schema import run
from verify import acceptance_sql, verify


def archive(database, path, restore=False):
    command='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec '+(
        'pg_restore -U drone_owner -d "$1" --exit-on-error' if restore else 'pg_dump -U drone_owner -d "$1" -Fc')
    with path.open('rb' if restore else 'wb') as f:
        subprocess.run(DOCKER+['exec','-i',CONTAINER,'sh','-c',command,'sh',database],
                       **({'stdin':f} if restore else {'stdout':f}),check=True)
    path.chmod(0o600)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def concurrent_pair(database,a,b):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        fa=pool.submit(run,database,a); time.sleep(0.5); fb=pool.submit(run,database,b)
        for f in (fa,fb):
            r=f.result(); assert r.returncode==0,r.stderr


def main():
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    folder=ROOT/'backups'/('review-fixes-'+stamp); folder.mkdir(parents=True,mode=0o700)
    report={'created_at_utc':stamp,'backup_folder':str(folder),'state':'incomplete'}
    created=[]
    try:
        report['before_sha256']=archive('drone_dev',folder/'before.dump')
        checkdb='drone_fix_check_'+stamp.lower(); restoredb='drone_fix_restore_'+stamp.lower()
        for name in (checkdb,restoredb):
            psql('CREATE DATABASE '+name+' TEMPLATE template0;','postgres'); created.append(name)
        archive(checkdb,folder/'before.dump',True)
        attributes="SELECT proname,prosecdef,coalesce(proconfig::text,''),proacl::text FROM pg_proc WHERE pronamespace='drone'::regnamespace AND proname IN ('validate_relationships','mark_event_published') ORDER BY proname;"
        before_attributes=psql(attributes,checkdb)
        migration.apply(checkdb)
        assert psql(attributes,checkdb)==before_attributes,'Function privileges/attributes changed'
        sql=acceptance_sql()
        assert 'PASS: review regression' in psql(sql,checkdb)
        report['negative_checks']=sql.count('SELECT pg_temp.expect_error(')
        report['staging_acceptance']='passed'
        report['staging_sha256']=archive(checkdb,folder/'staging.dump')
        archive(restoredb,folder/'staging.dump',True)
        assert 'PASS: review regression' in psql(sql,restoredb)
        report['backup_restore']='passed'
        # Commit sample rows only in the temporary database for concurrent sessions.
        psql(sql.rsplit('ROLLBACK;',1)[0]+'\nCOMMIT;',checkdb)
        a="BEGIN; SET LOCAL ROLE drone_api; SET LOCAL statement_timeout='8s'; SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000060'); SELECT pg_sleep(2); SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000080'); ROLLBACK;"
        b="BEGIN; SET LOCAL ROLE drone_api; SET LOCAL statement_timeout='8s'; SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000080'); ROLLBACK;"
        concurrent_pair(checkdb,a,b); report['publisher_deadlock_regression']='passed'
        a="BEGIN; UPDATE drone.user_session SET revoked_at=now() WHERE session_id='00000000-0000-0000-0000-000000000003'; SELECT pg_sleep(2); ROLLBACK;"
        b="BEGIN; SET LOCAL lock_timeout='400ms'; INSERT INTO drone.drone(drone_id,name,gateway_state,link_state) VALUES ('unrelated-drone','unrelated','{}','{}'); ROLLBACK;"
        concurrent_pair(checkdb,a,b); report['independent_write_concurrency']='passed'
        def event(n,delay=0,rollback=False):
            data=json.dumps({'event_id':f'22222222-2222-2222-2222-{n:012d}','event_type':'SAMPLE','code':'SAMPLE','payload':{},'refs':[], 'producer_id':'fix-concurrency','producer_session_id':stamp,'sequence':n})
            return f"BEGIN; SET LOCAL ROLE drone_api; SELECT drone.record_event('{data}'); SELECT pg_sleep({delay}); "+('ROLLBACK;' if rollback else 'COMMIT;')
        concurrent_pair(checkdb,event(1,2),event(2))
        concurrent_pair(checkdb,event(3,2,True),event(4))
        psql(event(1),checkdb)
        rows=psql("SELECT sequence,event_seq FROM drone.mission_event WHERE producer_id='fix-concurrency' ORDER BY event_seq;",checkdb).splitlines()
        pairs=[list(map(int,r.split('|'))) for r in rows]
        assert [p[0] for p in pairs]==[1,2,4],pairs
        assert [p[1] for p in pairs]==list(range(pairs[0][1],pairs[0][1]+3)),pairs
        report['event_commit_order_rollback_retry']='passed'
        # Exercise forward migration and immutable history without changing shipped files.
        with tempfile.TemporaryDirectory(prefix='drone-migration-check-') as temp:
            stage=pathlib.Path(temp); scripts=stage/'db/migrations';scripts.mkdir(parents=True)
            for f in (ROOT/'db/migrations').glob('*.sql'):(scripts/f.name).write_bytes(f.read_bytes())
            original=migration.ROOT; migration.ROOT=stage
            try:
                migration.apply(checkdb)
                extra=scripts/'005_regression_only.sql';extra.write_text('SELECT 1;\n')
                migration.apply(checkdb); migration.apply(checkdb)
                extra.write_text('SELECT 2;\n')
                try:migration.apply(checkdb)
                except RuntimeError:pass
                else:raise AssertionError('changed applied migration accepted')
                extra.unlink()
                try:migration.apply(checkdb)
                except RuntimeError:pass
                else:raise AssertionError('removed applied migration accepted')
                extra.write_text('SELECT 1;\n')
                (scripts/'006_failure_only.sql').write_text('CREATE TABLE drone.rollback_probe(n integer); SELECT definitely_missing_function();')
                try:migration.apply(checkdb)
                except subprocess.CalledProcessError:pass
                else:raise AssertionError('invalid migration accepted')
                assert psql("SELECT to_regclass('drone.rollback_probe') IS NULL AND NOT EXISTS(SELECT 1 FROM drone.schema_migration WHERE version='006_failure_only');",checkdb).strip()=='t'
            finally:migration.ROOT=original
        report['forward_migration_tamper_removal_atomicity']='passed'
        migration.apply('drone_dev')
        verify()
        migration.apply('drone_dev')
        report['target_verification']='passed'
        report['after_sha256']=archive('drone_dev',folder/'after.dump')
        report['migration_history']=psql('SELECT version,checksum FROM drone.schema_migration ORDER BY version;').splitlines()
        report['state']='passed'
    finally:
        for name in created:
            assert name.startswith(('drone_fix_check_','drone_fix_restore_'))
            psql('DROP DATABASE '+name+';','postgres')
        report['temporary_databases_removed']=True
        (ROOT/'evidence/database/review-fixes-20261005.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
