"""Review only: snapshot the deployed schema into a disposable DB, reproduce findings, drop it."""
import concurrent.futures, datetime, hashlib, json, pathlib, subprocess, tempfile, time
import apply as migration
from apply import ROOT, DOCKER, CONTAINER, psql

def run(database,statement):
    command='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec psql -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U drone_owner -d "$1" -At'
    return subprocess.run(DOCKER+['exec','-i',CONTAINER,'sh','-c',command,'sh',database],input=statement,text=True,capture_output=True)

def main():
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    name='drone_review_'+stamp.lower()
    result={'checked_at_utc':stamp,'source_database':'drone_dev','test_database':name,'findings':{}}
    result['live_migrations']=psql('SELECT version,checksum FROM drone.schema_migration ORDER BY version;').splitlines()
    result['source_hashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'db/migrations').glob('*.sql')}
    expected=dict(line.split('|') for line in result['live_migrations'])
    assert all(expected[pathlib.Path(f).stem]==sha for f,sha in result['source_hashes'].items())
    result['live_ddl']=psql("SELECT proname,md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='drone'::regnamespace ORDER BY proname;").splitlines()
    with tempfile.TemporaryDirectory(prefix='drone-schema-review-') as temp:
        temp=pathlib.Path(temp); dump=temp/'schema.dump'
        command='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec pg_dump -U drone_owner -d drone_dev --schema-only -Fc'
        with dump.open('wb') as f:subprocess.run(DOCKER+['exec',CONTAINER,'sh','-c',command],stdout=f,check=True)
        psql('CREATE DATABASE '+name+' TEMPLATE template0;','postgres')
        try:
            command='export PGPASSWORD="$(cat /run/identity/db-owner-password)"; exec pg_restore -U drone_owner -d "$1" --exit-on-error'
            with dump.open('rb') as f:subprocess.run(DOCKER+['exec','-i',CONTAINER,'sh','-c',command,'sh',name],stdin=f,check=True)
            for version,sha in expected.items():psql(f"INSERT INTO drone.schema_migration(version,checksum) VALUES ('{version}','{sha}');",name)
            seed=(ROOT/'db/checks/001_acceptance.sql').read_text().rsplit('ROLLBACK;',1)[0]
            # Keep the known acceptance fixture only in this newly-created disposable DB.
            seeded=run(name,seed+'\nCOMMIT;')
            assert seeded.returncode==0,seeded.stderr
            probes={
                'draft_grid_edit':"UPDATE drone.mission_revision SET grid_version='edited-grid' WHERE revision=2;",
                'null_mission_with_plan':"INSERT INTO drone.video_frame SELECT '00000000-0000-0000-0000-000000000041',NULL,drone_id,stream_id,stream_epoch,10,identity_scope,capture_at,gateway_received_at,received_at,capture_time_verified,time_evidence,width,height,format,source_quality_status,metadata_state,coordinate_config_id,pose,pose_status,pose_reason,footprint_geom,visible_geom,coverage,obs_group,'00000000-0000-0000-0000-000000000031',analysis_mode,analysis_state,skip_reason,model_config_id,pipeline_version,analysis_times,pre_ms,infer_ms,post_ms,task_quality_status FROM drone.video_frame WHERE frame_id='00000000-0000-0000-0000-000000000040'; SET CONSTRAINTS ALL IMMEDIATE;",
                'null_mission_alert':"INSERT INTO drone.alert(alert_id,mission_id,source_event_id,dedup_key,type,priority,raised_at,evidence_refs) VALUES ('00000000-0000-0000-0000-000000000110',NULL,'00000000-0000-0000-0000-000000000060','review-null-mission','SAMPLE',1,now(),'[]'); SET CONSTRAINTS ALL IMMEDIATE;",
                'invalid_observation_geo':"INSERT INTO drone.detection_observation SELECT '00000000-0000-0000-0000-000000000071',candidate_id,frame_id,analysis_mode,1,track_id,bbox,confidence,class_name,observation_kind,model_config_id,coordinate_config_id,association_evidence,'{\"status\":\"VALID\",\"lon\":999,\"lat\":999}',historical,supersedes_id FROM drone.detection_observation WHERE observation_id='00000000-0000-0000-0000-000000000070'; SET CONSTRAINTS ALL IMMEDIATE;",
                'stored_asset_overwrite':"UPDATE drone.media_asset SET state='STORED',content_hash=repeat('a',64),meta='{\"schema_version\":\"1\"}' WHERE asset_id='00000000-0000-0000-0000-000000000090'; UPDATE drone.media_asset SET content_hash=repeat('b',64),storage_uri='models/replaced.onnx' WHERE asset_id='00000000-0000-0000-0000-000000000090';",
            }
            for label,sql in probes.items():
                r=run(name,'BEGIN; SET LOCAL statement_timeout=\'5s\'; '+sql+' ROLLBACK;')
                result['findings'][label]={'accepted':r.returncode==0,'stderr':r.stderr,'output':r.stdout}
            # Establish that both publication functions are callable with runtime permissions.
            r=run(name,"BEGIN; SET LOCAL ROLE drone_api; SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000060'); ROLLBACK;")
            assert r.returncode==0,r.stderr
            # Session A locks event A and the global advisory lock, then waits.
            # Session B takes event B's row lock, then waits for the global lock.
            # Session A then requests B: inverse lock ordering causes a deadlock.
            a="BEGIN; SET LOCAL ROLE drone_api; SET LOCAL statement_timeout='8s'; SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000060'); SELECT pg_sleep(2); SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000080'); ROLLBACK;"
            b="BEGIN; SET LOCAL ROLE drone_api; SET LOCAL statement_timeout='8s'; SELECT drone.mark_event_published('00000000-0000-0000-0000-000000000080'); ROLLBACK;"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                fa=pool.submit(run,name,a); time.sleep(0.5); fb=pool.submit(run,name,b)
                ra,rb=fa.result(),fb.result()
            result['findings']['publisher_deadlock']={'a_returncode':ra.returncode,'a_stderr':ra.stderr,'b_returncode':rb.returncode,'b_stderr':rb.stderr,'reproduced':'40P01' in ra.stderr+rb.stderr}
            # A short unrelated write is blocked by a transaction touching only user_session.
            a="BEGIN; UPDATE drone.user_session SET revoked_at=now() WHERE session_id='00000000-0000-0000-0000-000000000003'; SELECT pg_sleep(2); ROLLBACK;"
            b="BEGIN; SET LOCAL lock_timeout='400ms'; INSERT INTO drone.drone(drone_id,name,gateway_state,link_state) VALUES ('unrelated-drone','unrelated','{}','{}'); ROLLBACK;"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                fa=pool.submit(run,name,a);time.sleep(0.5);fb=pool.submit(run,name,b)
                ra,rb=fa.result(),fb.result()
            result['findings']['global_write_serialization']={'blocked':'55P03' in rb.stderr,'stderr':rb.stderr}
            stage=temp/'stage'; (stage/'db/migrations').mkdir(parents=True)
            for f in (ROOT/'db/migrations').glob('*.sql'):(stage/'db/migrations'/f.name).write_bytes(f.read_bytes())
            (stage/'db/migrations/004_review_noop.sql').write_text('SELECT 1;\n')
            original=migration.ROOT;migration.ROOT=stage
            try:
                migration.apply(name)
                result['findings']['forward_migration']={'accepted':True}
            except RuntimeError as exc:result['findings']['forward_migration']={'accepted':False,'error':str(exc)}
            finally:migration.ROOT=original
        finally:
            assert name.startswith('drone_review_') and name != 'drone_dev'
            psql('DROP DATABASE '+name+';','postgres')
            result['temporary_database_removed']=True
    target=ROOT/'evidence/database/review-20261005.json'
    target.write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
