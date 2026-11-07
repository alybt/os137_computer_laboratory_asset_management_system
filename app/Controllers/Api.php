<?php
declare(strict_types=1);
namespace Clams\Controllers;
use Clams\Services\Auth;
use Clams\Support\Database;
use Clams\Support\Session;
final class Api
{
    public static function send(mixed $data, int $status=200): never {
        http_response_code($status); header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_THROW_ON_ERROR); exit;
    }
    public static function run(string $path): never {
        Session::start();
        $method=$_SERVER['REQUEST_METHOD'];
        if ($path==='/api/auth/csrf' && $method==='GET') { self::send(['csrf'=>$_SESSION['csrf']]); }
        if (!in_array($method,['GET','HEAD'],true) && !Session::csrfValid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) { self::send(['detail'=>'Session expired. Reload and try again.'],419); }
        $data=[];
        if (in_array($method,['POST','PATCH'],true)) {
            try { $data=json_decode(file_get_contents('php://input'),true,32,JSON_THROW_ON_ERROR); }
            catch (\JsonException) { self::send(['detail'=>'Invalid JSON.'],422); }
            if (!is_array($data) || array_is_list($data) && $data!==[]) { self::send(['detail'=>'JSON object required.'],422); }
        }
        if ($path==='/api/auth/login' && $method==='POST') {
            if (!is_string($data['email'] ?? null) || !is_string($data['password'] ?? null) || !Auth::login($data['email'],$data['password'])) { self::send(['detail'=>'Sign-in unsuccessful. Check credentials or try later.'],401); }
            self::send(['user'=>self::user(), 'csrf'=>$_SESSION['csrf']]);
        }
        $user=self::user();
        if (!$user) { self::send(['detail'=>'Sign in required.'],401); }
        if ($path==='/api/auth/me' && $method==='GET') { self::send($user); }
        if ($path==='/api/auth/logout' && $method==='POST') { Auth::logout(); self::send(['message'=>'Signed out.']); }
        try {
            $db=Database::connection(); $ops=new \Clams\Services\Operations($db,$user);
            if ($path==='/api/auth/me' && $method==='PATCH') { $ops->profile($data); self::send(self::user()); }
            if ($path==='/api/auth/change-password' && $method==='POST') { $result=$ops->password($data); $_SESSION['authenticated_at']=time()+1; self::send($result); }
            // Operational global views remain restricted until per-laboratory/owner scope is complete.
            if (!in_array($user['role'],['super_admin','property_admin'],true)) { self::send(['detail'=>'Global operations require a property administrator; scoped views are pending.'],403); }
            if ($path==='/api/dashboard/analytics' && $method==='GET') {
                self::permit($user,'assets.read');
                $months=filter_var($_GET['months'] ?? 6,FILTER_VALIDATE_INT);
                if(!in_array($months,[6,12],true)){throw new \Clams\Support\HttpError('Choose a 6 or 12 month range.');}
                self::send(\Clams\Services\DashboardAnalytics::read($db,$months,Auth::allowed((int)$user['id'],'borrowing.manage'),Auth::allowed((int)$user['id'],'maintenance.manage')));
            }
            if ($path==='/api/dashboard' && $method==='GET') { self::send(\Clams\Services\Inventory::dashboard($db)); }
            if ($path==='/api/reports/summary' && $method==='GET') { self::permit($user,'reports.read'); self::send($ops->summary()); }
            if (preg_match('~^/api/reports/(assets|assignments|maintenance)\.csv$~D',$path,$match) && $method==='GET') {
                self::permit($user,'reports.read'); $rows=$ops->export($match[1]); header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="'.$match[1].'.csv"'); $stream=fopen('php://output','w');foreach($rows as $row){fputcsv($stream,$row,',','"','');}fclose($stream);exit;
            }
            if ($path==='/api/activity' && $method==='GET') { self::permit($user,'logs.read'); self::send($ops->activity($_GET)); }
            if (!preg_match('~^/api/(assets|assignments|maintenance|categories|laboratories|users)(?:/([1-9][0-9]*))?(?:/(return))?$~D',$path,$match)) { self::send(['detail'=>'Endpoint not found.'],404); }
            $area=$match[1];$id=isset($match[2]) && $match[2]!==''?(int)$match[2]:null;$return=($match[3] ?? '')==='return';
            if($return && ($area!=='assignments' || !$id || $method!=='POST')){self::send(['detail'=>'Method not allowed.'],405);}
            $permission=match($area){'assets'=>$method==='GET'?'assets.read':'assets.write','assignments'=>'borrowing.manage','maintenance'=>'maintenance.manage','categories'=>'assets.write','laboratories'=>'laboratories.manage','users'=>'users.manage'};
            self::permit($user,$permission);
            if($method==='GET') {
                $filters=$_GET;if($id){$filters['id']=$id;}
                $result=match($area){'assets'=>\Clams\Services\Inventory::assets($db,$filters),'assignments'=>$ops->listHistory('assignments',$filters),'maintenance'=>$ops->listHistory('maintenance_records',$filters),'categories','laboratories'=>$ops->reference($area,$filters),'users'=>$ops->users($filters)};
                if($id){$rows=$result['items'] ?? $result;self::send($rows[0] ?? ['detail'=>'Record not found.'],$rows?200:404);}self::send($result);
            }
            if($method==='DELETE' && $id){
                $result=match($area){'assets'=>$ops->archiveAsset($id),'assignments'=>$ops->archiveHistory('assignments',$id),'maintenance'=>$ops->archiveHistory('maintenance_records',$id),'categories','laboratories'=>$ops->writeReference($area,[],$id,true),'users'=>$ops->writeUser([],$id,true)};
                self::send(isset($result['message'])?$result:['message'=>'Account/reference deactivated; history retained.']);
            }
            if(($method==='POST' && (!$id || $return)) || ($method==='PATCH' && $id)) {
                $result=match($area){'assets'=>$ops->writeAsset($data,$id),'assignments'=>$ops->writeAssignment($data,$id,$return),'maintenance'=>$ops->writeMaintenance($data,$id),'categories','laboratories'=>$ops->writeReference($area,$data,$id),'users'=>$ops->writeUser($data,$id)};
                self::send($result,$method==='POST' && !$id?201:200);
            }
            self::send(['detail'=>'Method not allowed.'],405);
        } catch(\Clams\Support\HttpError $e) { self::send(['detail'=>$e->getMessage()],$e->status); }
        catch(\PDOException $e) { if((string)$e->getCode()==='23000'){self::send(['detail'=>'Duplicate value or related record conflict.'],409);}throw $e; }
    }
    private static function permit(array $user,string $permission): void {
        if(!Auth::allowed((int)$user['id'],$permission)){throw new \Clams\Support\HttpError('Permission denied.',403);}
    }
    private static function user(): ?array {
        $u=Auth::user(); if (!$u) { return null; }
        unset($u['password_changed_at']); $u['is_active']=(bool)$u['is_active']; return $u;
    }
}
