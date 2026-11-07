"""Generate MySQL base from the original ORM AST without executing original startup/seeding."""
from pathlib import Path
import ast, json
ROOT=Path(__file__).resolve().parent
source=ast.parse((ROOT.parent/'groupmate-original/backend/app/models.py').read_text())
tables=[]
for cls in source.body:
    if not isinstance(cls,ast.ClassDef): continue
    name=None; fields=[]; foreign=[]
    for n in cls.body:
        if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__tablename__' for t in n.targets): name=ast.literal_eval(n.value)
        if not (isinstance(n,ast.AnnAssign) and isinstance(n.target,ast.Name) and isinstance(n.value,ast.Call) and getattr(n.value.func,'id','')=='mapped_column'): continue
        col=n.target.id; call=n.value; kw={k.arg:k.value for k in call.keywords}
        nullable=ast.literal_eval(kw.get('nullable',ast.Constant(False)))
        primary=ast.literal_eval(kw.get('primary_key',ast.Constant(False)))
        typ=''; fk=None
        for arg in call.args:
            t=arg.id if isinstance(arg,ast.Name) else getattr(getattr(arg,'func',None),'id','')
            if t=='ForeignKey': fk=ast.literal_eval(arg.args[0]).split('.'); typ='INT'
            elif t=='String': typ=f'VARCHAR({ast.literal_eval(arg.args[0])})'
            else: typ={'Integer':'INT','Boolean':'BOOLEAN','Date':'DATE','DateTime':'DATETIME','Float':'DOUBLE','Text':'TEXT'}.get(t,typ)
        text=f'`{col}` {typ}'
        if primary: text+=' NOT NULL AUTO_INCREMENT PRIMARY KEY'
        else: text+=' NULL' if nullable else ' NOT NULL'
        if 'default' in kw and isinstance(kw['default'],ast.Constant):
            val=ast.literal_eval(kw['default']); text+=' DEFAULT '+(str(int(val)) if isinstance(val,bool) else "'"+str(val).replace("'","''")+"'")
        elif col in ['created_at','updated_at','assigned_at']: text+=' DEFAULT CURRENT_TIMESTAMP'
        if ast.literal_eval(kw.get('unique',ast.Constant(False))): text+=' UNIQUE'
        fields.append(text)
        if ast.literal_eval(kw.get('index',ast.Constant(False))) and not ast.literal_eval(kw.get('unique',ast.Constant(False))): fields.append(f'INDEX (`{col}`)')
        if fk: foreign.append(f'FOREIGN KEY (`{col}`) REFERENCES `{fk[0]}` (`{fk[1]}`) ON DELETE RESTRICT')
    if name: tables.append('CREATE TABLE `'+name+'` (\n  '+',\n  '.join(fields+foreign)+'\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;')
(ROOT/'schema.sql').write_text('-- labassets: seven original ORM tables; EMPTY database only. No demo records.\n-- Names, nullable fields, DOUBLE money and IDs retained. FK deletion is RESTRICT to preserve history.\nSET NAMES utf8mb4;\n'+ '\n\n'.join(tables)+'\n')
