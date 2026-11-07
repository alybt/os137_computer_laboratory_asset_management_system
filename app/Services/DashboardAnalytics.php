<?php
declare(strict_types=1);
namespace Clams\Services;

/** Read-only aggregates over recorded original workflow dates. No inferred events. */
final class DashboardAnalytics
{
    public static function read(\PDO $db, int $months, bool $loansAllowed, bool $maintenanceAllowed, ?\DateTimeImmutable $asOf=null): array
    {
        if (!in_array($months,[6,12],true)) { throw new \Clams\Support\HttpError('Choose a 6 or 12 month range.'); }
        $zone=new \DateTimeZone('Asia/Manila');
        $now=($asOf ?? new \DateTimeImmutable('now',$zone))->setTimezone($zone);
        $first=$now->modify('first day of this month')->setTime(0,0)->modify('-'.($months-1).' months');
        $keys=[]; $labels=[];
        for($i=0;$i<$months;$i++){ $month=$first->modify("+$i months");$keys[]=$month->format('Y-m');$labels[]=$month->format('M Y'); }
        $utc=new \DateTimeZone('UTC');
        $start=$first->setTimezone($utc)->format('Y-m-d H:i:s');
        $end=$now->setTimezone($utc)->modify('+1 second')->format('Y-m-d H:i:s');
        $driver=$db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $counts=static function(string $table,string $column,bool $dateOnly=false)use($db,$driver,$first,$now,$start,$end,$keys):array {
            // Table/column identifiers below originate exclusively from fixed service calls.
            if($driver==='mysql'){$bucket=$dateOnly?"DATE_FORMAT(`$column`,'%Y-%m')":"DATE_FORMAT(DATE_ADD(`$column`, INTERVAL 8 HOUR),'%Y-%m')";}
            elseif($driver==='sqlite'){$bucket=$dateOnly?"strftime('%Y-%m',`$column`)":"strftime('%Y-%m',datetime(`$column`,'+8 hours'))";}
            else {throw new \RuntimeException('Unsupported analytics driver.');}
            $q=$db->prepare("SELECT $bucket AS month,COUNT(*) AS value FROM `$table` WHERE `$column` IS NOT NULL AND `$column`>=? AND `$column`<? GROUP BY $bucket ORDER BY month");
            $q->execute($dateOnly?[$first->format('Y-m-d'),$now->modify('+1 day')->format('Y-m-d')]:[$start,$end]);
            $rows=$q->fetchAll(\PDO::FETCH_KEY_PAIR);
            return array_map(static fn($key)=>(int)($rows[$key] ?? 0),$keys);
        };
        $out=['range'=>['months'=>$months,'keys'=>$keys,'labels'=>$labels,'timezone'=>'Asia/Manila','as_of'=>$now->format(DATE_ATOM),'from'=>$first->format('Y-m-d'),'to'=>$now->format('Y-m-d'),'current_month_partial'=>true]];
        $out['assignments']=$loansAllowed?['available'=>true,'assigned'=>$counts('assignments','assigned_at'),'returned'=>$counts('assignments','returned_at')]:['available'=>false,'reason'=>'Your role cannot view global assignment analytics.'];
        $out['maintenance']=$maintenanceAllowed?['available'=>true,'recorded'=>$counts('maintenance_records','created_at'),'completed'=>$counts('maintenance_records','completed_date',true)]:['available'=>false,'reason'=>'Your role cannot view global maintenance analytics.'];
        $out['upcoming_returns']=['available'=>false];
        if($loansAllowed){
            $q=$db->prepare('SELECT x.id,a.asset_tag,a.name AS asset_name,x.borrower_name,x.due_date FROM assignments x JOIN assets a ON a.id=x.asset_id WHERE x.returned_at IS NULL AND x.archived_at IS NULL AND x.due_date>=? AND x.due_date<=? ORDER BY x.due_date,x.id LIMIT 5');
            $q->execute([$now->format('Y-m-d'),$now->modify('+30 days')->format('Y-m-d')]);
            $out['upcoming_returns']=['available'=>true,'items'=>$q->fetchAll(\PDO::FETCH_ASSOC)];
        }
        // Include archived original records: archival must not erase historical activity.
        return $out;
    }
}
