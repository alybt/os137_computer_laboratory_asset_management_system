<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/config/bootstrap.php';
try{
    $db=Clams\Support\Database::connection();
    $q=$db->prepare("SELECT id FROM users WHERE email=? AND role IN ('admin','super_admin','property_admin') AND is_active=1");$q->execute([$argv[1] ?? 'admin@university.edu']);$id=$q->fetchColumn();
    if(!$id || !Clams\Services\Auth::allowed((int)$id,'assets.read')){throw new RuntimeException('Authorized dashboard account unavailable.');}
    $snapshot=Clams\Services\Inventory::dashboard($db);
    foreach(['assets_by_category','assets_by_status','assets_by_laboratory'] as $key){
        $sum=array_sum(array_map(static fn($row)=>(int)$row['value'],$snapshot[$key]));
        if($sum!==$snapshot['totals']['assets']){throw new RuntimeException('Snapshot total mismatch.');}
    }
    echo 'PASS: Snapshot chart totals match '.$snapshot['totals']['assets']." registered asset(s).\n";
    foreach([6,12] as $months){
        $a=Clams\Services\DashboardAnalytics::read($db,$months,Clams\Services\Auth::allowed((int)$id,'borrowing.manage'),Clams\Services\Auth::allowed((int)$id,'maintenance.manage'));
        if(count($a['range']['labels'])!==$months){throw new RuntimeException('Range mismatch.');}
        echo "PASS: $months month MySQL analytics query and range.\n";
        foreach(['assignments'=>['assigned','returned'],'maintenance'=>['recorded','completed']] as $key=>$fields){
            if(!$a[$key]['available']){echo "$key: unavailable for this role (no data disclosed).\n";continue;}
            foreach($fields as $field){if(count($a[$key][$field])!==$months){throw new RuntimeException('Series mismatch.');}echo "$key/$field: ".array_sum($a[$key][$field])." recorded events.\n";}
        }
    }
    echo "Read-only service verification. Authenticated HTTP/browser checks remain separate. No records changed.\n";
}catch(Throwable $e){fwrite(STDERR,'Analytics diagnostic failed: '.get_class($e).' code='.$e->getCode().". No credentials displayed.\n");exit(1);}
