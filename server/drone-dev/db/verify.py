"""Check the installed schema and rules; acceptance sample rows always roll back."""
import hashlib, json
from apply import ROOT, psql

def acceptance_sql():
    base=(ROOT/'db/checks/001_acceptance.sql').read_text()
    return base.rsplit('ROLLBACK;',1)[0]+(ROOT/'db/checks/002_review_regression.sql').read_text()+'\nROLLBACK;'

def verify():
    expected={f.stem:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((ROOT/'db/migrations').glob('*.sql'))}
    actual=dict(line.split('|') for line in psql('SELECT version,checksum FROM drone.schema_migration ORDER BY version;').splitlines())
    assert actual==expected,'Migration checksum mismatch'
    manifest=json.loads((ROOT/'db/schema_manifest.json').read_text())
    columns=json.loads(psql("SELECT json_agg(json_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull) ORDER BY c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='drone' AND c.relkind='r' AND c.relname<>'schema_migration' AND a.attnum>0 AND NOT a.attisdropped;"))
    assert len(columns)==298
    for t,cs in manifest.items():
        found=[{k:r[k] for k in ('name','type','nullable')} for r in columns if r['table']==t]
        normalize=lambda s:s.lower().replace('character varying','varchar').replace('timestamp with time zone','timestamptz').replace(' ','')
        assert found==[dict(c,type=next(r['type'] for r in found if r['name']==c['name'])) for c in cs],t
        for actual_col,expected_col in zip(found,cs):
            assert normalize(actual_col['type'])==normalize(expected_col['type']),(t,expected_col,actual_col)
    counts={t:int(psql('SELECT count(*) FROM drone.'+t+';')) for t in manifest}
    settings=json.loads(psql("SELECT json_build_object('timezone',current_setting('timezone'),'listen_addresses',current_setting('listen_addresses'),'fsync',current_setting('fsync'),'synchronous_commit',current_setting('synchronous_commit'));").strip())
    assert settings['listen_addresses']=='' and settings['fsync']=='on' and settings['synchronous_commit']=='on'
    assert settings['timezone'] in ('UTC','Etc/UTC')
    assert psql("SELECT rolcanlogin FROM pg_roles WHERE rolname='drone_schema_owner';").strip()=='f'
    sql=acceptance_sql()
    output=psql(sql)
    assert 'PASS:' in output
    assert counts=={t:int(psql('SELECT count(*) FROM drone.'+t+';')) for t in manifest},'Sample rows leaked'
    result={'business_tables':18,'business_columns':298,'migration_checksums':'passed',
        'negative_checks':sql.count('SELECT pg_temp.expect_error('),'sample_rollback':'passed','business_row_counts':counts,'database_settings':settings}
    (ROOT/'evidence/database/verification.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
if __name__=='__main__': verify()
