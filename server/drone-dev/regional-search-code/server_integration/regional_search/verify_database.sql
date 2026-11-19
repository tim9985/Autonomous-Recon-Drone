BEGIN;
SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;
INSERT INTO drone.user_account(user_id,login_id,credential_hash,permissions,status)
 VALUES('11111111-1111-4111-8111-111111111111','isolated-regional-contract','NOT_A_REAL_LOGIN','[]','DISABLED');
INSERT INTO drone.drone(drone_id,name,gateway_state,link_state) VALUES('regional-contract-only','isolated','{}','{}');
INSERT INTO drone.mission(mission_id,drone_id,creator_user_id,draft_revision,state,state_evidence,readiness,test_conditions,grant_status)
 VALUES('22222222-2222-4222-8222-222222222222','regional-contract-only','11111111-1111-4111-8111-111111111111',1,'DRAFT','{}','{}','{"environment":"SIM"}','DENIED');
INSERT INTO drone.mission_revision(mission_id,revision,priority_sources,conditions,planner_modes,grid_version)
 VALUES('22222222-2222-4222-8222-222222222222',1,'[]','{}','{}','contract-grid');
INSERT INTO drone.search_region(region_id,mission_id,mission_revision,grid_version,region_type,source_features,region_geom,representative_point,total_area_m2,remaining_area_m2,state)
 VALUES('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222',1,'contract-grid','SIM_MANUAL','{}',ST_Multi(ST_GeomFromText('POLYGON((128 36,128.001 36,128.001 36.001,128 36.001,128 36))',4326)),ST_SetSRID(ST_Point(128.0005,36.0005),4326),100,100,'DRAFT');
DO $$
DECLARE p jsonb; r jsonb; finish jsonb; first_plan text; conflict boolean;
BEGIN
 p=jsonb_build_object('job_id','44444444-4444-4444-8444-444444444444','mission_id','22222222-2222-4222-8222-222222222222','mission_revision',1,'region_id','33333333-3333-4333-8333-333333333333','creator_user_id','11111111-1111-4111-8111-111111111111','request_hash',repeat('a',64),'package_id',repeat('b',64),'request',jsonb_build_object('regionId','contract-zone'));
 r=drone.regional_search_write('create',p);
 IF r->>'state'<>'QUEUED' THEN RAISE EXCEPTION 'queue failure'; END IF;
 r=drone.regional_search_write('create',p);
 IF (SELECT count(*) FROM drone.regional_search_job)<>1 THEN RAISE EXCEPTION 'duplicate job'; END IF;
 conflict=false;
 BEGIN PERFORM drone.regional_search_write('create',p||jsonb_build_object('request_hash',repeat('c',64)));
 EXCEPTION WHEN raise_exception THEN conflict=SQLERRM='ID_CONFLICT'; END;
 IF NOT conflict THEN RAISE EXCEPTION 'hash conflict not rejected'; END IF;
 finish=jsonb_build_object('job_id',p->>'job_id','request_hash',p->>'request_hash','result_hash',repeat('d',64),'plan_id','55555555-5555-4555-8555-555555555555','result',jsonb_build_object('state','READY','packageId',repeat('b',64),'regionId','contract-zone','predictedOnly',true,'actualEvidenceWrites',0,'realExecutable',false));
 conflict=false;
 BEGIN PERFORM drone.regional_search_write('finish',finish||jsonb_build_object('result',(finish->'result')-'predictedOnly'));
 EXCEPTION WHEN raise_exception THEN conflict=SQLERRM='INVALID_RESULT'; END;
 IF NOT conflict THEN RAISE EXCEPTION 'missing result gate not rejected'; END IF;
 r=drone.regional_search_write('finish',finish);first_plan=r->>'plan_id';
 IF r->>'state'<>'READY' OR first_plan IS NULL THEN RAISE EXCEPTION 'plan not registered'; END IF;
 r=drone.regional_search_write('finish',finish);
 IF r->>'plan_id'<>first_plan OR (SELECT count(*) FROM drone.search_plan)<>1 THEN RAISE EXCEPTION 'duplicate plan'; END IF;
 p=p||jsonb_build_object('job_id','66666666-6666-4666-8666-666666666666');
 PERFORM drone.regional_search_write('create',p);
 INSERT INTO drone.mission_revision(mission_id,revision,priority_sources,conditions,planner_modes,grid_version)
 VALUES('22222222-2222-4222-8222-222222222222',2,'[]','{}','{}','contract-grid');
 UPDATE drone.mission SET draft_revision=2 WHERE mission_id='22222222-2222-4222-8222-222222222222';
 r=drone.regional_search_write('finish',finish||jsonb_build_object('job_id',p->>'job_id','plan_id','77777777-7777-4777-8777-777777777777'));
 IF r->>'state'<>'INVALIDATED' OR r->>'plan_id' IS NOT NULL THEN RAISE EXCEPTION 'stale revision accepted'; END IF;
 IF (SELECT count(*) FROM drone.observation_cell)<>0 OR (SELECT count(*) FROM drone.flight_command)<>0 THEN RAISE EXCEPTION 'forecast caused operational evidence'; END IF;
END $$;
SELECT 'queue, idempotency, hash-conflict, null-gate, plan-registration, stale-revision, zero-observation, zero-command: PASS';
ROLLBACK;
