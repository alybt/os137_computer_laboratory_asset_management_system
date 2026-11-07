<?php
declare(strict_types=1);
namespace Clams\Services;
use Clams\Support\Database;
use Clams\Support\Session;
final class Auth {
    public static function log(\PDO $db, ?int $id, string $action): void {
        $name='Unknown account';
        if ($id!==null) { $q=$db->prepare('SELECT full_name FROM users WHERE id=?'); $q->execute([$id]); $name=$q->fetchColumn() ?: $name; }
        $db->prepare('INSERT INTO activity_logs (user_id,user_name,action,entity_type,entity_id,ip_address) VALUES (?,?,?,?,?,?)')->execute([$id,$name,$action,'authentication',$id,$_SERVER['REMOTE_ADDR'] ?? null]);
    }
    public static function login(string $email,string $password): bool {
        $email=strtolower(trim($email));
        if (strlen($email)>160 || strlen($password)>1024) { return false; }
        $db=Database::connection(); $identifier=hash('sha256',$email); $ip=$_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $q=$db->prepare('SELECT GET_LOCK(?,5)'); $q->execute(['clams-login-throttle']);
        if ((int)$q->fetchColumn()!==1) { return false; }
        try {
            $q=$db->prepare('SELECT COUNT(*) FROM login_attempts WHERE created_at>UTC_TIMESTAMP()-INTERVAL 15 MINUTE AND succeeded=0 AND (identifier_hash=? OR ip_address=?)'); $q->execute([$identifier,$ip]);
            if ((int)$q->fetchColumn()>=5) { return false; }
            $q=$db->prepare('SELECT u.*,r.is_active AS role_active FROM users u JOIN roles r ON r.code=COALESCE((SELECT role_code FROM role_aliases WHERE legacy_code=u.role),u.role) WHERE email=?'); $q->execute([$email]); $u=$q->fetch();
            $hash=$u['password_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
            $valid=\Clams\Support\Passwords::verify($password,$hash) && $u && $u['is_active'] && $u['role_active'];
            Database::transaction(static function(\PDO $db) use($identifier,$ip,$valid,$u): void {
                $db->prepare('INSERT INTO login_attempts (identifier_hash,ip_address,succeeded) VALUES (?,?,?)')->execute([$identifier,$ip,(int)$valid]);
                self::log($db,$u?(int)$u['id']:null,$valid?'login':'login_failed');
                if ($valid) { $db->prepare('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?')->execute([$u['id']]); }
            });
            if (!$valid) { return false; }
            Session::clear(); $_SESSION['user_id']=(int)$u['id']; $_SESSION['authenticated_at']=time(); return true;
        } finally { $db->query("SELECT RELEASE_LOCK('clams-login-throttle')"); }
    }
    public static function user(): ?array {
        if (!isset($_SESSION['user_id'])) { return null; }
        $q=Database::connection()->prepare('SELECT u.id,u.full_name,u.email,u.department_id,u.password_changed_at,u.is_active,u.created_at,u.last_login_at,r.code AS role,r.name AS role_name FROM users u JOIN roles r ON r.code=COALESCE((SELECT role_code FROM role_aliases WHERE legacy_code=u.role),u.role) WHERE u.id=? AND u.is_active=1 AND r.is_active=1'); $q->execute([$_SESSION['user_id']]); $u=$q->fetch();
        if (!$u || ($u['password_changed_at'] && strtotime($u['password_changed_at'].' UTC')>=($_SESSION['authenticated_at'] ?? 0))) { Session::clear(); return null; }
        return $u;
    }
    public static function allowed(int $id,string $permission): bool {
        $q=Database::connection()->prepare('SELECT 1 FROM users u JOIN roles r ON r.code=COALESCE((SELECT role_code FROM role_aliases WHERE legacy_code=u.role),u.role) JOIN role_permissions rp ON rp.role_code=r.code JOIN permissions p ON p.code=rp.permission_code WHERE u.id=? AND u.is_active=1 AND r.is_active=1 AND p.code=?'); $q->execute([$id,$permission]); return (bool)$q->fetchColumn();
    }
    public static function logout(): void { try { if (isset($_SESSION['user_id'])) { self::log(Database::connection(),(int)$_SESSION['user_id'],'logout'); } } finally { Session::clear(); } }
}
