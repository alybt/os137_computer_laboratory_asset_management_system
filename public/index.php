<?php
 declare(strict_types=1);
 header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 header('X-Content-Type-Options: nosniff');
 header('Referrer-Policy: same-origin');
 header('Cache-Control: no-store');
 try {
     require dirname(__DIR__).'/config/bootstrap.php';
     $path=parse_url($_SERVER['REQUEST_URI'] ?? '/',PHP_URL_PATH) ?: '/';
     if (str_starts_with($path,'/api/')) { \Clams\Controllers\Api::run($path); }
     if (!in_array($_SERVER['REQUEST_METHOD'],['GET','HEAD'],true)) { http_response_code(405); exit('Method not allowed.'); }
     if (!is_file(CLAMS_ROOT.'/public/ui/index.html')) {
         http_response_code(503); exit('Interface build unavailable. Run npm ci and npm run build in frontend/.');
     }
     header('Content-Type: text/html; charset=utf-8');
     if ($_SERVER['REQUEST_METHOD']!=='HEAD') { readfile(CLAMS_ROOT.'/public/ui/index.html'); }
 } catch(Throwable $e) {
     error_log('CLAMS request failed: '.get_class($e).' code='.$e->getCode());
     http_response_code(503);
     if (str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
         header('Content-Type: application/json'); echo json_encode(['detail'=>'Database or application service unavailable. Contact your administrator.']);
     } else { echo 'Application service unavailable. Contact your system administrator.'; }
 }
