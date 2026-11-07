import subprocess,json
php=r'C:\xampp\php\php.exe'
cases=[('/api/dashboard/analytics','GET','Sign in required.'),('/api/assets','GET','Sign in required.'),('/api/auth/logout','GET','Sign in required.'),('/api/auth/login','POST','Session expired. Reload and try again.')]
for path,method,detail in cases:
 code="$_SERVER['REQUEST_URI']="+repr(path)+";$_SERVER['REQUEST_METHOD']="+repr(method)+";require 'public/index.php';"
 result=subprocess.run([php,'-r',code],capture_output=True,text=True,check=True)
 assert json.loads(result.stdout)['detail']==detail,result.stdout
 print('PASS:',method,path,'rejects unauthorized request')
code="$_SERVER['REQUEST_URI']='/api/auth/csrf';$_SERVER['REQUEST_METHOD']='GET';require 'public/index.php';"
r=subprocess.run([php,'-r',code],capture_output=True,text=True,check=True); assert len(json.loads(r.stdout)['csrf'])==64
print('PASS: CSRF bootstrap returns generated token without database access')
code="$_SERVER['REQUEST_URI']='/login';$_SERVER['REQUEST_METHOD']='GET';require 'public/index.php';"
r=subprocess.run([php,'-r',code],capture_output=True,text=True,check=True); assert '/ui/assets/' in r.stdout
print('PASS: front controller serves built groupmate React interface')
