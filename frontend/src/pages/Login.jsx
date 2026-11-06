import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui'

const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@labassets.edu', password: 'admin123' },
  { label: 'Technician', email: 'tech@labassets.edu', password: 'labassets123' },
  { label: 'Viewer', email: 'viewer@labassets.edu', password: 'labassets123' },
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      const destination = location.state?.from || '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3 px-10 pt-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">LabAssets</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Computer Laboratory
            </p>
          </div>
        </div>

        <div className="relative z-10 px-10 pb-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-brand-200">
            <Sparkles className="h-3.5 w-3.5" />
            OS 137 · Computer Laboratory Asset Management
          </span>
          <h1 className="mt-6 max-w-lg text-4xl font-bold leading-tight tracking-tight text-white">
            Every workstation, laptop, and lab tool — accounted for.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Track laboratory equipment, issue assets to faculty and students,
            schedule maintenance, and generate reports from one clean workspace.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-1 gap-3">
            {[
              {
                icon: Boxes,
                title: 'Live inventory',
                text: '40+ demo assets across six laboratories, ready to explore.',
              },
              {
                icon: Wrench,
                title: 'Maintenance workflow',
                text: 'Schedule, track, and close repair records with audit history.',
              },
              {
                icon: ShieldCheck,
                title: 'Role-based access',
                text: 'Administrators, technicians, and read-only viewers.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
              >
                <feature.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 px-10 py-5 text-[11px] text-slate-500">
          <span>Computer Laboratory Asset Management System</span>
          <span>FastAPI · PostgreSQL · React</span>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">LabAssets</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                OS 137 · Asset Management
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your laboratory account to continue.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input pl-10"
                  placeholder="you@labassets.edu"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input px-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
              {submitting ? <Spinner className="h-4 w-4" /> : null}
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Demo accounts
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Click an account to fill the form, then sign in.
            </p>
            <div className="mt-3 grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-left transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{account.label}</p>
                    <p className="truncate text-[11px] text-slate-400">{account.email}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-mono font-semibold text-slate-500 shadow-sm">
                    {account.password}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            Frontend · WSL / Distrobox &nbsp;•&nbsp; Backend · VirtualBox
          </p>
        </div>
      </div>
    </div>
  )
}
