<?php
declare(strict_types=1);
// PHP development server only; Apache uses .htaccess/front controller.
if (PHP_SAPI !== 'cli-server') { http_response_code(404); exit; }
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$file = realpath(__DIR__ . $path);
if ($file !== false && str_starts_with($file, realpath(__DIR__) . DIRECTORY_SEPARATOR)
    && is_file($file) && in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['js','css','svg','png','jpg','ico','woff2'], true)) { return false; }
require __DIR__.'/index.php';
