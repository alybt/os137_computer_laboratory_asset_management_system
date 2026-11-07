<?php
declare(strict_types=1);
namespace Clams\Support;
final class Session {
    public static function start(): void {
        ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1');
        session_name('clams_session');
        session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>isset($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','httponly'=>true,'samesite'=>'Lax']);
        session_save_path(CLAMS_ROOT.'/storage/sessions');
        if (!session_start()) { throw new \RuntimeException('Session storage unavailable.'); }
        if (isset($_SESSION['last_activity']) && time()-$_SESSION['last_activity']>max(60,(int)Environment::get('SESSION_LIFETIME','1800'))) { self::clear(); }
        $_SESSION['last_activity']=time(); $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }
    public static function clear(): void { $_SESSION=[]; if (!session_regenerate_id(true)) { throw new \RuntimeException('Session rotation failed.'); } $_SESSION['csrf']=bin2hex(random_bytes(32)); }
    public static function csrfValid(mixed $token): bool { return is_string($token) && isset($_SESSION['csrf']) && hash_equals($_SESSION['csrf'],$token); }
}
