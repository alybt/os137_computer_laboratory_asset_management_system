<?php
declare(strict_types=1);
namespace Clams\Support;
final class Passwords
{
    /** Verify the groupmate's exact PBKDF2 encoding without resetting existing accounts. */
    public static function verify(string $password, string $stored): bool
    {
        if (!str_starts_with($stored, 'pbkdf2_sha256$')) { return password_verify($password, $stored); }
        $parts = explode('$', $stored);
        if (count($parts) !== 4 || !ctype_digit($parts[1])) { return false; }
        $iterations = (int)$parts[1];
        $salt = base64_decode($parts[2], true); $digest = base64_decode($parts[3], true);
        if ($iterations < 10000 || $iterations > 2000000 || $salt === false || strlen($salt)!==16 || $digest===false || strlen($digest)!==32) { return false; }
        return hash_equals($digest, hash_pbkdf2('sha256', $password, $salt, $iterations, 32, true));
    }
}
