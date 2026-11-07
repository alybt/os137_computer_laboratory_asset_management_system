<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Support\Database;

$apply=in_array('--apply',$argv,true);
$roles=[
    'property_admin'=>['Property Administrator Account','property.admin@university.edu'],
    'lab_admin'=>['Laboratory Administrator Account','lab.admin@university.edu'],
    'it_personnel'=>['IT Personnel Account','it.personnel@university.edu'],
    'faculty'=>['Faculty Account','faculty@university.edu'],
    'student'=>['Student Account','student@university.edu'],
];
$path=null; $handle=null; $locked=false; $db=null;
try {
    $db=Database::connection();
    $lock=$db->prepare('SELECT GET_LOCK(?,10)');$lock->execute(['labassets-role-accounts']);
    if((int)$lock->fetchColumn()!==1){throw new RuntimeException('Another role-account setup is running.');}$locked=true;
    $admin=$db->query("SELECT id,full_name FROM users WHERE role IN ('admin','super_admin') AND is_active=1 ORDER BY id LIMIT 1")->fetch();
    if(!$admin){throw new RuntimeException('An active administrator must already exist.');}
    $plan=[];
    foreach($roles as $role=>[$name,$email]) {
        $q=$db->prepare('SELECT code FROM roles WHERE code=? AND is_active=1');$q->execute([$role]);
        if(!$q->fetchColumn()){throw new RuntimeException('Required role reference missing: '.$role);}
        $q=$db->prepare('SELECT u.email,u.is_active FROM users u WHERE COALESCE((SELECT role_code FROM role_aliases WHERE legacy_code=u.role),u.role)=? ORDER BY u.id');$q->execute([$role]);$existing=$q->fetchAll();
        if($existing){foreach($existing as $user){echo 'EXISTING: '.$role.' / '.$user['email'].($user['is_active']?' (active)':' (inactive)')."; unchanged\n";}continue;}
        $q=$db->prepare('SELECT id FROM users WHERE email=?');$q->execute([$email]);
        if($q->fetchColumn()){throw new RuntimeException('Planned email already belongs to another role: '.$email);}
        $plan[$role]=[$name,$email];echo ($apply?'CREATING: ':'PLAN: ').$role.' / '.$email."\n";
    }
    if(!$apply){echo "Read-only plan. Pass --apply to create missing role accounts.\n";}
    elseif(!$plan){echo "All requested role accounts already exist; no accounts or passwords changed.\n";}
    else {
        $path=CLAMS_ROOT.'/storage/reports/role-accounts-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.txt';
        $handle=fopen($path,'x');if(!$handle){throw new RuntimeException('Cannot create private credential file.');}
        chmod($path,0600);
        $db->beginTransaction();
        $lines=["CLAMS role accounts - operator provisioned", "Login: http://127.0.0.1:8080/login", "Administrator account/password unchanged.", "Change these generated passwords through each account's Settings page.", ''];
        foreach($plan as $role=>[$name,$email]) {
            $password=bin2hex(random_bytes(12));
            $q=$db->prepare('INSERT INTO users(full_name,email,password_hash,role,is_active) VALUES (?,?,?,?,1)');
            $q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT),$role]);$id=(int)$db->lastInsertId();
            $q=$db->prepare('INSERT INTO activity_logs(user_id,user_name,action,entity_type,entity_id,detail,updated_values) VALUES (?,?,?,?,?,?,?)');
            $q->execute([$admin['id'],$admin['full_name'],'create','user',$id,'Role account provisioned by local CLI operator',json_encode(['email'=>$email,'role'=>$role,'is_active'=>true],JSON_THROW_ON_ERROR)]);
            $lines[]="Role: $role\nEmail: $email\nPassword: $password\n";
        }
        $contents=implode("\r\n",$lines)."\r\n";
        if(fwrite($handle,$contents)!==strlen($contents) || !fflush($handle)){throw new RuntimeException('Could not save credential file.');}
        fclose($handle);$handle=null;
        $db->commit();echo 'Created '.count($plan)." account(s).\nPrivate credentials: $path\n";$path=null;
    }
} catch(Throwable $e) {
    if($db && $db->inTransaction()){$db->rollBack();}
    if(is_resource($handle)){fclose($handle);}
    if($path!==null && is_file($path)){unlink($path);}
    fwrite(STDERR,'Role-account setup failed: '.get_class($e).' code='.$e->getCode().". Check configuration, references and uniqueness. No passwords displayed.\n");exit(1);
} finally {
    if($locked && $db){$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute(['labassets-role-accounts']);}
}
