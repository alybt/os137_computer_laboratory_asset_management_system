<?php
declare(strict_types=1);
namespace Clams\Services;
use Clams\Support\HttpError;
/** Ports the original seven-table workflows; dependencies are explicit for testing. */
final class Operations
{
    public function __construct(private \PDO $db, private array $actor) {}
    public function query(string $sql,array $args=[]): \PDOStatement { $q=$this->db->prepare($sql); $q->execute($args); return $q; }
    private function lock(): string { return $this->db->getAttribute(\PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':''; }
    public function row(string $table,int $id,bool $lock=false): array {
        $r=$this->query("SELECT * FROM `$table` WHERE id=?".($lock?$this->lock():''),[$id])->fetch(\PDO::FETCH_ASSOC);
        if (!$r) { throw new HttpError('Record not found.',404); } return $r;
    }
    private function save(string $table,array $data,?int $id=null): int {
        if (!$data) { return $id ?? throw new HttpError('No values supplied.'); }
        $columns=array_keys($data);
        if ($id) { $this->query("UPDATE `$table` SET ".implode(',',array_map(fn($c)=>"`$c`=?",$columns)).' WHERE id=?',[...array_values($data),$id]); }
        else { $this->query("INSERT INTO `$table` (`".implode('`,`',$columns).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')',array_values($data)); $id=(int)$this->db->lastInsertId(); }
        return $id;
    }
    private function audit(string $action,string $type,int $id,?array $before,array $after): void {
        foreach (['password_hash','password','token_hash'] as $key) { unset($before[$key],$after[$key]); }
        $this->query('INSERT INTO activity_logs(user_id,user_name,action,entity_type,entity_id,detail,previous_values,updated_values) VALUES (?,?,?,?,?,?,?,?)',[$this->actor['id'],$this->actor['full_name'],$action,$type,$id,ucfirst($action).' '.$type.' #'.$id,$before===null?null:json_encode($before,JSON_THROW_ON_ERROR),json_encode($after,JSON_THROW_ON_ERROR)]);
    }
    private function transaction(callable $work): mixed {
        $this->db->beginTransaction(); try { $r=$work(); $this->db->commit(); return $r; } catch(\Throwable $e) { if ($this->db->inTransaction()) {$this->db->rollBack();} throw $e; }
    }
    private function clean(array $input,array $fields,array $required=[]): array {
        if (array_diff(array_keys($input),array_keys($fields))) { throw new HttpError('Unknown form field.'); }
        $out=[];
        foreach($input as $key=>$value) {
            $rule=$fields[$key];
            if ($value===null) { if (in_array($key,$required,true)) { throw new HttpError("$key is required."); } $out[$key]=null; continue; }
            if (is_int($rule)) { if (!is_string($value) || mb_strlen(trim($value))>$rule) { throw new HttpError("Invalid $key."); } $value=trim($value); }
            elseif (is_array($rule)) { if (!in_array($value,$rule,true)) { throw new HttpError("Invalid $key."); } }
            elseif ($rule==='password' || $rule==='secret') { if(!is_string($value) || strlen($value)>($rule==='password'?72:1024)){throw new HttpError("Invalid $key.");} }
            elseif ($rule==='id') { if (filter_var($value,FILTER_VALIDATE_INT)===false || (int)$value<1) { throw new HttpError("Invalid $key."); } $value=(int)$value; }
            elseif ($rule==='money') { if (!is_numeric($value) || !is_finite((float)$value) || (float)$value<0 || (float)$value>9999999999999.99) { throw new HttpError("Invalid $key."); } }
            elseif ($rule==='date') { if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value) || !($d=\DateTimeImmutable::createFromFormat('!Y-m-d',$value)) || $d->format('Y-m-d')!==$value) { throw new HttpError("Invalid $key."); } }
            elseif ($rule==='bool') { if (!is_bool($value)) { throw new HttpError("Invalid $key."); } $value=(int)$value; }
            $out[$key]=$value;
        }
        foreach($required as $key) { if (!isset($out[$key]) || $out[$key]==='') { throw new HttpError("$key is required."); } }
        return $out;
    }
    private function active(int $asset): bool { return (bool)$this->query('SELECT id FROM assignments WHERE asset_id=? AND returned_at IS NULL',[$asset])->fetchColumn(); }
    private function repairs(int $asset): bool { return (bool)$this->query("SELECT id FROM maintenance_records WHERE asset_id=? AND status IN ('scheduled','in_progress')",[$asset])->fetchColumn(); }
    private function reserved(int $asset): bool { return (bool)$this->query('SELECT asset_id FROM asset_transaction_locks WHERE asset_id=? AND resolved_at IS NULL',[$asset])->fetchColumn(); }
    private function asset(int $id): array { $a=$this->row('assets',$id,true); if ($a['archived_at']) {throw new HttpError('Asset is archived.',409);} return $a; }
    public function writeAsset(array $input,?int $id=null): array {
        $fields=['asset_tag'=>40,'name'=>160,'description'=>20000,'category_id'=>'id','laboratory_id'=>'id','status'=>['available','assigned','maintenance','retired','lost'],'condition'=>['new','good','fair','poor','damaged','Excellent','Good','Fair','Poor','Damaged','Unusable'],'brand'=>100,'model'=>120,'serial_number'=>120,'supplier'=>160,'purchase_date'=>'date','purchase_cost'=>'money','warranty_expiry'=>'date','notes'=>20000,'property_number'=>150,'purchase_order_number'=>150,'fund_source'=>150,'sticker_location'=>255,'sticker_end_user'=>255,'specifications'=>20000,'sticker_date'=>'date','sticker_amount'=>'money','sticker_amount_scope'=>['unconfirmed','individual','package']];
        if(!$id && (!isset($input['asset_tag']) || $input['asset_tag']==='')){$input['asset_tag']='ASSET-'.strtoupper(bin2hex(random_bytes(8)));}
        $data=$this->clean($input,$fields,$id?[]:['asset_tag','name']);
        foreach(['property_number','serial_number'] as $field){if(array_key_exists($field,$data) && $data[$field]===''){$data[$field]=null;}}
        if(array_key_exists('sticker_amount_scope',$data) && $data['sticker_amount_scope']===null){throw new HttpError('Choose what the property amount covers.');}
        foreach(['asset_tag','name','status','condition'] as $key) { if(array_key_exists($key,$data) && ($data[$key]===null || $data[$key]==='')) { throw new HttpError("$key cannot be blank."); } }
        return $this->transaction(function()use($id,$data) {
            $before=$id?$this->asset($id):null;
            foreach(['category_id'=>'categories','laboratory_id'=>'laboratories'] as $field=>$table) { if(isset($data[$field])) { $ref=$this->row($table,$data[$field],true); if(!$ref['is_active']){throw new HttpError('Selected reference is inactive.');} } }
            foreach(['asset_tag','serial_number','property_number'] as $field) { if(isset($data[$field]) && $data[$field]!=='') { if($this->query("SELECT id FROM assets WHERE `$field`=? AND id<>?",[$data[$field],$id ?? 0])->fetchColumn()){throw new HttpError("Duplicate $field.",409);} } }
            $next=$data['status'] ?? ($before['status'] ?? 'available');
            if($next==='assigned' && (!$id || !$this->active($id))){throw new HttpError('Create an assignment to check out equipment.',409);}
            if($id && $this->active($id) && ($next!=='assigned' || (array_key_exists('laboratory_id',$data) && $data['laboratory_id']!=$before['laboratory_id']))){throw new HttpError('Return active equipment before changing its state/location.',409);}
            if($id && ($this->repairs($id)||$this->reserved($id)) && ($next!==$before['status'] || (array_key_exists('laboratory_id',$data) && $data['laboratory_id']!=$before['laboratory_id']))){throw new HttpError('Resolve active maintenance/reservation first.',409);}
            $merged=array_replace($before ?? [],$data);
            if(isset($merged['purchase_date'],$merged['warranty_expiry']) && $merged['warranty_expiry']<$merged['purchase_date']){throw new HttpError('Warranty expiry precedes purchase.');}
            if(!$id){$data['created_by']=$this->actor['id'];} $data['updated_at']=gmdate('Y-m-d H:i:s');
            $saved=$this->save('assets',$data,$id); $this->audit($id?'update':'create','asset',$saved,$before,$data);
            return Inventory::assets($this->db,['id'=>$saved])['items'][0];
        });
    }
    public function writeAssignment(array $input,?int $id=null,bool $return=false): array {
        $fields=['borrower_name'=>120,'borrower_email'=>160,'department'=>120,'purpose'=>255,'due_date'=>'date','notes'=>20000]; if(!$id){$fields['asset_id']='id';}
        $data=$this->clean($input,$fields,$id?[]:['asset_id','borrower_name']);
        if(isset($data['borrower_email']) && $data['borrower_email']!=='' && !filter_var($data['borrower_email'],FILTER_VALIDATE_EMAIL)){throw new HttpError('Invalid borrower email.');}
        return $this->transaction(function()use($data,$id,$return){
            $before=$id?$this->row('assignments',$id):null; $asset=$this->asset((int)($before['asset_id'] ?? $data['asset_id']));
            if($id){$before=$this->row('assignments',$id,true); if($before['archived_at']){throw new HttpError('Assignment is archived.',409);} if($before['returned_at']){throw new HttpError('Assignment already returned.',409);}}
            if($return){ $data['returned_at']=gmdate('Y-m-d H:i:s'); if(!in_array($asset['status'],['maintenance','retired','lost'],true) && !$this->repairs($asset['id'])){$this->save('assets',['status'=>'available','updated_at'=>gmdate('Y-m-d H:i:s')],$asset['id']);} }
            elseif(!$id){
                if($asset['status']!=='available' || $this->active($asset['id']) || $this->repairs($asset['id']) || $this->reserved($asset['id'])){throw new HttpError('Equipment is unavailable or has an active transaction.',409);}
                $data['assigned_by']=$this->actor['id']; $this->save('assets',['status'=>'assigned','updated_at'=>gmdate('Y-m-d H:i:s')],$asset['id']);
            }
            if(!$return && isset($data['due_date']) && $data['due_date']<gmdate('Y-m-d')){throw new HttpError('Due date must not be in the past.');}
            if(isset($data['borrower_name']) && !$data['borrower_name']){throw new HttpError('Borrower name is required.');}
            $saved=$this->save('assignments',$data,$id); $this->audit($return?'return':($id?'update':'assign'),'assignment',$saved,$before,$data);
            return $this->listHistory('assignments',['id'=>$saved])['items'][0];
        });
    }
    public function writeMaintenance(array $input,?int $id=null): array {
        $fields=['title'=>160,'description'=>20000,'maintenance_type'=>['preventive','corrective','inspection','upgrade'],'status'=>['scheduled','in_progress','completed','cancelled'],'scheduled_date'=>'date','completed_date'=>'date','cost'=>'money','performed_by'=>120,'notes'=>20000]; if(!$id){$fields['asset_id']='id';}
        $data=$this->clean($input,$fields,$id?[]:['asset_id','title']);
        foreach(['title','status','maintenance_type'] as $key){if(array_key_exists($key,$data) && !$data[$key]){throw new HttpError("$key is required.");}}
        return $this->transaction(function()use($data,$id){
            $before=$id?$this->row('maintenance_records',$id):null; $asset=$this->asset((int)($before['asset_id'] ?? $data['asset_id'])); if($id){$before=$this->row('maintenance_records',$id,true);if($before['archived_at']){throw new HttpError('Maintenance record is archived.',409);}}
            $status=$data['status'] ?? ($before['status'] ?? 'scheduled'); $open=in_array($status,['scheduled','in_progress'],true);
            if(($open || !$id) && (in_array($asset['status'],['retired','lost'],true)||$this->active($asset['id'])||$this->reserved($asset['id']))){throw new HttpError('Return or resolve active equipment before maintenance.',409);}
            if($status==='completed' && empty($data['completed_date']) && empty($before['completed_date'])){$data['completed_date']=gmdate('Y-m-d');}
            if(!$id){$data['created_by']=$this->actor['id'];} $data['updated_at']=gmdate('Y-m-d H:i:s'); $saved=$this->save('maintenance_records',$data,$id);
            if($open){$this->save('assets',['status'=>'maintenance'],$asset['id']);}
            elseif(!$this->repairs($asset['id']) && $asset['status']==='maintenance'){$this->save('assets',['status'=>$this->active($asset['id'])?'assigned':'available'],$asset['id']);}
            $this->audit($id?'update':'create','maintenance',$saved,$before,$data);
            return $this->listHistory('maintenance_records',['id'=>$saved])['items'][0];
        });
    }
    public function listHistory(string $table,array $filters=[]): array {
        $assignment=$table==='assignments'; $where=isset($filters['id'])?['1=1']:['h.archived_at IS NULL']; $args=[];
        foreach(['id','asset_id'] as $key){if(isset($filters[$key])){$where[]="h.$key=?";$args[]=(int)$filters[$key];}}
        if(isset($filters['status']) && $filters['status']!==''){
            if($assignment){$where[]=match($filters['status']){'returned'=>'h.returned_at IS NOT NULL','overdue'=>'h.returned_at IS NULL AND h.due_date<?','active'=>'h.returned_at IS NULL AND (h.due_date IS NULL OR h.due_date>=?)',default=>throw new HttpError('Invalid assignment status.')}; if($filters['status']!=='returned'){$args[]=gmdate('Y-m-d');}}
            else {$where[]='h.status=?';$args[]=$filters['status'];}
        }
        if(!$assignment && isset($filters['type']) && $filters['type']!==''){$where[]='h.maintenance_type=?';$args[]=$filters['type'];}
        if(isset($filters['q']) && is_string($filters['q']) && $filters['q']!==''){$where[]='(a.asset_tag LIKE ? OR a.name LIKE ? OR h.'.($assignment?'borrower_name':'title').' LIKE ?)'; for($i=0;$i<3;$i++){$args[]='%'.$filters['q'].'%';}}
        $from=" FROM $table h JOIN assets a ON a.id=h.asset_id".($assignment?' LEFT JOIN users u ON u.id=h.assigned_by':'').' WHERE '.implode(' AND ',$where);
        $total=(int)$this->query('SELECT COUNT(*)'.$from,$args)->fetchColumn(); $page=max(1,min(100000,(int)($filters['page'] ?? 1)));$size=max(1,min(100,(int)($filters['page_size'] ?? 20)));$offset=($page-1)*$size;
        $select='SELECT h.*,a.asset_tag,a.name AS asset_name'.($assignment?',u.full_name AS assigned_by_name':'');
        $items=$this->query($select.$from.' ORDER BY h.'.($assignment?'assigned_at':'created_at')." DESC,h.id DESC LIMIT $size OFFSET $offset",$args)->fetchAll(\PDO::FETCH_ASSOC);
        if($assignment){foreach($items as &$r){$r['status']=$r['returned_at']?'returned':($r['due_date'] && $r['due_date']<gmdate('Y-m-d')?'overdue':'active');}}
        return ['items'=>$items,'total'=>$total,'page'=>$page,'page_size'=>$size,'pages'=>(int)ceil($total/$size)];
    }
    public function writeReference(string $table,array $input,?int $id=null,bool $deactivate=false): array {
        $fields=$table==='categories'?['name'=>120,'description'=>20000,'color'=>20]:['name'=>120,'code'=>30,'building'=>120,'room'=>60,'capacity'=>'money','description'=>20000];
        $data=$this->clean($input,$fields,$id?[]:($table==='categories'?['name']:['name','code']));
        foreach(['name','code'] as $key){if(array_key_exists($key,$data) && !$data[$key]){throw new HttpError("$key is required.");}}
        if(isset($data['color']) && !preg_match('/^#[0-9a-fA-F]{6}$/D',$data['color'])){throw new HttpError('Use a six-digit hex color.');}
        if(isset($data['capacity']) && ((float)$data['capacity']!=(int)$data['capacity'] || $data['capacity']>2147483647)){throw new HttpError('Capacity must be a nonnegative integer.');}
        return $this->transaction(function()use($table,$data,$id,$deactivate){
            $before=$id?$this->row($table,$id,true):null;
            if($deactivate){$column=$table==='categories'?'category_id':'laboratory_id';if($this->query("SELECT id FROM assets WHERE $column=? AND archived_at IS NULL",[$id])->fetchColumn()){throw new HttpError('Reassign equipment before deactivation.',409);} $data=['is_active'=>0];}
            $saved=$this->save($table,$data,$id); $this->audit($deactivate?'deactivate':($id?'update':'create'),$table,$saved,$before,$data);
            return $this->reference($table,['id'=>$saved])[0];
        });
    }
    public function reference(string $table,array $filters=[]): array {
        $column=$table==='categories'?'category_id':'laboratory_id';$where=['1=1'];$args=[];
        if(isset($filters['id'])){$where[]='r.id=?';$args[]=$filters['id'];}else{$where[]='r.is_active=1';}
        if(!empty($filters['q'])){$where[]='r.name LIKE ?';$args[]='%'.$filters['q'].'%';}
        return $this->query("SELECT r.*,(SELECT COUNT(*) FROM assets a WHERE a.$column=r.id AND a.archived_at IS NULL) AS asset_count FROM $table r WHERE ".implode(' AND ',$where).' ORDER BY r.name',$args)->fetchAll(\PDO::FETCH_ASSOC);
    }
    public function archiveAsset(int $id): array {
        return $this->transaction(function()use($id){$before=$this->asset($id);if($this->active($id)||$this->repairs($id)||$this->reserved($id)){throw new HttpError('Resolve active transactions before archival.',409);} $data=['archived_at'=>gmdate('Y-m-d H:i:s')];$this->save('assets',$data,$id);$this->audit('archive','asset',$id,$before,$data);return ['message'=>'Asset archived; all history retained.'];});
    }
    public function archiveHistory(string $table,int $id): array {
        return $this->transaction(function()use($table,$id){
            $before=$this->row($table,$id);$asset=$this->asset((int)$before['asset_id']);$before=$this->row($table,$id,true);
            if($table==='assignments' && !$before['returned_at']){throw new HttpError('Record the physical return before archiving an assignment.',409);}
            $data=['archived_at'=>gmdate('Y-m-d H:i:s')];
            if($table==='maintenance_records' && in_array($before['status'],['scheduled','in_progress'],true)){$data['status']='cancelled';}
            $this->save($table,$data,$id);
            if($table==='maintenance_records' && !$this->repairs($asset['id']) && $asset['status']==='maintenance'){$this->save('assets',['status'=>$this->active($asset['id'])?'assigned':'available'],$asset['id']);}
            $this->audit('archive',$table,$id,$before,$data);return ['message'=>'Record archived; history retained.'];
        });
    }
    public function users(array $filters=[]): array {
        $where=['1=1'];$args=[];
        if(isset($filters['id'])){$where[]='id=?';$args[]=$filters['id'];}
        if(!empty($filters['q'])){$where[]='(full_name LIKE ? OR email LIKE ?)';$args[]='%'.$filters['q'].'%';$args[]='%'.$filters['q'].'%';}
        if(!empty($filters['role'])){$where[]='role=?';$args[]=$filters['role'];}
        $rows=$this->query('SELECT id,full_name,email,role,is_active,last_login_at,created_at,university_id,department_id FROM users WHERE '.implode(' AND ',$where).' ORDER BY full_name',$args)->fetchAll(\PDO::FETCH_ASSOC);
        foreach($rows as &$r){$r['is_active']=(bool)$r['is_active'];}return $rows;
    }
    public function writeUser(array $input,?int $id=null,bool $deactivate=false): array {
        $roles=['super_admin','property_admin','lab_admin','it_personnel','faculty','student','admin','technician','viewer'];
        $data=$this->clean($input,['full_name'=>120,'email'=>160,'password'=>'password','role'=>$roles,'is_active'=>'bool','university_id'=>100,'department_id'=>'id'],$id?[]:['full_name','email','password','role']);
        if(isset($data['password']) && $data['password']!=='' && strlen($data['password'])<12){throw new HttpError('Password must contain at least 12 bytes.');}
        if(!$id && empty($data['password'])){throw new HttpError('Password required.');}
        foreach(['full_name','email','role','is_active'] as $key){if(array_key_exists($key,$data) && ($data[$key]===null || $data[$key]==='')){throw new HttpError("$key cannot be blank.");}}
        if(isset($data['email'])){if(!filter_var($data['email'],FILTER_VALIDATE_EMAIL)){throw new HttpError('Invalid email address.');}$data['email']=strtolower($data['email']);}
        return $this->transaction(function()use($data,$id,$deactivate){
            $admins=$this->query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active=1 ORDER BY id".$this->lock())->fetchAll(\PDO::FETCH_COLUMN);
            $before=$id?$this->row('users',$id,true):null;
            if($deactivate){$data=['is_active'=>0];}
            $losesAdmin=$before && (array_key_exists('is_active',$data) && !$data['is_active'] || isset($data['role']) && !in_array($data['role'],['admin','super_admin'],true));
            if($losesAdmin && $id===$this->actor['id']){throw new HttpError('You cannot deactivate or demote yourself.',409);}
            if($losesAdmin && in_array($id,array_map('intval',$admins),true) && count($admins)<=1){throw new HttpError('At least one active administrator is required.',409);}
            if(isset($data['department_id'])){$this->row('departments',$data['department_id']);}
            if(!empty($data['password'])){$data['password_hash']=password_hash($data['password'],PASSWORD_DEFAULT);$data['password_changed_at']=gmdate('Y-m-d H:i:s');}unset($data['password']);
            $saved=$this->save('users',$data,$id);$this->audit($deactivate?'deactivate':($id?'update':'create'),'user',$saved,$before,$data);
            return $this->users(['id'=>$saved])[0];
        });
    }
    public function profile(array $input): array {
        $data=$this->clean($input,['full_name'=>120,'email'=>160]);
        if(array_key_exists('full_name',$data) && !$data['full_name']){throw new HttpError('Name required.');}
        if(array_key_exists('email',$data)){if(!filter_var($data['email'],FILTER_VALIDATE_EMAIL)){throw new HttpError('Invalid email.');}$data['email']=strtolower($data['email']);}
        return $this->transaction(function()use($data){$id=$this->actor['id'];$before=$this->row('users',$id,true);$this->save('users',$data,$id);$this->audit('update','profile',$id,$before,$data);return $this->users(['id'=>$id])[0];});
    }
    public function password(array $input): array {
        $data=$this->clean($input,['current_password'=>'secret','new_password'=>'password'],['current_password','new_password']);
        if(strlen($data['new_password'])<12){throw new HttpError('New password must contain at least 12 bytes.');}
        return $this->transaction(function()use($data){$id=$this->actor['id'];$before=$this->row('users',$id,true);if(!\Clams\Support\Passwords::verify($data['current_password'],$before['password_hash'])){throw new HttpError('Current password is incorrect.');}$values=['password_hash'=>password_hash($data['new_password'],PASSWORD_DEFAULT),'password_changed_at'=>gmdate('Y-m-d H:i:s')];$this->save('users',$values,$id);$this->query('UPDATE password_reset_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL',[gmdate('Y-m-d H:i:s'),$id]);$this->audit('update','password',$id,null,['changed'=>true]);return ['message'=>'Password updated.'];});
    }
    public function activity(array $filters=[]): array {
        $where=['1=1'];$args=[];foreach(['action','entity_type'] as $key){if(!empty($filters[$key])){$where[]="$key=?";$args[]=$filters[$key];}}
        if(!empty($filters['q'])){$where[]='(user_name LIKE ? OR detail LIKE ?)';$args[]='%'.$filters['q'].'%';$args[]='%'.$filters['q'].'%';}
        $limit=max(1,min(200,(int)($filters['limit'] ?? 50)));
        return $this->query('SELECT * FROM activity_logs WHERE '.implode(' AND ',$where)." ORDER BY created_at DESC,id DESC LIMIT $limit",$args)->fetchAll(\PDO::FETCH_ASSOC);
    }
    public function summary(): array {
        $dashboard=Inventory::dashboard($this->db);$out=['generated_at'=>gmdate('c'),'totals'=>$dashboard['totals'],'by_status'=>$dashboard['assets_by_status'],'by_category'=>$dashboard['assets_by_category'],'by_laboratory'=>$dashboard['assets_by_laboratory']];
        $out['by_condition']=$this->query('SELECT `condition` AS label,COUNT(*) AS value FROM assets WHERE archived_at IS NULL GROUP BY `condition`')->fetchAll(\PDO::FETCH_ASSOC);
        $out['maintenance_by_status']=$this->query('SELECT status AS label,COUNT(*) AS value FROM maintenance_records GROUP BY status')->fetchAll(\PDO::FETCH_ASSOC);
        $out['maintenance_cost']=(float)$this->query("SELECT COALESCE(SUM(cost),0) FROM maintenance_records WHERE status='completed'")->fetchColumn();
        $out['top_value_assets']=Inventory::assets($this->db,['sort_by'=>'purchase_cost','order'=>'desc','page_size'=>5])['items'];return $out;
    }
    public static function csvCell(mixed $value): mixed { return is_string($value) && preg_match('/^[\s]*[=+@\-]/u',$value)?"'".$value:$value; }
    public function export(string $type): array {
        if(!in_array($type,['assets','assignments','maintenance'],true)){throw new HttpError('Unknown export.',404);}
        $all=[];$page=1;do{$result=$type==='assets'?Inventory::assets($this->db,['page'=>$page,'page_size'=>100]):$this->listHistory($type==='maintenance'?'maintenance_records':'assignments',['page'=>$page,'page_size'=>100]);$all=[...$all,...$result['items']];$page++;}while($page<=$result['pages']);
        $columns=match($type){'assets'=>['asset_tag','name','category_name','laboratory_name','status','condition','brand','model','serial_number','supplier','purchase_date','purchase_cost','warranty_expiry','property_number','assigned_to','department','purchase_order_number','fund_source','sticker_date','sticker_location','sticker_end_user','sticker_amount','sticker_amount_scope'], 'assignments'=>['asset_tag','asset_name','borrower_name','borrower_email','department','purpose','assigned_by_name','assigned_at','due_date','returned_at','status'], 'maintenance'=>['asset_tag','asset_name','title','maintenance_type','status','scheduled_date','completed_date','performed_by','cost','description']};
        $rows=[$columns];foreach($all as $r){if($type==='assets'){$r['assigned_to']=$r['active_assignment']['borrower_name'] ?? '';$r['department']=$r['active_assignment']['department'] ?? '';}foreach(['purchase_cost','cost'] as $money){if(isset($r[$money])){$r[$money]=number_format((float)$r[$money],2,'.','');}}$rows[]=array_map(fn($key)=>self::csvCell($r[$key] ?? ''),$columns);}return $rows;
    }
}
