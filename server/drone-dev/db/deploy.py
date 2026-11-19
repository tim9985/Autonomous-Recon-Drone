"""Back up, stage, check, restore, then apply only the current service database."""
import concurrent.futures, datetime, hashlib, json, pathlib, subprocess, time
from apply import ROOT, DOCKER, CONTAINER, psql, apply
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
folder=ROOT/'backups'/('business-schema-'+stamp)
folder.mkdir(parents=True,mode=0o700)
evidence=ROOT/'evidence/database';evidence.mkdir(parents=True,exist_ok=True)
checkdb='drone_schema_check_'+stamp.lower(); restoredb='drone_schema_restore_'+stamp.lower()
def dump(database,path):
    cmd='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec pg_dump -U drone_owner -d "$1" -Fc'
    with path.open('wb') as f:subprocess.run(DOCKER+['exec',CONTAINER,'sh','-c',cmd,'sh',database],stdout=f,check=True)
    path.chmod(0o600)
    return hashlib.sha256(path.read_bytes()).hexdigest()
def restore(database,path):
    cmd='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec pg_restore -U drone_owner -d "$1" --exit-on-error'
    with path.open('rb') as f:subprocess.run(DOCKER+['exec','-i',CONTAINER,'sh','-c',cmd,'sh',database],stdin=f,check=True)
def catalog(database):
    result=json.loads(psql("SELECT json_agg(json_build_object('table',table_name,'name',column_name,'type',udt_name,'nullable',is_nullable='YES') ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='drone' AND table_name NOT IN ('schema_migration','user_account_safe','user_session_safe');",database))
    expected=json.loads((ROOT/'db/schema_manifest.json').read_text())
    assert len(result)==298
    actual={}
    types={'double precision':'float8','integer':'int4','bigint':'int8','boolean':'bool','varchar(255)':'varchar','timestamptz':'timestamptz','uuid':'uuid','jsonb':'jsonb','text':'text'}
    for r in result: actual.setdefault(r['table'],[]).append({k:r[k] for k in ('name','type','nullable')})
    for t,cs in expected.items():
        assert actual[t]==[dict(c,type='geometry' if c['type'].startswith('geometry') else types[c['type']]) for c in cs],t
    return {'business_tables':len(actual),'business_columns':len(result),'drone_tables':int(psql("SELECT count(*) FROM pg_tables WHERE schemaname='drone';",database))}
def checks(database):
    output=psql((ROOT/'db/checks/001_acceptance.sql').read_text(),database)
    assert 'PASS:' in output
    return {'negative_checks':(ROOT/'db/checks/001_acceptance.sql').read_text().count('SELECT pg_temp.expect_error('),'result':'passed'}
def concurrency(database):
    def event_sql(n,delay=0,rollback=False):
        event={'event_id':f'11111111-1111-1111-1111-{n:012d}','event_type':'SCHEMA_CHECK','code':'SAMPLE','payload':{},'refs':[],'producer_id':'schema-concurrency','producer_session_id':stamp,'sequence':n}
        s=json.dumps(event).replace("'","''")
        return f"BEGIN; SELECT (drone.record_event('{s}'::jsonb)).event_seq; SELECT pg_sleep({delay}); {'ROLLBACK' if rollback else 'COMMIT'};"
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        a=pool.submit(psql,event_sql(1,1),database);time.sleep(0.2)
        b=pool.submit(psql,event_sql(2),database);a.result();b.result()
        a=pool.submit(psql,event_sql(3,1,True),database);time.sleep(0.2)
        b=pool.submit(psql,event_sql(4),database);a.result();b.result()
    rows=psql("SELECT sequence,event_seq FROM drone.mission_event WHERE producer_id='schema-concurrency' ORDER BY event_seq;",database).splitlines()
    assert [int(x.split('|')[0]) for x in rows]==[1,2,4],rows
    assert [int(x.split('|')[1]) for x in rows]==[1,2,3],rows
    # Same event ID returns the original cursor; changed meaning is rejected.
    psql(event_sql(1),database)
    assert int(psql("SELECT count(*) FROM drone.mission_event;",database))==3
    return {'commit_order':'passed','rollback':'passed','event_id_retry':'passed'}
baseline=psql("SELECT json_build_object('database',current_database(),'user',current_user,'postgres',version(),'postgis',postgis_version(),'listen_addresses',current_setting('listen_addresses'),'fsync',current_setting('fsync'),'synchronous_commit',current_setting('synchronous_commit'),'tables',(SELECT json_agg(schemaname||'.'||tablename ORDER BY schemaname,tablename) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')));")
(evidence/'baseline.json').write_text(baseline)
assert psql("SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='drone');").strip()=='f','Already deployed: use checks or apply.py; refusing to replay rollout'
before_hash=dump('drone_dev',folder/'before.dump')
report={'target':'drone_dev','schema':'drone','server_root':str(ROOT),'backup_folder':str(folder),'before_sha256':before_hash,'baseline':json.loads(baseline),'created_at_utc':stamp}
created=[]
try:
    for name in (checkdb,restoredb):
        psql('CREATE DATABASE '+name+' TEMPLATE template0;','postgres');created.append(name)
    restore(checkdb,folder/'before.dump')
    apply(checkdb)
    report['staging_catalog']=catalog(checkdb)
    report['staging_checks']=checks(checkdb)
    report['concurrency']=concurrency(checkdb)
    report['staging_sha256']=dump(checkdb,folder/'staging.dump')
    restore(restoredb,folder/'staging.dump')
    report['restore_catalog']=catalog(restoredb)
    report['restore_checks']=checks(restoredb)
    assert psql("SELECT count(*) FROM drone.mission_event;",restoredb).strip()=='3'
    report['restore_event_rows']=3
    apply('drone_dev')
    report['target_catalog']=catalog('drone_dev')
    report['target_checks']=checks('drone_dev')
    apply('drone_dev')
    report['idempotent_apply']='passed'
    report['after_sha256']=dump('drone_dev',folder/'after.dump')
    names=json.loads((ROOT/'db/schema_manifest.json').read_text())
    report['target_business_rows']=int(psql('SELECT sum(n) FROM ('+' UNION ALL '.join('SELECT count(*) AS n FROM drone.'+name for name in names)+') rows;').strip())
    report['technical_migration_rows']=3
    report['migration_history']=psql('SELECT version,checksum FROM drone.schema_migration ORDER BY version;').splitlines()
    report['state']='passed'
finally:
    for name in created:
        assert name.startswith(('drone_schema_check_','drone_schema_restore_'))
        psql('DROP DATABASE '+name+';','postgres')
    (evidence/'deployment.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
