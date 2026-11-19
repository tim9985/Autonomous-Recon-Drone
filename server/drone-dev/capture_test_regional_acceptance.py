"""Read-only school DEV acceptance snapshot; never emits credentials or commands."""
from pathlib import Path
import importlib.util
import hashlib
import json
import time

root=Path('/home/se/sandboxes/drone-dev')
spec=importlib.util.spec_from_file_location('db',root/'db/apply.py')
db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)

def query(sql):
    return json.loads(db.psql(sql))

jobs=query("""SELECT coalesce(json_agg(to_jsonb(j)),'[]'::json)
 FROM drone.regional_search_job j WHERE j.job_id IN
 (SELECT job_id FROM drone.regional_execution WHERE created_at>now()-interval '1 day');""")
runs=query("""SELECT coalesce(json_agg(to_jsonb(e)||jsonb_build_object('loginId',u.login_id)),'[]'::json)
 FROM drone.regional_execution e JOIN drone.user_account u ON u.user_id=e.creator_user_id
 WHERE e.created_at>now()-interval '1 day';""")
evidence={}
for run in runs:
    eid=run['execution_id']
    folder=root/'data/backend/regional-search/executions'/eid
    record={}
    for name in ('observation.json','observer-error.json','observer.log'):
        file=folder/name
        if file.exists():record[name]=file.read_text()
    record['completions']=query("SELECT coalesce(json_agg(to_jsonb(c)),'[]'::json) FROM drone.regional_completion c WHERE execution_id='"+eid+"';")
    evidence[eid]=record
files={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in
       ('web/index.html','web/test-patrol.html','web/test-regional.js','school/regional_contract.py','compose.regional-search.yml')}
transport=query("""SELECT coalesce(json_agg(t),'[]'::json) FROM
 (SELECT route,count(*) AS requests,count(*) FILTER(WHERE status>=400) AS errors,
 max(duration_ms) AS maximum_server_ms,percentile_cont(.95) WITHIN GROUP(ORDER BY duration_ms) AS p95_server_ms
 FROM observability.communication_log WHERE source='SERVER' AND route LIKE '%regional%'
 AND event_at>=(SELECT max(created_at) FROM drone.regional_execution)
 GROUP BY route ORDER BY route) t;""")
snapshot=dict(capturedAt=time.time(),jobs=jobs,runs=runs,evidence=evidence,files=files,
              transport=transport,registry=json.loads((root/'data/backend/regional-search/packages.json').read_text()))
destination=root/'test-regional-acceptance.json';destination.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2))
print(json.dumps([dict(id=r['execution_id'],state=r['state'],login=r['loginId'],percent=r['actual'].get('percent'),
                      first95=r['actual'].get('first95Seconds'),frames=r['last_sequence'],applied=r['applied_sequence']) for r in runs]))
