import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeftRight,
  Boxes,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Tags,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Avatar, StatusBadge } from './ui'
import { cn } from '../lib/format'

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

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/30">
        <Boxes className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[15px] font-bold tracking-tight text-white">LabAssets</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
          OS 137 · Asset Management
        </p>
      </div>
    </div>
  )
}

function NavItems({ isAdmin, onNavigate }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
      {SECTIONS.map((section) => {
        const items = section.items.filter(
          (item) => !item.adminOnly || isAdmin,
        )
        if (!items.length) return null
        return (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition',
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            'h-4 w-4 transition',
                            isActive
                              ? 'text-brand-300'
                              : 'text-slate-500 group-hover:text-slate-300',
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function SidebarContent({ isAdmin, user, onNavigate, onLogout }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <Brand />
      </div>
      <NavItems isAdmin={isAdmin} onNavigate={onNavigate} />
      <div className="border-t border-white/10 p-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
        >
          <Avatar name={user?.full_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">
              {user?.full_name}
            </p>
            <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
          </div>
        </NavLink>
        <div className="mt-1 flex items-center justify-between gap-2 px-2">
          <StatusBadge kind="role" value={user?.role} />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const pageTitle = PAGE_TITLES[location.pathname] || 'LabAssets'
  const today = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-950 lg:flex">
        <SidebarContent
          isAdmin={isAdmin}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-slate-950 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              isAdmin={isAdmin}
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="icon-btn lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-slate-900">{pageTitle}</h2>
              <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
                {today}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                System online
              </div>
              <NavLink
                to="/settings"
                className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100"
              >
                <Avatar name={user?.full_name} size="sm" />
                <span className="hidden max-w-32 truncate pr-1 text-xs font-semibold text-slate-700 md:block">
                  {user?.full_name}
                </span>
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200/70 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 text-[11px] text-slate-400 sm:flex-row">
            <p>Computer Laboratory Asset Management System · OS 137</p>
            <p>FastAPI + PostgreSQL · React + Vite</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
