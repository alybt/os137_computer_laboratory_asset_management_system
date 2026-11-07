import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowLeftRight, Boxes, FileBarChart, FlaskConical, LayoutDashboard, LogOut, Menu, Settings, Tags, Users, Wrench, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE } from '../lib/constants'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'
const SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/assets', label: 'Assets', icon: Boxes },
      { to: '/assignments', label: 'Assignments', icon: ArrowLeftRight },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Facilities',
    items: [
      { to: '/laboratories', label: 'Laboratories', icon: FlaskConical },
      { to: '/categories', label: 'Categories', icon: Tags },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/reports', label: 'Reports', icon: FileBarChart },
      { to: '/activity', label: 'Activity log', icon: Activity, adminOnly: true },
      { to: '/users', label: 'Users', icon: Users, adminOnly: true },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/assets': 'Assets',
  '/assignments': 'Assignments',
  '/maintenance': 'Maintenance',
  '/laboratories': 'Laboratories',
  '/categories': 'Categories',
  '/reports': 'Reports',
  '/activity': 'Activity log',
  '/users': 'Users',
  '/settings': 'Settings',
}

export default function Layout() {
  const {user,isAdmin,logout} = useAuth()
  const navigate=useNavigate()
  const location=useLocation()
  const [mobileOpen,setMobileOpen]=useState(false)
  const [collapsed,setCollapsed]=useState(false)
  const [signingOut,setSigningOut]=useState(false)
  const [signOutError,setSignOutError]=useState('')
  const signOut=async()=>{ setSigningOut(true);setSignOutError('');try{await logout();navigate('/login',{replace:true})}catch{setSignOutError('Sign-out failed. Please try again.')}finally{setSigningOut(false)} }
  const sidebar=(compact=false)=><>
    <NavLink to="/" onClick={()=>setMobileOpen(false)} className="clam-brand" title="CLAM home"><Brand /></NavLink>
    <nav aria-label="Main navigation" className="clam-nav">
      {SECTIONS.map(section=><div key={section.label}>
        {!compact && <p className="clam-nav-label">{section.label}</p>}
        {section.items.filter(item=>!item.adminOnly || isAdmin).map(item=><NavLink key={item.to} to={item.to} end={item.end}
          onClick={()=>setMobileOpen(false)} title={compact?item.label:undefined} aria-label={item.label}
          className={({isActive})=>`clam-nav-link ${isActive?'active':''}`}>
          <item.icon size={18} aria-hidden="true" />{!compact && <span>{item.label}</span>}
        </NavLink>)}
      </div>)}
    </nav>
    <div className="clam-account">
      {!compact && <><NavLink to="/settings" onClick={()=>setMobileOpen(false)} className="block break-words text-sm font-semibold">{user?.full_name}</NavLink>
        <p className="mt-1 break-all text-xs text-slate-500">{user?.email}</p>
        <p className="mt-1 whitespace-normal text-xs text-slate-600">{ROLE[user?.role]?.label || user?.role}</p></>}
      {signOutError && <p role="alert" className="text-xs text-red-700">{signOutError}</p>}
      <button className="clam-nav-link mt-2 w-full" onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out"><LogOut size={18}/>{!compact && (signingOut?'Signing out…':'Sign out')}</button>
    </div>
  </>
  return <div className={`clam-layout ${collapsed?'sidebar-compact':''}`}>
    <aside className="clam-sidebar hidden lg:flex">{sidebar(collapsed)}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button className="absolute inset-0 bg-black/40" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>
      <aside className="clam-sidebar mobile" aria-label="Mobile navigation"><button className="icon-btn absolute right-1 top-1" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}><X size={18}/></button>{sidebar(false)}</aside>
    </div>}
    <div className="clam-workspace">
      <header className="clam-header">
        <button className="icon-btn lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(true)}><Menu size={20}/></button>
        <button className="icon-btn hidden lg:inline-flex" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
        <span className="text-sm font-semibold">{PAGE_TITLES[location.pathname] || 'CLAM'}</span>
        <div className="ml-auto"><ThemeToggle/></div>
        <span className="hidden text-xs text-slate-500 sm:block">{new Intl.DateTimeFormat('en-PH',{dateStyle:'long',timeZone:'Asia/Manila'}).format(new Date())}</span>
      </header>
      <main id="main-content" className="clam-main"><Outlet/></main>
      <footer className="clam-footer">CLAM — Computer Laboratory Asset Management</footer>
    </div>
  </div>
}
