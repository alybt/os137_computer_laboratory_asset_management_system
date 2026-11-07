<?php
declare(strict_types=1);
require dirname(__DIR__).'/config/bootstrap.php';
use Clams\Services\Operations;
use Clams\Support\HttpError;
$db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('PRAGMA foreign_keys=ON');
preg_match_all('/CREATE TABLE `([^`]+)` \((.*?)\) ENGINE/s',file_get_contents(CLAMS_ROOT.'/database/schema.sql'),$tables,PREG_SET_ORDER);
foreach($tables as $t){$body=preg_replace('/^  INDEX \([^\n]+\),?\n?/m','',$t[2]);$body=rtrim($body,",\r\n ");$body=str_replace('INT NOT NULL AUTO_INCREMENT PRIMARY KEY','INTEGER PRIMARY KEY AUTOINCREMENT',$body);$db->exec('CREATE TABLE `'.$t[1].'` ('.$body.')');}
// Reuse additive column definitions; SQLite omits MySQL-specific per-column UNIQUE clauses.
foreach(['001_extensions.sql','002_history_archival.sql','003_sticker_fields.sql'] as $file){
    preg_match_all('/ALTER TABLE (\w+) (.*?);/s',file_get_contents(CLAMS_ROOT.'/database/migrations/'.$file),$alters,PREG_SET_ORDER);
    foreach($alters as $alter){
        if(!in_array($alter[1],['users','assets','categories','laboratories','assignments','maintenance_records','activity_logs'],true)){continue;}
        preg_match_all('/\bADD (?!FOREIGN|CHECK)(\w+) (.*?)(?=, ADD |;$|$)/s',$alter[2],$columns,PREG_SET_ORDER);
        foreach($columns as $c){$def=preg_replace('/ CHARACTER SET \w+ COLLATE \w+| UNIQUE/','',$c[2]);$db->exec('ALTER TABLE '.$alter[1].' ADD '.$c[1].' '.$def);}
    }
}
$db->exec('CREATE TABLE departments(id INTEGER PRIMARY KEY,name TEXT);CREATE TABLE asset_transaction_locks(asset_id INTEGER PRIMARY KEY,operation TEXT,operation_id INTEGER,resolved_at TEXT);CREATE TABLE password_reset_tokens(id INTEGER PRIMARY KEY,user_id INTEGER,used_at TEXT);');
$q=$db->prepare('INSERT INTO users(id,full_name,email,role,password_hash)VALUES(1,?,?,?,?)');$q->execute(['Original Admin','admin@test.edu','admin',password_hash('original-password',PASSWORD_DEFAULT)]);
$ops=new Operations($db,['id'=>1,'full_name'=>'Original Admin','role'=>'super_admin']);$checks=0;
function ok(bool $pass,string $message): void{global $checks;if(!$pass){throw new RuntimeException('FAIL: '.$message);}echo 'PASS: '.$message."\n";$checks++;}
function rejects(callable $fn,string $message): void{try{$fn();}catch(HttpError){ok(true,$message);return;}throw new RuntimeException('FAIL: '.$message);}
$cat=$ops->writeReference('categories',['name'=>'Monitor','color'=>'#123456']);$lab=$ops->writeReference('laboratories',['name'=>'Original lab','code'=>'LAB1']);
$asset=$ops->writeAsset(['asset_tag'=>'TAG-1','name'=>'Monitor','category_id'=>$cat['id'],'laboratory_id'=>$lab['id'],'purchase_cost'=>null,'serial_number'=>'SER-1']);$id=(int)$asset['id'];
ok($asset['purchase_cost']===null && $asset['asset_tag']==='TAG-1','Asset registration preserves tag and unknown purchase cost');
rejects(fn()=>$ops->writeAsset(['asset_tag'=>'TAG-1','name'=>'Duplicate']),'Duplicate asset tag rejected');
rejects(fn()=>$ops->writeAsset(['asset_tag'=>'OTHER','name'=>'Duplicate serial','serial_number'=>'SER-1']),'Duplicate serial rejected');
rejects(fn()=>$ops->writeAsset(['name'=>'Changed','purchase_cost'=>-1],$id),'Negative purchase cost rejected');
$loan=$ops->writeAssignment(['asset_id'=>$id,'borrower_name'=>'Faculty Borrower','due_date'=>gmdate('Y-m-d',time()+86400)]);$loanId=(int)$loan['id'];
ok($ops->row('assets',$id)['status']==='assigned','Checkout updates asset status');
rejects(fn()=>$ops->writeAssignment(['asset_id'=>$id,'borrower_name'=>'Second Borrower']),'Double checkout rejected');
rejects(fn()=>$ops->writeMaintenance(['asset_id'=>$id,'title'=>'Repair']),'Maintenance blocked during checkout');
rejects(fn()=>$ops->archiveAsset($id),'Asset archival blocked during checkout');
rejects(fn()=>$ops->archiveHistory('assignments',$loanId),'Unreturned assignment cannot be archived as a fake return');
$ops->writeAssignment([],$loanId,true);ok($ops->row('assets',$id)['status']==='available','Physical return restores availability');
rejects(fn()=>$ops->writeAssignment([],$loanId,true),'Duplicate return rejected');
$m1=$ops->writeMaintenance(['asset_id'=>$id,'title'=>'Repair A']);$m2=$ops->writeMaintenance(['asset_id'=>$id,'title'=>'Repair B']);
ok($ops->row('assets',$id)['status']==='maintenance','Opening repair marks asset under maintenance');
rejects(fn()=>$ops->writeAssignment(['asset_id'=>$id,'borrower_name'=>'Borrower']),'Checkout blocked while repairs are open');
$ops->writeMaintenance(['status'=>'completed'],(int)$m1['id']);ok($ops->row('assets',$id)['status']==='maintenance','One completed repair does not ignore another open repair');
$ops->archiveHistory('maintenance_records',(int)$m2['id']);ok($ops->row('assets',$id)['status']==='available' && $ops->row('maintenance_records',(int)$m2['id'])['status']==='cancelled','Archiving an open repair cancels it and restores availability');
$ops->archiveHistory('assignments',$loanId);ok($ops->listHistory('assignments')['total']===0 && $ops->row('assignments',$loanId)['returned_at']!==null,'Assignment archival retains original returned history');
rejects(fn()=>$ops->writeReference('laboratories',[],(int)$lab['id'],true),'Lab deactivation blocked with assigned inventory');
rejects(fn()=>$ops->writeUser(['is_active'=>false],1),'Self-deactivation rejected');
$u=$ops->writeUser(['full_name'=>'Faculty User','email'=>'faculty@test.edu','password'=>'faculty-password','role'=>'faculty','is_active'=>true]);
ok(!isset($u['password_hash']) && $u['role']==='faculty','User registration hashes password and returns safe fields');
$ops->writeUser([],(int)$u['id'],true);ok(!$ops->users(['id'=>$u['id']])[0]['is_active'],'User removal deactivates without deleting account');
rejects(fn()=>$ops->password(['current_password'=>'wrong','new_password'=>'replacement-password']),'Incorrect current password rejected');
$ops->password(['current_password'=>'original-password','new_password'=>'replacement-password']);ok(password_verify('replacement-password',$ops->row('users',1)['password_hash']),'Profile password change verified and hashed');
$summary=$ops->summary();ok($summary['totals']['assets']===1 && $summary['maintenance_cost']===0.0,'Report summary uses original asset and repair data');
ok(count($ops->export('assignments'))===1,'CSV list excludes archived rows without deleting them');
ok(Operations::csvCell('=HYPERLINK("bad")')[0]==="'",'CSV spreadsheet formula injection neutralized');
$ops->archiveAsset($id);ok($ops->row('assets',$id)['archived_at']!==null,'Asset archive retains original record');
$logs=$db->query('SELECT previous_values,updated_values FROM activity_logs')->fetchAll();ok(!str_contains(json_encode($logs),'password_hash'),'Audit snapshots omit password hashes');
ok((int)$db->query('SELECT COUNT(*) FROM assignments')->fetchColumn()===1,'Original assignment history remains stored');
$sticker=$ops->writeAsset(['name'=>'Test monitor','property_number'=>'TEST-PROP-2','purchase_order_number'=>'TEST-PO','fund_source'=>'TEST-FUND','sticker_date'=>'2021-11-19','sticker_location'=>'Test location','sticker_end_user'=>'Test custodian','sticker_amount'=>'50000.00','sticker_amount_scope'=>'package','purchase_cost'=>null]);
ok(str_starts_with($sticker['asset_tag'],'ASSET-'),'Blank optional internal tag is generated by the backend');
ok($sticker['property_number']==='TEST-PROP-2' && $sticker['asset_tag']!=='TEST-PROP-2','Official property number remains distinct from generated tag');
ok((float)$sticker['sticker_amount']===50000.0 && $sticker['purchase_cost']===null,'Package sticker amount does not become individual item cost');
ok($sticker['sticker_date']==='2021-11-19' && $sticker['purchase_order_number']==='TEST-PO' && $sticker['sticker_end_user']==='Test custodian','Sticker fields round-trip without invented values');
rejects(fn()=>$ops->writeAsset(['name'=>'Duplicate','property_number'=>'TEST-PROP-2']),'Duplicate official property number rejected');
rejects(fn()=>$ops->writeAsset(['sticker_amount'=>-1],(int)$sticker['id']),'Negative sticker amount rejected');
rejects(fn()=>$ops->writeAsset(['sticker_amount_scope'=>'invented'],(int)$sticker['id']),'Invalid sticker amount scope rejected');
$edited=$ops->writeAsset(['name'=>'Renamed monitor'],(int)$sticker['id']);
ok($edited['asset_tag']===$sticker['asset_tag'] && $edited['sticker_amount']===$sticker['sticker_amount'],'Editing visible fields preserves hidden technical/sticker data');
$allValues=['asset_tag'=>'ALL-FIELDS','property_number'=>'FULL-PROPERTY','name'=>'Full record','description'=>'Description saved','category_id'=>(int)$cat['id'],'laboratory_id'=>(int)$lab['id'],'status'=>'available','condition'=>'good','brand'=>'Acer','model'=>'V22','serial_number'=>'FULL-SERIAL','supplier'=>'Supplier A','purchase_date'=>'2021-11-19','purchase_cost'=>'123.45','warranty_expiry'=>'2023-11-19','notes'=>'Private notes','purchase_order_number'=>'PO-185','fund_source'=>'Fund A','sticker_location'=>'Original location','sticker_end_user'=>'Label custodian','specifications'=>'HDMI','sticker_date'=>'2021-11-20','sticker_amount'=>'50000.50','sticker_amount_scope'=>'package'];
$full=$ops->writeAsset($allValues);
$matches=true;foreach($allValues as $key=>$value){if($full[$key]!=$value){$matches=false;}}
ok($matches,'Every field submitted by the asset form persists in the create response');
$updated=$ops->writeAsset(array_replace($allValues,['description'=>'Edited description','model'=>'Edited model','sticker_amount'=>'0.00','purchase_cost'=>'0.00']),(int)$full['id']);
ok($updated['description']==='Edited description' && $updated['brand']==='Acer' && $updated['model']==='Edited model' && (float)$updated['sticker_amount']===0.0 && (float)$updated['purchase_cost']===0.0,'Complete edit payload preserves separate fields and zero amounts');
$ops->query('UPDATE assets SET custodian_id=? WHERE id=?',[1,$full['id']]);
$read=\Clams\Services\Inventory::assets($db,['id'=>$full['id']])['items'][0];
ok($read['category_name']==='Monitor' && $read['laboratory_name']==='Original lab' && $read['custodian_name']==='Original Admin','Asset table references resolve category, laboratory and linked custodian to names');
echo "$checks operation checks passed. MySQL concurrency and HTTP acceptance remain unverified.\n";
