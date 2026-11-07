<?php
declare(strict_types=1);
define('CLAMS_ROOT', dirname(__DIR__));
spl_autoload_register(static function (string $class): void {
    $prefix = 'Clams\\';
    if (str_starts_with($class, $prefix)) {
        $file = CLAMS_ROOT . '/app/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; }
    }
});
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', CLAMS_ROOT . '/storage/logs/php.log');
Clams\Support\Environment::load(CLAMS_ROOT . '/.env');
date_default_timezone_set(Clams\Support\Environment::get('APP_TIMEZONE', 'Asia/Manila'));
