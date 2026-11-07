<?php
declare(strict_types=1);
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Support\Session;
use Clams\Services\Auth;
Session::start();
$checks=[];
$checks['anonymous requests have no user']=Auth::user()===null;
$checks['CSRF token generated']=strlen($_SESSION['csrf'])===64;
$checks['valid CSRF accepted']=Session::csrfValid($_SESSION['csrf']);
$checks['missing CSRF rejected']=!Session::csrfValid(null);
$checks['array CSRF rejected']=!Session::csrfValid(['invalid']);
$checks['incorrect CSRF rejected']=!Session::csrfValid('wrong');
$old=session_id(); $token=$_SESSION['csrf']; $_SESSION['user_id']=42;
Session::clear();
$checks['identity removed']=!isset($_SESSION['user_id']);
$checks['session ID rotated']=session_id()!==$old;
$checks['CSRF rotated']=$_SESSION['csrf']!==$token;
$checks['old CSRF rejected']=!Session::csrfValid($token);
$params=session_get_cookie_params();
$checks['HttpOnly cookie']=$params['httponly'];
$checks['SameSite cookie']=$params['samesite']==='Lax';
session_destroy();
foreach($checks as $name=>$pass) { echo ($pass?'PASS: ':'FAIL: ').$name."\n"; }
exit(in_array(false,$checks,true)?1:0);
