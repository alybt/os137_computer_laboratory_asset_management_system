<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/config/bootstrap.php';

use Clams\Support\Database;

$password = getenv('CLAMS_ADMIN_PASSWORD') ?: '';
putenv('CLAMS_ADMIN_PASSWORD');

$email = strtolower(trim($argv[1] ?? ''));
$uid = trim($argv[2] ?? '');

if (
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($email) > 160 ||
    $uid === '' ||
    strlen($uid) > 100 ||
    strlen($password) < 12 ||
    strlen($password) > 72
) {
    fwrite(STDERR, "Provide EMAIL, UNIVERSITY_ID, and a password of 12-72 bytes.\n");
    exit(1);
}

try {
    Clams\Services\Administrator::provision(Database::connection(), $email, $uid, $password);

    echo "Administrator provisioned.\n";
} catch (Throwable $e) {
    fwrite(
        STDERR,
        "Error type: " . get_class($e) .
        "; code: " . $e->getCode() . PHP_EOL
    );

if ($e instanceof PDOException) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    fwrite(
        STDERR,
        "SQLSTATE: " . ($e->errorInfo[0] ?? '') .
        "; driver code: " . ($e->errorInfo[1] ?? '') . PHP_EOL
    );
    } elseif ($e instanceof RuntimeException) {
        fwrite(STDERR, $e->getMessage() . PHP_EOL);
    }

    fwrite(STDERR, "Administrator provisioning failed.\n");
    exit(1);
}