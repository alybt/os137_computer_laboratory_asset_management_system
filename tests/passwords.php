<?php
declare(strict_types=1);
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Support\Passwords;
$fixture=json_decode(file_get_contents(__DIR__.'/password-fixture.json'),true,512,JSON_THROW_ON_ERROR);
$tests=[
    'Original Python PBKDF2 hash accepted'=>Passwords::verify($fixture['password'],$fixture['hash']),
    'Wrong legacy password rejected'=>!Passwords::verify('incorrect',$fixture['hash']),
    'Malformed legacy hash rejected'=>!Passwords::verify('x','pbkdf2_sha256$390000$bad$bad'),
    'Excessive iteration hash rejected'=>!Passwords::verify('x',str_replace('390000','999999999',$fixture['hash'])),
    'Native PHP hash accepted'=>Passwords::verify('new-password',password_hash('new-password',PASSWORD_DEFAULT)),
    'Wrong native password rejected'=>!Passwords::verify('wrong',password_hash('new-password',PASSWORD_DEFAULT))
];
foreach($tests as $name=>$pass) { echo ($pass?'PASS: ':'FAIL: ').$name."\n"; }
exit(in_array(false,$tests,true)?1:0);
