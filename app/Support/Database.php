<?php
declare(strict_types=1);
namespace Clams\Support;

final class Database
{
    private static ?\PDO $connection = null;

    public static function configuration(): array
    {
        $host = Environment::get('DB_HOST');
        // Require a concrete remote IPv4 address: never accidentally use Windows MySQL.
        if (!filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
            || str_starts_with($host, '127.') || $host === '0.0.0.0') {
            throw new \RuntimeException('DB_HOST must be the Ubuntu VM IPv4 address.');
        }
        $port = filter_var(Environment::get('DB_PORT', '3306'), FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1, 'max_range' => 65535]]);
        $name = Environment::get('DB_NAME', 'labassets');
        $user = Environment::get('DB_USER');
        $password = Environment::get('DB_PASSWORD');
        if ($port === false || !preg_match('/^[a-zA-Z0-9_]+$/D', $name)
            || $user === '' || $password === '') {
            throw new \RuntimeException('Database configuration is incomplete.');
        }
        return compact('host', 'port', 'name', 'user', 'password');
    }

    public static function connection(): \PDO
    {
        if (self::$connection !== null) { return self::$connection; }
        $c = self::configuration();
        $options = [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
            \PDO::ATTR_TIMEOUT => max(1, min(30, (int) Environment::get('DB_TIMEOUT', '5')))];
        $ca = Environment::get('DB_SSL_CA');
        if ($ca !== '') {
            if (!is_file($ca)) { throw new \RuntimeException('Database CA file is unavailable.'); }
            $options[\PDO::MYSQL_ATTR_SSL_CA] = $ca;
            $options[\PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
        $pdo = new \PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4",
            $c['user'], $c['password'], $options);
        $pdo->exec("SET time_zone = '+00:00'");
        return self::$connection = $pdo;
    }

    public static function transaction(callable $work): mixed
    {
        $pdo = self::connection();
        $pdo->beginTransaction();
        try {
            $result = $work($pdo);
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            throw $e;
        }
    }
}
