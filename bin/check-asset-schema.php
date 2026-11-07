<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/config/bootstrap.php';
try {
    $db=Clams\Support\Database::connection();
    $versions=$db->query('SELECT version FROM schema_versions ORDER BY version')->fetchAll(PDO::FETCH_COLUMN);
    echo 'Installed migrations: '.implode(', ',$versions)."\n";
    $q=$db->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?");$q->execute(['assets']);
    $columns=$q->fetchAll(PDO::FETCH_COLUMN);
    $required=['asset_tag','name','property_number','purchase_order_number','fund_source','sticker_location','sticker_end_user','specifications','sticker_date','sticker_amount','sticker_amount_scope'];
    $missing=array_values(array_diff($required,$columns));
    if($missing){echo 'Missing asset columns: '.implode(', ',$missing)."\nApply the pending migration inside Ubuntu using deploy/ubuntu/setup.py --apply.\n";exit(1);}
    echo "PASS: Asset registration fields exist. No records changed.\n";
}catch(Throwable $e){fwrite(STDERR,'Asset schema inspection failed: '.get_class($e).' code='.$e->getCode().". No credentials displayed.\n");exit(1);}
