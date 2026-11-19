"""Run additive migrations and end-to-end persistence only in an isolated database."""
import importlib.util
from pathlib import Path
import shutil
ROOT=Path('/home/se/sandboxes/drone-dev')
STAGE=ROOT/'regional-execution-stage'
DATABASE='regional_verify_execution_20261022'

def main():
    d=STAGE/'db';(d/'migrations').mkdir(parents=True,exist_ok=True)
    for p in (ROOT/'db/migrations').glob('*.sql'):shutil.copy2(p,d/'migrations'/p.name)
    shutil.copy2(STAGE/'server_integration/migrations/013_regional_execution.sql',d/'migrations/013_regional_execution.sql')
    shutil.copy2(ROOT/'db/apply.py',d/'apply.py')
    spec=importlib.util.spec_from_file_location('verify_db',d/'apply.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    if not mod.psql(f"SELECT datname FROM pg_database WHERE datname='{DATABASE}'",'postgres').strip():
        mod.psql(f'CREATE DATABASE {DATABASE}','postgres');mod.psql('CREATE EXTENSION postgis;',DATABASE)
        mod.psql(f'GRANT CREATE ON DATABASE {DATABASE} TO drone_schema_owner;',DATABASE)
    mod.apply(DATABASE)
    folder=STAGE/'server_integration/regional_search'
    sql=(folder/'verify_database.sql').read_text().replace('ROLLBACK;','')+(folder/'verify_execution.sql').read_text()+'\nROLLBACK;'
    result=mod.psql(sql,DATABASE);(STAGE/'database-check.txt').write_text(result);print(result)
if __name__=='__main__':main()
