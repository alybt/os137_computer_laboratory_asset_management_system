<?php
declare(strict_types=1);
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Services\Administrator;

// Disposable fixture: named-lock functions are simulated, not a MySQL concurrency test.
function fixture(array &$events, int $acquire=1, bool $role=true): PDO {
    $db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $db->sqliteCreateFunction('GET_LOCK',function($name,$timeout)use(&$events,$acquire){$events[]='acquire';return $acquire;},2);
    $db->sqliteCreateFunction('RELEASE_LOCK',function($name)use(&$events){$events[]='release';return 1;},1);
    $db->exec('CREATE TABLE roles(code TEXT,is_active INTEGER);
        CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT,university_id TEXT UNIQUE,full_name TEXT,email TEXT UNIQUE,password_hash TEXT,role TEXT);
        CREATE TABLE activity_logs(user_id INTEGER,user_name TEXT,action TEXT,entity_type TEXT,entity_id INTEGER,ip_address TEXT);');
    if($role){$db->exec("INSERT INTO roles VALUES ('super_admin',1)");}
    return $db;
}
function check(bool $pass,string $message):void{if(!$pass){throw new RuntimeException($message);}echo 'PASS: '.$message."\n";}
$events=[];$db=fixture($events);
$id=Administrator::provision($db,'admin@test.edu','ADMIN-001','fixture-password-123');
check($id===1 && (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()===1,'First administrator inserted');
check(password_verify('fixture-password-123',$db->query('SELECT password_hash FROM users')->fetchColumn()),'Administrator password hashed');
check((int)$db->query('SELECT COUNT(*) FROM activity_logs')->fetchColumn()===1,'Provisioning activity committed');
check($events===['acquire','release'] && !$db->inTransaction(),'Named lock released after commit');
$rejected=false;try{Administrator::provision($db,'second@test.edu','ADMIN-002','fixture-password-123');}catch(RuntimeException){$rejected=true;}
check($rejected && (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()===1,'Second administrator refused without changes');
check(end($events)==='release' && !$db->inTransaction(),'Named lock released after duplicate rejection');
$events=[];$db=fixture($events,1,false);$rejected=false;
try{Administrator::provision($db,'admin@test.edu','ADMIN-001','fixture-password-123');}catch(RuntimeException){$rejected=true;}
check($rejected && $events===['acquire','release'],'Missing reference role fails safely and releases lock');
$events=[];$db=fixture($events,0);$rejected=false;
try{Administrator::provision($db,'admin@test.edu','ADMIN-001','fixture-password-123');}catch(RuntimeException){$rejected=true;}
check($rejected && !$db->inTransaction() && (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()===0,'Lock timeout prevents provisioning');
$events=[];$db=fixture($events);$db->exec('DROP TABLE activity_logs');$rejected=false;
try{Administrator::provision($db,'admin@test.edu','ADMIN-001','fixture-password-123');}catch(PDOException){$rejected=true;}
check($rejected && (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()===0 && end($events)==='release','Audit failure rolls back account insertion and releases lock');
