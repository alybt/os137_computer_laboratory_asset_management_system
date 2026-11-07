import { useEffect, useState } from 'react'
import {
  CalendarDays,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  Avatar,
  PageHeader,
  SectionCard,
  Spinner,
  StatusBadge,
} from '../components/ui'

export default function Settings() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)


  useEffect(() => {
    if (!user) return
    setProfile({ full_name: user.full_name || '', email: user.email || '' })
  }, [user])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await api.patch('/auth/me', {
        full_name: profile.full_name.trim(),
        email: profile.email.trim(),
      })
      setUser(updated)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.new_password.length < 12) {
      toast.error('New password must be at least 12 characters')
      return
    }
    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      })
      toast.success('Password changed successfully')
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your account information and password."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5">
          <div className="card overflow-hidden">
            
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div className="rounded-full ring-4 ring-white">
                  <Avatar name={user.full_name} size="lg" />
                </div>
                <StatusBadge kind="role" value={user.role} />
              </div>
              <h2 className="mt-3 text-lg font-bold text-slate-900">{user.full_name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  Joined {formatDate(user.created_at)}
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                  Last sign-in {formatDateTime(user.last_login_at)}
                </p>
              </div>
            </div>
          </div>


        </div>

        <div className="space-y-5 xl:col-span-2">
          <SectionCard
            title="Profile information"
            subtitle="Your name and sign-in email"
            icon={UserRound}
          >
            <form onSubmit={saveProfile} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="profile_name">
                    Full name
                  </label>
                  <input
                    id="profile_name"
                    required
                    minLength={2}
                    className="input"
                    value={profile.full_name}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="profile_email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="profile_email"
                      type="email"
                      required
                      className="input pl-10"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Change password"
            subtitle="Use at least six characters"
            icon={KeyRound}
          >
            <form onSubmit={changePassword} className="space-y-4 px-5 py-5">
              <div>
                <label className="label" htmlFor="current_password">
                  Current password
                </label>
                <input
                  id="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="input"
                  value={passwords.current_password}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      current_password: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new_password">
                    New password
                  </label>
                  <input
                    id="new_password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="input"
                    value={passwords.new_password}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        new_password: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="confirm_password">
                    Confirm new password
                  </label>
                  <input
                    id="confirm_password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="input"
                    value={passwords.confirm_password}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        confirm_password: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-secondary" disabled={savingPassword}>
                  {savingPassword ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Role permissions" subtitle="What your account can do" icon={ShieldCheck}>
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    label: 'Administrator',
                    text: 'Full access including user management and deletions.',
                    active: user.role === 'admin',
                  },
                  {
                    label: 'Technician',
                    text: 'Manage assets, assignments, maintenance, labs, and categories.',
                    active: user.role === 'technician',
                  },
                  {
                    label: 'Viewer',
                    text: 'Read-only access to inventory and reports.',
                    active: user.role === 'viewer',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[10px] border p-3.5 ${
                      item.active
                        ? 'border-brand-200 bg-brand-50/60'
                        : 'border-slate-100 bg-slate-50/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{item.label}</p>
                      {item.active && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
