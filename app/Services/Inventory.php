<?php
declare(strict_types=1);
namespace Clams\Services;
final class Inventory
{
    public static function assets(\PDO $db, array $filters=[]): array
    {
        $where=['a.archived_at IS NULL']; $args=[];
        foreach (['id','category_id','laboratory_id'] as $key) {
            if (isset($filters[$key])) { $where[]="a.$key=?"; $args[]=(int)$filters[$key]; }
        }
        foreach (['status','condition'] as $key) {
            if (isset($filters[$key]) && is_string($filters[$key]) && $filters[$key]!=='') { $where[]="a.`$key`=?"; $args[]=$filters[$key]; }
        }
        if (isset($filters['q']) && is_string($filters['q']) && $filters['q']!=='') {
            $where[]='(a.asset_tag LIKE ? OR a.name LIKE ? OR a.property_number LIKE ? OR a.serial_number LIKE ?)';
            for ($i=0;$i<4;$i++) { $args[]='%'.$filters['q'].'%'; }
        }
        $joins=' FROM assets a LEFT JOIN categories c ON c.id=a.category_id LEFT JOIN laboratories l ON l.id=a.laboratory_id LEFT JOIN users cu ON cu.id=a.custodian_id WHERE '.implode(' AND ',$where);
        $q=$db->prepare('SELECT COUNT(*)'.$joins); $q->execute($args); $total=(int)$q->fetchColumn();
        $page=max(1,min(100000,(int)($filters['page'] ?? 1))); $size=max(1,min(100,(int)($filters['page_size'] ?? 20)));
        $key=is_string($filters['sort_by'] ?? null)?$filters['sort_by']:'created_at';
        $sort=in_array($key,['name','asset_tag','created_at','purchase_date','purchase_cost','status','condition'],true)?'a.`'.$key.'`':'a.created_at';
        $order=($filters['order'] ?? '')==='asc'?'ASC':'DESC'; $offset=($page-1)*$size;
        $q=$db->prepare('SELECT a.*,c.name AS category_name,c.color AS category_color,l.name AS laboratory_name,cu.full_name AS custodian_name'.$joins." ORDER BY $sort $order,a.id ASC LIMIT $size OFFSET $offset");
        $q->execute($args); $items=$q->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($items as &$item) {
            $q=$db->prepare("SELECT x.*,u.full_name AS assigned_by_name,CASE WHEN x.returned_at IS NOT NULL THEN 'returned' WHEN x.due_date<? THEN 'overdue' ELSE 'active' END AS status FROM assignments x LEFT JOIN users u ON u.id=x.assigned_by WHERE x.asset_id=? AND x.returned_at IS NULL ORDER BY x.id LIMIT 1");
            $q->execute([gmdate('Y-m-d'),$item['id']]); $item['active_assignment']=$q->fetch(\PDO::FETCH_ASSOC) ?: null;
            $q=$db->prepare("SELECT COUNT(*) FROM maintenance_records WHERE asset_id=? AND status IN ('scheduled','in_progress')"); $q->execute([$item['id']]); $item['open_maintenance_count']=(int)$q->fetchColumn();
            if ($item['purchase_cost']!==null) { $item['purchase_cost']=(float)$item['purchase_cost']; }
        }
        return ['items'=>$items,'total'=>$total,'page'=>$page,'page_size'=>$size,'pages'=>(int)ceil($total/$size)];
    }
    public static function dashboard(\PDO $db): array
    {
        $totals=[];
        foreach (['assets'=>'assets WHERE archived_at IS NULL','laboratories'=>'laboratories WHERE is_active=1','categories'=>'categories WHERE is_active=1','users'=>'users WHERE is_active=1','active_assignments'=>'assignments WHERE returned_at IS NULL','open_maintenance'=>"maintenance_records WHERE status IN ('scheduled','in_progress')"] as $key=>$from) {
            $totals[$key]=(int)$db->query('SELECT COUNT(*) FROM '.$from)->fetchColumn();
        }
        foreach (['available','assigned','maintenance','retired','lost'] as $status) {
            $q=$db->prepare('SELECT COUNT(*) FROM assets WHERE archived_at IS NULL AND status=?'); $q->execute([$status]); $totals[$status]=(int)$q->fetchColumn();
        }
        $totals['total_value']=(float)$db->query('SELECT COALESCE(SUM(purchase_cost),0) FROM assets WHERE archived_at IS NULL')->fetchColumn();
        $charts=['assets_by_status'=>$db->query('SELECT status AS label,COUNT(*) AS value FROM assets WHERE archived_at IS NULL GROUP BY status')->fetchAll(\PDO::FETCH_ASSOC)];
        foreach (['category'=>['categories','category_id'],'laboratory'=>['laboratories','laboratory_id']] as $key=>[$table,$column]) {
            $charts['assets_by_'.$key]=$db->query("SELECT COALESCE(t.name,'Unassigned') AS label,COUNT(*) AS value FROM assets a LEFT JOIN $table t ON t.id=a.$column WHERE a.archived_at IS NULL GROUP BY t.name")->fetchAll(\PDO::FETCH_ASSOC);
        }
        $activity=$db->query('SELECT * FROM activity_logs ORDER BY created_at DESC,id DESC LIMIT 8')->fetchAll(\PDO::FETCH_ASSOC);
        $q=$db->prepare("SELECT m.*,a.asset_tag,a.name AS asset_name FROM maintenance_records m JOIN assets a ON a.id=m.asset_id WHERE m.status IN ('scheduled','in_progress') AND (m.scheduled_date IS NULL OR m.scheduled_date<=?) ORDER BY m.scheduled_date,m.id LIMIT 6"); $q->execute([gmdate('Y-m-d',time()+30*86400)]); $maintenance=$q->fetchAll(\PDO::FETCH_ASSOC);
        $q=$db->prepare("SELECT a.* FROM assets a WHERE archived_at IS NULL AND warranty_expiry BETWEEN ? AND ? AND status NOT IN ('retired','lost') ORDER BY warranty_expiry LIMIT 6"); $q->execute([gmdate('Y-m-d'),gmdate('Y-m-d',time()+90*86400)]);
        return ['totals'=>$totals]+$charts+['recent_activity'=>$activity,'upcoming_maintenance'=>$maintenance,'warranty_expiring'=>$q->fetchAll(\PDO::FETCH_ASSOC)];
    }
}
