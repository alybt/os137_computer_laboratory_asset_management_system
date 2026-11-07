<?php
declare(strict_types=1);
require dirname(__DIR__) . '/config/bootstrap.php';
use Clams\Support\Database;
use Clams\Support\Environment;

$count = 0;
function check(bool $condition, string $message): void {
    global $count;
    if (!$condition) { fwrite(STDERR, "FAIL: $message\n"); exit(1); }
    $count++;
    echo "PASS: $message\n";
}
// Restore process configuration; tests never connect to any database.
$keys = ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','CLAMS_TEST_LITERAL'];
$saved = [];
foreach ($keys as $key) { $saved[$key] = getenv($key); }
$temp = tempnam(sys_get_temp_dir(), 'clams');
try {
    putenv('DB_USER=test_user'); putenv('DB_PASSWORD=test_password');
    putenv('DB_PORT=3306'); putenv('DB_NAME=clams_test');
    foreach (['', 'localhost', '127.0.0.1', '127.10.1.1', '0.0.0.0', 'vm;dbname=other', '::1'] as $bad) {
        putenv('DB_HOST=' . $bad);
        $rejected = false;
        try { Database::configuration(); } catch (RuntimeException) { $rejected = true; }
        check($rejected, 'Reject unsafe or missing database host: ' . ($bad ?: '(empty)'));
    }
    putenv('DB_HOST=192.0.2.10');
    check(Database::configuration()['host'] === '192.0.2.10', 'Accept configured remote IPv4 without connecting');
    foreach (['0', '65536', '3306;host=127.0.0.1'] as $bad) {
        putenv('DB_PORT=' . $bad);
        $rejected = false;
        try { Database::configuration(); } catch (RuntimeException) { $rejected = true; }
        check($rejected, 'Reject invalid port');
    }
    putenv('DB_PORT=3306'); putenv('DB_NAME=clams;host=localhost');
    $rejected = false;
    try { Database::configuration(); } catch (RuntimeException) { $rejected = true; }
    check($rejected, 'Reject DSN injection in database name');
    putenv('CLAMS_TEST_LITERAL=process');
    file_put_contents($temp, "CLAMS_TEST_LITERAL=\"file\"\n");
    Environment::load($temp);
    check(Environment::get('CLAMS_TEST_LITERAL') === 'process', 'Process environment overrides .env');
    putenv('CLAMS_TEST_LITERAL');
    file_put_contents($temp, 'CLAMS_TEST_LITERAL="a#b=c$literal"' . "\n");
    Environment::load($temp);
    check(Environment::get('CLAMS_TEST_LITERAL') === 'a#b=c$literal', 'Quoted secrets are literal');
    file_put_contents($temp, 'not valid env syntax');
    $rejected = false;
    try { Environment::load($temp); } catch (RuntimeException) { $rejected = true; }
    check($rejected, 'Reject malformed environment file');
    foreach (['pdo_mysql', 'fileinfo', 'mbstring'] as $extension) {
        check(extension_loaded($extension), 'Required PHP extension: ' . $extension);
    }
} finally {
    if (is_file($temp)) { unlink($temp); }
    foreach ($saved as $key => $value) { $value === false ? putenv($key) : putenv($key . '=' . $value); }
}
echo "$count checks passed. VM/database integration is not covered by these checks.\n";
