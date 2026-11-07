<?php
declare(strict_types=1);
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Services\DashboardAnalytics;
// Disposable fixtures; MySQL aggregation syntax is separately checked by the CLI diagnostic.
$db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('CREATE TABLE assets(id INTEGER PRIMARY KEY,asset_tag TEXT,name TEXT);
CREATE TABLE assignments(id INTEGER PRIMARY KEY,asset_id INTEGER,borrower_name TEXT,assigned_at TEXT,returned_at TEXT,due_date TEXT,archived_at TEXT);
CREATE TABLE maintenance_records(id INTEGER PRIMARY KEY,created_at TEXT,completed_date TEXT);
INSERT INTO assets VALUES(1,"TAG-1","Monitor");
INSERT INTO assignments VALUES(1,1,"Test","2026-05-31 16:00:00","2026-07-10 00:00:00","2026-06-01",NULL);
INSERT INTO assignments VALUES(2,1,"Archived","2026-05-31 15:59:59","2026-06-15 00:00:00","2026-06-01","2026-08-01");
INSERT INTO assignments VALUES(3,1,"Upcoming","2026-11-07 00:00:00",NULL,"2026-11-09",NULL);
INSERT INTO assignments VALUES(4,1,"Later","2026-12-01 00:00:00",NULL,"2026-12-09",NULL);
INSERT INTO maintenance_records VALUES(1,"2026-06-01 00:00:00","2026-07-01");
INSERT INTO maintenance_records VALUES(2,"2026-11-08 00:00:00","2026-11-08");');
$now=new DateTimeImmutable('2026-11-07 12:00:00',new DateTimeZone('Asia/Manila'));
$a=DashboardAnalytics::read($db,6,true,true,$now);
$checks=[
    'Six-month range with current month partial'=>count($a['range']['keys'])===6 && $a['range']['keys'][0]==='2026-06' && $a['range']['current_month_partial'],
    'Manila month boundary counts UTC event at local midnight'=>$a['assignments']['assigned'][0]===1,
    'Return dates count in their actual month'=>$a['assignments']['returned'][0]===1 && $a['assignments']['returned'][1]===1,
    'Archived historical returns remain in aggregates'=>array_sum($a['assignments']['returned'])===2,
    'Future events excluded from current activity totals'=>array_sum($a['assignments']['assigned'])===2 && array_sum($a['maintenance']['recorded'])===1,
    'Completed maintenance grouped by recorded DATE'=>$a['maintenance']['completed'][1]===1 && array_sum($a['maintenance']['completed'])===1,
    'Months without recorded events are actual zeros'=>$a['assignments']['assigned'][2]===0 && $a['maintenance']['recorded'][2]===0,
    'Upcoming returns exclude returned and out-of-range records'=>count($a['upcoming_returns']['items'])===1 && $a['upcoming_returns']['items'][0]['id']===3,
];
$empty=new PDO('sqlite::memory:');
$restricted=DashboardAnalytics::read($empty,6,false,false,$now);
$checks['Denied sections do not query or expose workflow data']=!$restricted['assignments']['available'] && !isset($restricted['assignments']['assigned']) && !$restricted['maintenance']['available'] && !$restricted['upcoming_returns']['available'];
$year=DashboardAnalytics::read($db,12,true,true,$now);
$checks['Twelve-month option returns a complete ordered range']=count($year['range']['keys'])===12 && $year['range']['keys'][0]==='2025-12';
$rejected=false;try{DashboardAnalytics::read($db,100,true,true,$now);}catch(Clams\Support\HttpError){$rejected=true;}
$checks['Unsupported ranges rejected']=$rejected;
$blank=new PDO('sqlite::memory:');$blank->exec('CREATE TABLE assignments(id INTEGER,asset_id INTEGER,borrower_name TEXT,assigned_at TEXT,returned_at TEXT,due_date TEXT,archived_at TEXT); CREATE TABLE assets(id INTEGER,asset_tag TEXT,name TEXT);CREATE TABLE maintenance_records(created_at TEXT,completed_date TEXT);');
$zero=DashboardAnalytics::read($blank,6,true,true,$now);
$checks['No records means available zero activity, not unavailable']= $zero['assignments']['available'] && array_sum($zero['assignments']['assigned'])===0 && $zero['maintenance']['available'] && array_sum($zero['maintenance']['recorded'])===0;
foreach($checks as $message=>$pass){echo ($pass?'PASS: ':'FAIL: ').$message."\n";}
exit(in_array(false,$checks,true)?1:0);
