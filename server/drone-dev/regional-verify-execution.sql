-- Executed after the planning fixture, in a throwaway DB transaction only.
UPDATE drone.mission SET draft_revision=1 WHERE mission_id='22222222-2222-4222-8222-222222222222';
INSERT INTO drone.config_version(config_id,kind,version,schema_version,payload,content_hash,status)
 VALUES('88888888-8888-4888-8888-888888888888','SPATIAL','isolated','1','{}',repeat('e',64),'DRAFT');
UPDATE drone.mission_revision SET spatial_config_id='88888888-8888-4888-8888-888888888888' WHERE revision=1;
UPDATE drone.regional_search_job SET request=request||jsonb_build_object('adapterHash',repeat('a',64)),result=result||jsonb_build_object('worldVersion','w','targetAreaM2',100) WHERE state='READY';
DO $$
DECLARE h jsonb; p jsonb; r jsonb; cap jsonb; obs jsonb; error_seen boolean; n integer;
BEGIN
 h=jsonb_build_object('worker_id','contract-worker','session_id','99999999-9999-4999-8999-999999999999','package_id',repeat('b',64),'adapter_hash',repeat('a',64),'world_version','w','capabilities','[]'::jsonb,'ready',false,'diagnostics','{}'::jsonb);
 PERFORM drone.regional_execute_write('heartbeat',h);
 p=jsonb_build_object('execution_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','job_id','44444444-4444-4444-8444-444444444444','worker_id','contract-worker','worker_session',h->>'session_id','creator_user_id','11111111-1111-4111-8111-111111111111','request_hash',repeat('f',64));
 error_seen=false;
 BEGIN PERFORM drone.regional_execute_write('start',p); EXCEPTION WHEN raise_exception THEN error_seen=SQLERRM='SIM_EXECUTOR_NOT_READY'; END;
 IF NOT error_seen THEN RAISE EXCEPTION 'offline executor started'; END IF;
 PERFORM drone.regional_execute_write('heartbeat',h||'{"ready":true}');
 r=drone.regional_execute_write('start',p);
 IF r->>'state'<>'QUEUED' THEN RAISE EXCEPTION 'start failed'; END IF;
 PERFORM drone.regional_execute_write('start',p);
 IF (SELECT count(*) FROM drone.regional_execution)<>1 THEN RAISE EXCEPTION 'duplicate start'; END IF;
 error_seen=false;
 BEGIN PERFORM drone.regional_execute_write('claim',p||'{"worker_session":"88888888-8888-4888-8888-888888888888"}'); EXCEPTION WHEN raise_exception THEN error_seen=SQLERRM='OLD_WORKER_SESSION'; END;
 IF NOT error_seen THEN RAISE EXCEPTION 'old session accepted'; END IF;
 r=drone.regional_execute_write('claim',p);
 IF r->>'state'<>'RUNNING' THEN RAISE EXCEPTION 'claim failed'; END IF;
 cap='[]';
 FOR n IN 1..7 LOOP
  cap=cap||jsonb_build_array(jsonb_build_object('sequence',n,'content_hash',repeat(n::text,64),'packet',jsonb_build_object('observation',jsonb_build_object('frameId',n,'evidenceOrigin','CAPTURED_RGB'))));
 END LOOP;
 PERFORM drone.regional_execute_write('frames',p||jsonb_build_object('frames',cap));
 PERFORM drone.regional_execute_write('frames',p||jsonb_build_object('frames',cap));
 IF (SELECT count(*) FROM drone.regional_capture)<>7 THEN RAISE EXCEPTION 'duplicate evidence'; END IF;
 obs=p||jsonb_build_object('package_id',repeat('b',64),'result_hash',repeat('d',64),'sequence',7,'actual','{"state":"READY"}'::jsonb,'cells',jsonb_build_array(jsonb_build_object('index',0,'areaM2',25,'geometry','{"type":"Polygon","coordinates":[[[128,36],[128.00001,36],[128.00001,36.00001],[128,36.00001],[128,36]]]}'::jsonb,'evidence','{"firstFrameId":1,"lastFrameId":7,"distinctFrames":7,"durationSeconds":1.2,"startedAt":100,"endedAt":101.2,"evidenceOrigin":"CAPTURED_RGB"}'::jsonb)));
 r=drone.regional_execute_write('observe',obs);
 IF (r->'actual'->>'percent')::float8<>25 OR (SELECT count(*) FROM drone.observation_cell WHERE state='OBSERVED')<>1 THEN RAISE EXCEPTION 'actual ledger not connected'; END IF;
 PERFORM drone.regional_execute_write('observe',obs);
 IF (SELECT count(*) FROM drone.regional_completion)<>1 THEN RAISE EXCEPTION 'duplicate cell completion'; END IF;
 r=drone.regional_execute_write('stop',p);
 IF r->>'state'<>'STOP_REQUESTED' THEN RAISE EXCEPTION 'stop failed'; END IF;
 error_seen=false;
 BEGIN PERFORM drone.regional_execute_write('finish',p||'{"state":"COMPLETED","status":{"landedAndDisarmed":false}}'); EXCEPTION WHEN raise_exception THEN error_seen=SQLERRM='LANDING_UNCONFIRMED'; END;
 IF NOT error_seen THEN RAISE EXCEPTION 'false landing accepted'; END IF;
 r=drone.regional_execute_write('finish',p||'{"state":"CANCELLED","status":{"landedAndDisarmed":true}}');
 IF r->>'state'<>'CANCELLED' THEN RAISE EXCEPTION 'landing completion failed'; END IF;
END $$;
SELECT 'start gate, idempotency, claim/session, actual frames/cells, shared observation_cell, stop/landing: PASS';
