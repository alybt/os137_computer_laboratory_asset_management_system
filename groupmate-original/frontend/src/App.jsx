import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Assignments from './pages/Assignments'
import Maintenance from './pages/Maintenance'
import Laboratories from './pages/Laboratories'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import ActivityLog from './pages/ActivityLog'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40">
        <Boxes className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
        Loading LabAssets…
      </div>
    </div>
  )
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Boxes className="h-7 w-7" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <a href="/" className="btn-primary">
        Back to dashboard
      </a>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="laboratories" element={<Laboratories />} />
          <Route path="categories" element={<Categories />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="activity"
            element={
              <RequireRole roles={['admin']}>
                <ActivityLog />
              </RequireRole>
            }
          />
          <Route
            path="users"
            element={
              <RequireRole roles={['admin']}>
                <Users />
              </RequireRole>
            }
          />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
