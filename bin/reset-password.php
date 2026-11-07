<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Support\Database;
$password=getenv('CLAMS_RESET_PASSWORD') ?: ''; putenv('CLAMS_RESET_PASSWORD');
$email=strtolower(trim($argv[1] ?? ''));
if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<12 || strlen($password)>72) {
    fwrite(STDERR,"Usage: php bin/reset-password.php EMAIL; set CLAMS_RESET_PASSWORD in process environment (12–72 bytes). Verify the account owner's identity first.\n"); exit(1);
}
try {
    Database::transaction(static function(PDO $db) use($email,$password): void {
        $q=$db->prepare('SELECT id FROM users WHERE email=? AND is_active=1 FOR UPDATE'); $q->execute([$email]); $id=$q->fetchColumn();
        if (!$id) { throw new RuntimeException(); }
        $db->prepare('UPDATE users SET password_hash=?,password_changed_at=UTC_TIMESTAMP() WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$id]);
        $db->prepare('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL')->execute([$id]);
        Clams\Services\Auth::log($db,(int)$id,'operator_password_reset');
    }); echo "Password reset; existing sessions will be invalidated.\n";
} catch(Throwable $e) { fwrite(STDERR,"Reset failed. Check configuration and active account.\n"); exit(1); }
