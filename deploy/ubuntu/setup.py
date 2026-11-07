#!/usr/bin/env python3
"""Local Ubuntu administrative installer. Uses sudo/auth_socket, never application credentials.
Checks existing core structure, backs up existing labassets, adds migrations and references.
Never touches clams_db and never imports demo.sql. No third-party Python packages needed.
"""
from pathlib import Path
import argparse, datetime, json, os, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
def mysql(sql, database=False):
    command=['sudo','mysql','--batch','--skip-column-names']
    if database: command+=['--database=labassets']
    result=subprocess.run(command,input=("SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';\n"+sql if database else sql),text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()
def apply():
    if sys.platform!='linux': raise RuntimeError('Run only inside the existing Ubuntu VM.')
    version=mysql('SELECT VERSION();')
    numbers=tuple(int(n) for n in version.split('-')[0].split('.')[:3])
    if 'mariadb' in version.lower() or numbers<(8,0,16): raise RuntimeError('Oracle MySQL 8.0.16+ required.')
    exists=mysql("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='labassets';")=='1'
    tables=set(mysql("SELECT table_name FROM information_schema.tables WHERE table_schema='labassets';").splitlines())
    contract=json.loads((ROOT/'database/original-contract.json').read_text())
    if tables:
        if 'schema_versions' not in tables and tables!=set(contract):
            raise RuntimeError('Unexpected extension tables without a known ledger. Review manually before migration.')
        if not set(contract)<=tables: raise RuntimeError('Not the complete groupmate base. Refusing to modify labassets.')
        for table, expected in contract.items():
            rows=mysql("SELECT column_name FROM information_schema.columns WHERE table_schema='labassets' AND table_name='"+table+"';").splitlines()
            if not set(expected)<=set(rows): raise RuntimeError('Core columns mismatch: '+table)
            bad=mysql("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='labassets' AND table_name='"+table+"' AND column_name='id' AND column_type<>'int';")
            if bad!='0': raise RuntimeError('Expected original signed INT identity for '+table)
        if 'schema_versions' not in tables and mysql("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='labassets' AND ((table_name='users' AND column_name='password_changed_at') OR (table_name='assets' AND column_name='archived_at'));")!='0':
            raise RuntimeError('Partial or foreign extension detected. Review before retrying.')
    if exists:
        backup=Path.home()/'labassets-backups'; backup.mkdir(mode=0o700,exist_ok=True)
        target=backup/('labassets-before-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.sql')
        # Open with restrictive permissions before writing any data.
        fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as out:
            subprocess.run(['sudo','mysqldump','--single-transaction','--no-tablespaces','--set-gtid-purged=OFF','labassets'],stdout=out,check=True)
        print('Administrative backup:',target)
    else:
        mysql('CREATE DATABASE labassets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    if not tables:
        mysql((ROOT/'database/schema.sql').read_text(),True)
        print('Imported seven-table base.')
    migrations=[('labassets-001','001_extensions.sql'),('labassets-002','002_history_archival.sql'),('labassets-003','003_sticker_fields.sql')]
    versions=set(mysql('SELECT version FROM schema_versions;',True).splitlines()) if 'schema_versions' in tables else set()
    valid=[set(version for version,_ in migrations[:i]) for i in range(1,len(migrations)+1)]
    if 'schema_versions' in tables and versions not in valid:
        raise RuntimeError('Unknown/partial schema version; stop and inspect.')
    for version, filename in migrations:
        if version not in versions:
            mysql((ROOT/'database/migrations'/filename).read_text(),True)
            print('Applied migration '+version)
    mysql((ROOT/'database/seed.sql').read_text(),True)
    print('Required references installed; no demo records imported. clams_db unchanged.')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true',help='Apply after reviewing SQL and stopping application writes')
    args=parser.parse_args()
    if not args.apply: parser.print_help(); sys.exit(0)
    try: apply()
    except (RuntimeError,subprocess.CalledProcessError) as error:
        print('STOP:',error,file=sys.stderr)
        print('DDL can partially commit. Do not force/retry partial imports. Inspect and recover from the backup into a separate staging database.',file=sys.stderr)
        sys.exit(1)
