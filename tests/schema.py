"""Static preservation checks; not a substitute for Ubuntu MySQL import tests."""
from pathlib import Path
import ast, json, re, runpy, sys
ROOT=Path(__file__).resolve().parents[1]
original=ast.parse((ROOT/'groupmate-original/backend/app/models.py').read_text())
contract={}
for cls in original.body:
    if not isinstance(cls,ast.ClassDef): continue
    table=None; columns=[]
    for n in cls.body:
        if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__tablename__' for t in n.targets): table=ast.literal_eval(n.value)
        if isinstance(n,ast.AnnAssign) and isinstance(n.value,ast.Call) and getattr(n.value.func,'id','')=='mapped_column': columns.append(n.target.id)
    if table: contract[table]=columns
assert json.loads((ROOT/'database/original-contract.json').read_text())==contract
base=(ROOT/'database/schema.sql').read_text()
found={name:re.findall(r'^  `([^`]+)`',body,re.M) for name,body in re.findall(r'CREATE TABLE `([^`]+)` \((.*?)\) ENGINE',base,re.S)}
assert found==contract,found
print('PASS: all seven original tables and 73 columns preserved in base schema')
runpy.run_path(str(ROOT/'database/generate.py'))
assert base==(ROOT/'database/schema.sql').read_text()
print('PASS: deterministic schema reconstruction from original models')
assert '`purchase_cost` DOUBLE NULL' in base and '`purchase_date` DATE NULL' in base
assert '`full_name` VARCHAR(120)' in base and '`role` VARCHAR(20)' in base
print('PASS: legacy names, monetary type and NULL semantics retained')
migration=(ROOT/'database/migrations/001_extensions.sql').read_text()
uncommented=re.sub(r'--[^\n]*','',migration)
assert not re.search(r'\b(DROP|TRUNCATE|DELETE|RENAME|MODIFY|CHANGE|UPDATE)\b',uncommented,re.I)
assert "'labassets-001'" in migration
print('PASS: migration only adds structure, never rewrites/deletes source rows')
seed=(ROOT/'database/seed.sql').read_text()
assert not re.search(r'INSERT\s+(?:IGNORE\s+)?INTO\s+(users|assets|assignments|maintenance_records|laboratories|categories)\b',seed,re.I)
assert len(re.findall('INSERT IGNORE INTO roles',seed))==6
assert 'INSERT IGNORE INTO role_aliases' in seed
print('PASS: required references contain six roles, no users/inventory/demo records')
demo=(ROOT/'database/demo.sql').read_text()
for table,count in [('users',4),('laboratories',6),('categories',8),('assets',40),('assignments',8),('maintenance_records',7)]:
    assert len(re.findall(r'INSERT INTO '+table+r' \(',demo))==count
print('PASS: optional demo matches original source dataset counts')
grants=(ROOT/'deploy/ubuntu/runtime-update-grants.sql').read_text()
assert 'clams_db' not in grants and "'labassets_app'@'192.168.56.1'" in grants
assert not re.search(r'GRANT UPDATE ON labassets.`(activity_logs|asset_history|schema_versions)`',grants)
assert not re.search(r'\b(DELETE|FILE|ALTER|DROP)\b',grants)
print('PASS: host-specific, table-specific UPDATE grants exclude history and ledger')
setup=(ROOT/'deploy/ubuntu/setup.py').read_text()
assert 'database/demo.sql' not in setup
assert 'mysqldump' in setup and 'os.O_EXCL' in setup
print('PASS: installer includes private backup and no demo import')
sys.path.insert(0,str(ROOT))
import importlib.util
spec=importlib.util.spec_from_file_location('ubuntu_setup',ROOT/'deploy/ubuntu/setup.py'); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
from unittest.mock import patch
calls=[]
def incompatible(sql,database=False):
    calls.append(sql)
    if sql=='SELECT VERSION();': return '8.0.42'
    if 'schema_name=' in sql:return '1'
    if 'SELECT table_name' in sql:return 'users\nassets'
    raise AssertionError('Unexpected command '+sql)
with patch.object(mod.sys,'platform','linux'),patch.object(mod,'mysql',incompatible):
    try: mod.apply(); raise AssertionError('Should reject partial/foreign base')
    except RuntimeError: pass
assert not any(re.search(r'\b(CREATE|ALTER|INSERT|DROP)\b',s) for s in calls)
print('PASS: incompatible existing database rejected before mutations')
