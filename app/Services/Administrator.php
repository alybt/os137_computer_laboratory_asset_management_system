<?php
declare(strict_types=1);
namespace Clams\Services;

final class Administrator
{
    public static function provision(\PDO $db, string $email, string $universityId, string $password): int
    {
        // Reference tables have SELECT/INSERT only. A named lock serializes first-admin
        // provisioning without SELECT FOR UPDATE on roles (which needs extra privileges).
        $lock = $db->prepare('SELECT GET_LOCK(?, 10)');
        $lock->execute(['labassets-first-admin']);
        if ((int)$lock->fetchColumn() !== 1) {
            throw new \RuntimeException('Another administrator setup is running. Try again later.');
        }
        try {
            $db->beginTransaction();
            $role = $db->query("SELECT code FROM roles WHERE code='super_admin' AND is_active=1")->fetchColumn();
            if (!$role) { throw new \RuntimeException('Active administrator role missing.'); }
            $query = $db->prepare("SELECT id FROM users WHERE role IN (?, 'admin') LIMIT 1");
            $query->execute([$role]);
            if ($query->fetchColumn() !== false) { throw new \RuntimeException('Administrator already exists.'); }
            $db->prepare('INSERT INTO users (university_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
                ->execute([$universityId, 'System Administrator', $email, password_hash($password, PASSWORD_DEFAULT), $role]);
            $id = (int)$db->lastInsertId();
            Auth::log($db, $id, 'first_admin_provisioned');
            $db->commit();
            return $id;
        } catch (\Throwable $error) {
            if ($db->inTransaction()) { $db->rollBack(); }
            throw $error;
        } finally {
            $release = $db->prepare('SELECT RELEASE_LOCK(?)');
            $release->execute(['labassets-first-admin']);
        }
    }
}
