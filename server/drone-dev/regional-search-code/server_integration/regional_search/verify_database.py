"""Run only in a new isolated verification database, never in drone_dev/REAL."""
import importlib.util
import json
from pathlib import Path
import shutil

ROOT = Path('/home/se/sandboxes/drone-dev')
STAGE = ROOT/'regional-stage-20261022'
DATABASE = 'regional_verify_20261022'


def main():
    target = STAGE/'db'
    target.mkdir(exist_ok=True)
    (target/'migrations').mkdir(exist_ok=True)
    for p in (ROOT/'db/migrations').glob('*.sql'):
        shutil.copyfile(p, target/'migrations'/p.name)
    shutil.copyfile(STAGE/'server_integration/migrations/012_regional_search.sql', target/'migrations/012_regional_search.sql')
    shutil.copyfile(ROOT/'db/apply.py', target/'apply.py')
    spec = importlib.util.spec_from_file_location('verify_apply', target/'apply.py')
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    assert not mod.psql(f"SELECT datname FROM pg_database WHERE datname='{DATABASE}';", 'postgres').strip(), 'Refuse to reuse an existing database'
    mod.psql(f'CREATE DATABASE {DATABASE};', 'postgres')
    mod.psql('CREATE EXTENSION postgis;', DATABASE)
    mod.psql(f'GRANT CREATE ON DATABASE {DATABASE} TO drone_schema_owner;', DATABASE)
    mod.apply(DATABASE)
    sql = (Path(__file__).with_name('verify_database.sql')).read_text()
    result = mod.psql(sql, DATABASE)
    print(json.dumps({'database':DATABASE,'status':'PASS','assertions':result.strip()}))


if __name__ == '__main__':
    main()
