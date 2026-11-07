import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Boxes, ArrowLeftRight, Wrench, Activity, ArrowRight, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, timeAgo } from '../lib/format'
import { humanizeActivity } from '../lib/inventoryView'
import { ASSET_STATUS } from '../lib/constants'
import { STATUS_COLORS } from '../lib/chartConfig'
import { useAuth } from '../context/AuthContext'
import { ErrorState, LoadingBlock, PageHeader, SectionCard, StatCard, StatusBadge } from '../components/ui'
import ChartMessage from '../components/ChartMessage'
const DashboardChart=lazy(()=>import('../components/DashboardChart'))
function ChartFrame(props){return <Suspense fallback={<ChartMessage>Preparing chart…</ChartMessage>}><DashboardChart {...props}/></Suspense>}

const statusLabel = value => ASSET_STATUS[value]?.label || String(value).replaceAll('_',' ')
function SnapshotChart({items,title,kind='horizontal',status=false}) {
  const labels=Array.isArray(items)?items.map(item=>status?statusLabel(item.label):item.label):[]
  const series=Array.isArray(items)?[{label:'Assets',values:items.map(item=>Number(item.value)),colors:status?items.map(item=>STATUS_COLORS[String(item.label).toLowerCase()] || '#697586'):undefined}]:[]
  return <ChartFrame title={title} kind={kind} labels={labels} series={series} emptyLabel="No registered assets to summarize yet."/>
}
export default function Dashboard(){
  const {canWrite,canManageLoans,canManageMaintenance,isAdmin}=useAuth()
  const navigate=useNavigate()
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const [months,setMonths]=useState(6),[retry,setRetry]=useState(0)
  const [analytics,setAnalytics]=useState(null),[analyticsError,setAnalyticsError]=useState(''),[analyticsLoading,setAnalyticsLoading]=useState(true)
  const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await api.get('/dashboard'))}catch(e){setError(e.message)}finally{setLoading(false)}},[])
  useEffect(()=>{load()},[load])
  useEffect(()=>{
    let current=true
    const fetchAnalytics=async()=>{
      setAnalyticsLoading(true);setAnalyticsError('')
      try{const value=await api.get('/dashboard/analytics',{months});if(current)setAnalytics(value)}
      catch(e){if(current)setAnalyticsError(e.message)}finally{if(current)setAnalyticsLoading(false)}
    }
    fetchAnalytics()
    return()=>{current=false}
  },[months,retry])
  if(loading)return <LoadingBlock label="Loading laboratory overview…"/>
  if(error)return <ErrorState message={error} onRetry={load}/>
  if(!data)return null
  const {totals}=data
  const range=analytics?.range
  const retryAnalytics=()=>setRetry(value=>value+1)
  const monthly=(section,kind,title,series)=>{
    if(analyticsLoading)return <ChartMessage>Loading recorded activity…</ChartMessage>
    if(analyticsError)return <ChartMessage error onRetry={retryAnalytics}>Activity data could not be loaded. {analyticsError}</ChartMessage>
    if(!analytics?.[section]?.available)return <ChartMessage>This activity view is unavailable for your role.</ChartMessage>
    return <ChartFrame title={title} kind={kind} labels={range?.labels} series={series.map(([key,label])=>({label,values:analytics[section][key]}))}/>
  }
  return <div>
    <PageHeader title="Laboratory overview" subtitle="Equipment, utilization, and laboratory operations" actions={<>
      {canManageMaintenance && <button className="btn-secondary" onClick={()=>navigate('/maintenance?new=1')}><Wrench size={16}/>Log maintenance</button>}
      {canManageLoans && <button className="btn-secondary" onClick={()=>navigate('/assignments?new=1')}><ArrowLeftRight size={16}/>Issue asset</button>}
      {canWrite && <button className="btn-primary" onClick={()=>navigate('/assets?new=1')}><Plus size={16}/>Add asset</button>}
    </>}/>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Registered Assets" value={totals.assets} hint={`${formatCurrency(totals.total_value)} recorded individual costs`} icon={Boxes} accent="brand"/>
      <StatCard label="Available Equipment" value={totals.available} hint="Ready for assignment" icon={Boxes} accent="emerald"/>
      <StatCard label="Awaiting Return" value={totals.active_assignments} hint="Active equipment checkouts" icon={ArrowLeftRight} accent="sky"/>
      <StatCard label="Open Maintenance" value={totals.open_maintenance} hint={`${totals.maintenance} assets currently in service`} icon={Wrench} accent="amber"/>
    </div>
    <div className="dashboard-grid">
      <SectionCard title="Assets by Category" subtitle="Current registered inventory"><SnapshotChart title="Assets by category" items={data.assets_by_category}/></SectionCard>
      <SectionCard title="Status Overview" subtitle="Current operational status"><SnapshotChart title="Asset status overview" kind="doughnut" status items={data.assets_by_status}/></SectionCard>
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-800">Laboratories and activity</h2><p className="chart-range">Monthly activity uses recorded dates, grouped in Asia/Manila time. The current month is to date.</p></div>
      <label className="flex items-center gap-3 text-sm text-slate-600">Activity range<select className="select !w-auto" value={months} onChange={e=>setMonths(Number(e.target.value))}><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option></select></label>
    </div>
    <div className="dashboard-trends">
      <SectionCard title="Assets by Laboratory" subtitle="Current equipment allocation"><SnapshotChart title="Assets by laboratory" kind="bar" items={data.assets_by_laboratory}/></SectionCard>
      <SectionCard title="Assignments and Returns" subtitle={range?`${formatDate(range.from)} – ${formatDate(range.to)}`:'Recorded checkout and return events'}>{monthly('assignments','line','Monthly assignments and returns',[['assigned','Assigned'],['returned','Returned']])}</SectionCard>
      <SectionCard title="Maintenance Activity" subtitle="Recorded work orders and completion dates">{monthly('maintenance','bar','Monthly maintenance activity',[['recorded','Recorded'],['completed','Completed']])}</SectionCard>
    </div>
    <div className="dashboard-tasks">
      <SectionCard title="Recent Activity" subtitle="Latest five recorded events" actions={isAdmin && <Link className="inventory-link text-xs" to="/activity">View all</Link>}>
        {data.recent_activity.length ? <ul className="divide-y divide-slate-100">{data.recent_activity.slice(0,5).map(item=><li key={item.id} className="flex gap-3 p-4"><Activity size={16} className="mt-1 shrink-0 text-brand-600"/><div><p className="text-sm leading-relaxed"><span className="font-semibold">{item.user_name || 'System'}</span> · {humanizeActivity(item)}</p><p className="mt-1 text-xs text-slate-500">{timeAgo(item.created_at)}</p></div></li>)}</ul> : <ChartMessage>No activity recorded yet.</ChartMessage>}
      </SectionCard>
      <SectionCard title="Upcoming Returns" subtitle="Next five due within 30 days" actions={canManageLoans && <Link className="inventory-link text-xs" to="/assignments">View assignments</Link>}>
        {analyticsLoading?<ChartMessage>Loading return dates…</ChartMessage>:analyticsError?<ChartMessage error onRetry={retryAnalytics}>Return dates could not be loaded.</ChartMessage>:!analytics?.upcoming_returns?.available?<ChartMessage>Assignment access is unavailable for your role.</ChartMessage>:analytics.upcoming_returns.items.length?<ul className="divide-y divide-slate-100">{analytics.upcoming_returns.items.map(item=><li key={item.id} className="flex items-start justify-between gap-3 p-4"><div><p className="text-sm font-semibold">{item.asset_tag}</p><p className="mt-1 text-xs text-slate-500">{item.borrower_name}</p></div><span className="text-xs font-medium text-slate-600">{formatDate(item.due_date)}</span></li>)}</ul>:<ChartMessage>No recorded returns due in the next 30 days.</ChartMessage>}
      </SectionCard>
      <SectionCard title="Maintenance Schedule" subtitle="Open work due within 30 days" actions={canManageMaintenance && <Link className="inventory-link text-xs" to="/maintenance">View all</Link>}>
        {data.upcoming_maintenance.length ? <ul className="divide-y divide-slate-100">{data.upcoming_maintenance.slice(0,5).map(record=><li key={record.id} className="p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{record.title}</p><StatusBadge kind="maintenance" value={record.status}/></div><p className="mt-1 text-xs text-slate-500">{record.asset_tag} · {record.scheduled_date?formatDate(record.scheduled_date):'Unscheduled'}</p></li>)}</ul> : <ChartMessage>No open work in this schedule.{canManageMaintenance && <Link className="inventory-link mt-2 block" to="/maintenance?new=1">Log maintenance</Link>}</ChartMessage>}
      </SectionCard>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><Link to="/assets" className="inventory-link inline-flex items-center gap-2">Browse complete inventory<ArrowRight size={14}/></Link><button className="btn-ghost !py-1.5" onClick={()=>{load();retryAnalytics()}}><RefreshCw size={14}/>Refresh overview</button></div>
  </div>
}
