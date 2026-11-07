<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
try {
    require dirname(__DIR__) . '/config/bootstrap.php';
    if (Clams\Support\Environment::get('APP_ENV') !== 'development') {
        throw new RuntimeException('Diagnostic requires APP_ENV=development.');
    }
    if (PHP_OS_FAMILY !== 'Windows') { throw new RuntimeException('PHP must run on the Windows host.'); }
    $pdo = Clams\Support\Database::connection();
    $row = $pdo->query('SELECT CURRENT_USER() AS account, DATABASE() AS db, @@version AS version, @@version_compile_os AS os, @@hostname AS hostname, 1 AS query_ok')->fetch();
    if ($row['db'] !== Clams\Support\Environment::get('DB_NAME', 'labassets')
        || !str_contains(strtolower($row['os']), 'linux')
        || str_contains(strtolower($row['version']), 'mariadb')
        || version_compare($row['version'], '8.0.16', '<')) {
        throw new RuntimeException('Expected Linux MySQL 8.0.16+ and configured database.');
    }
    $versions=$pdo->query('SELECT version FROM schema_versions')->fetchAll(PDO::FETCH_COLUMN);
    sort($versions);
    if ($versions!==['labassets-001','labassets-002','labassets-003']) { throw new RuntimeException('Expected labassets migration ledger.'); }
    if ($row['hostname']!=='xyrillenunez-VirtualBox' || $row['account']!=='labassets_app@192.168.56.1') { throw new RuntimeException('Unexpected server or runtime account.'); }
    $contract=json_decode(file_get_contents(CLAMS_ROOT.'/database/original-contract.json'),true,512,JSON_THROW_ON_ERROR);
    $q=$pdo->prepare('SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?');
    foreach ($contract as $table=>$columns) { $q->execute([$table]); if (array_diff($columns,$q->fetchAll(PDO::FETCH_COLUMN))) { throw new RuntimeException('Original core mismatch.'); } }
    $roles=(int)$pdo->query('SELECT COUNT(*) FROM roles WHERE is_active=1')->fetchColumn();
    $grants=(int)$pdo->query('SELECT COUNT(*) FROM role_permissions')->fetchColumn();
    if ($roles!==6 || $grants<1) { throw new RuntimeException('Reference data missing.'); }
    echo "PASS: Windows PHP; remote Linux MySQL; authentication; selected database; SQL query; labassets-003; seven original table contracts; six roles and permission references.\n";
    echo "MANUAL: Hostname matches supplied configuration. Verify this server is the intended Ubuntu VirtualBox VM using its console and networking.\n";
} catch (Throwable $e) {
    error_log('CLAMS diagnostic failed: ' . get_class($e) . ' code=' . $e->getCode());
    fwrite(STDERR, "FAIL: Check environment configuration, VM, MySQL service, schema, and firewall. No credentials displayed.\n");
    exit(1);
}
