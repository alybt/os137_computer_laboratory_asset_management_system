<?php
declare(strict_types=1);
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Services\Inventory;
// Disposable in-memory query test, not an application database or VM substitute.
// MySQL DDL/import/locking semantics must still be tested on Ubuntu.
$db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('CREATE TABLE users(id INTEGER PRIMARY KEY,full_name TEXT,is_active INTEGER);
CREATE TABLE categories(id INTEGER PRIMARY KEY,name TEXT,color TEXT,is_active INTEGER);
CREATE TABLE laboratories(id INTEGER PRIMARY KEY,name TEXT,is_active INTEGER);
CREATE TABLE assets(id INTEGER PRIMARY KEY,asset_tag TEXT,name TEXT,property_number TEXT,serial_number TEXT,category_id INTEGER,laboratory_id INTEGER,status TEXT,condition TEXT,purchase_date TEXT,purchase_cost REAL,warranty_expiry TEXT,archived_at TEXT,created_at TEXT);
CREATE TABLE assignments(id INTEGER PRIMARY KEY,asset_id INTEGER,assigned_by INTEGER,returned_at TEXT,due_date TEXT);
CREATE TABLE maintenance_records(id INTEGER PRIMARY KEY,asset_id INTEGER,status TEXT,scheduled_date TEXT);
CREATE TABLE activity_logs(id INTEGER PRIMARY KEY,created_at TEXT);
INSERT INTO users VALUES(1,"Original Name",1);
INSERT INTO categories VALUES(1,"Monitors","#123456",1);
INSERT INTO laboratories VALUES(1,"Original Lab",1);
INSERT INTO assets VALUES(1,"ORIGINAL-TAG","Original Monitor",NULL,"SER-1",1,1,"assigned","good",NULL,NULL,NULL,NULL,"2026-01-01");
INSERT INTO assets VALUES(2,"ARCHIVED-TAG","Archived Monitor",NULL,"SER-2",1,1,"available","good",NULL,50,NULL,"2026-01-02","2026-01-01");
INSERT INTO assignments VALUES(1,1,1,NULL,"2000-01-01");
INSERT INTO maintenance_records VALUES(1,1,"scheduled",NULL);');
$db->exec('ALTER TABLE assets ADD custodian_id INTEGER NULL');
$checks=[];
$result=Inventory::assets($db);
$checks['Archived records excluded']=$result['total']===1;
$item=$result['items'][0];
$checks['Original asset tag retained']=$item['asset_tag']==='ORIGINAL-TAG';
$checks['Unknown property number stays NULL']=$item['property_number']===null;
$checks['Unknown acquisition data stays NULL']=$item['purchase_cost']===null && $item['purchase_date']===null;
$checks['Original category and lab joins']=$item['category_name']==='Monitors' && $item['laboratory_name']==='Original Lab';
$checks['Original assignment overdue and actor']=$item['active_assignment']['status']==='overdue' && $item['active_assignment']['assigned_by_name']==='Original Name';
$checks['Original maintenance count']=$item['open_maintenance_count']===1;
$checks['Prepared search rejects injection']=Inventory::assets($db,['q'=>"' OR 1=1 --"])['total']===0;
$checks['Sort whitelist rejects injected SQL']=Inventory::assets($db,['sort_by'=>'id;DROP TABLE assets'])['total']===1;
$checks['Pagination preserves total']=Inventory::assets($db,['page'=>2,'page_size'=>1])['items']===[];
$dashboard=Inventory::dashboard($db);
$checks['Dashboard reads original assignments']=$dashboard['totals']['active_assignments']===1;
$checks['Dashboard reads original maintenance']=$dashboard['totals']['open_maintenance']===1;
$checks['Dashboard excludes archived value']=$dashboard['totals']['total_value']===0.0;
foreach($checks as $name=>$pass) { echo ($pass?'PASS: ':'FAIL: ').$name."\n"; }
exit(in_array(false,$checks,true)?1:0);
