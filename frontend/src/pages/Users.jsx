import { useCallback, useEffect, useState } from 'react'
import {
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRound,
  Users as UsersIcon,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { ROLE } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  Avatar,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchInput,
  Spinner,
  StatusBadge,
} from '../components/ui'

const EMPTY = {
  full_name: '',
  email: '',
  password: '',
  role: 'student',
  is_active: true,
}

function UserForm({ open, onClose, user, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      user
        ? {
            full_name: user.full_name || '',
            email: user.email || '',
            password: '',
            role: ({admin:'super_admin',technician:'it_personnel',viewer:'student'}[user.role] || user.role || 'student'),
            is_active: user.is_active,
          }
        : EMPTY,
    )
  }, [open, user])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
      is_active: form.is_active,
    }
    if (form.password) payload.password = form.password
    try {
      if (user) {
        await api.patch(`/users/${user.id}`, payload)
        toast.success('User updated')
      } else {
        await api.post('/users', payload)
        toast.success('User account created')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Edit user' : 'Add a user'}
      description={
        user
          ? `Update the account for ${user.full_name}.`
          : 'Create a laboratory staff account and assign a role.'
      }
      icon={UserCog}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : user ? 'Save changes' : 'Create user'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="user_name">
            Full name *
          </label>
          <input
            id="user_name"
            required
            className="input"
            value={form.full_name}
            onChange={(event) => update('full_name', event.target.value)}
            placeholder="Maria Santos"
          />
        </div>
        <div>
          <label className="label" htmlFor="user_email">
            Email address *
          </label>
          <input
            id="user_email"
            type="email"
            required
            className="input"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="name@university.edu"
          />
        </div>
        <div>
          <label className="label" htmlFor="user_password">
            Password {user ? '(leave blank to keep current)' : '*'}
          </label>
          <input
            id="user_password"
            type="password"
            required={!user}
            minLength={12}
            className="input"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            placeholder={user ? '••••••••' : 'At least 12 characters'}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="user_role">
              Role
            </label>
            <select
              id="user_role"
              className="select"
              value={form.role}
              onChange={(event) => update('role', event.target.value)}
            >
              {Object.entries(ROLE).filter(([key]) => ['super_admin','property_admin','lab_admin','it_personnel','faculty','student'].includes(key)).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-slate-200 px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => update('is_active', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-semibold text-slate-700">Active account</span>
            </label>
          </div>
        </div>
        <p className="rounded-[10px] bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-700">Administrators</strong> manage users and delete records.{' '}
          <strong className="text-slate-700">Technicians</strong> manage inventory, assignments, and
          maintenance. <strong className="text-slate-700">Viewers</strong> have read-only access.
        </p>
      </form>
    </Modal>
  )
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeactivateTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await api.get('/users'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = users.filter((user) => {
    const term = query.trim().toLowerCase()
    const matchesQuery =
      !term ||
      [user.full_name, user.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    return matchesQuery && (!roleFilter || user.role === roleFilter)
  })

  const counts = users.reduce(
    (result, user) => {
      result[user.role] = (result[user.role] || 0) + 1
      if (user.is_active) result.active += 1
      return result
    },
    { admin: 0, technician: 0, viewer: 0, active: 0 },
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleDeactivate = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/users/${deleteTarget.id}`)
      toast.success('User deactivated; history retained')
      setDeactivateTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingBlock label="Loading user accounts…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="User accounts"
        subtitle="Control who can access the system and what they are allowed to do."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add user
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total users', value: users.length, icon: UsersIcon, color: 'brand' },
          { label: 'Administrators', value: (counts.admin || 0) + (counts.super_admin || 0), icon: ShieldCheck, color: 'violet' },
          { label: 'Technicians', value: counts.technician, icon: UserCog, color: 'sky' },
          { label: 'Active accounts', value: counts.active, icon: UserRound, color: 'emerald' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                {
                  brand: 'bg-brand-50 text-brand-600',
                  violet: 'bg-violet-50 text-violet-600',
                  sky: 'bg-sky-50 text-sky-600',
                  emerald: 'bg-emerald-50 text-emerald-600',
                }[stat.color]
              }`}
            >
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search name or email…"
            className="flex-1"
          />
          <select
            className="select sm:w-52"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">All roles</option>
            {Object.entries(ROLE).filter(([key]) => ['super_admin','property_admin','lab_admin','it_personnel','faculty','student'].includes(key)).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users matched"
            description="Try a different search term or role filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Last sign-in</th>
                  <th className="table-th">Created</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/80">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name} />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.full_name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                YOU
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <StatusBadge kind="role" value={user.role} />
                    </td>
                    <td className="table-td">
                      <span
                        className={`chip ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      {formatDateTime(user.last_login_at)}
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      {formatDateTime(user.created_at)}
                    </td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
                            setEditing(user)
                            setFormOpen(true)
                          }}
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            type="button"
                            className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDeactivateTarget(user)}
                            title="Deactivate user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={deleting}
        title={`Deactivate ${deleteTarget?.full_name || 'user'}?`}
        description="The account is deactivated. Its identity and activity history are retained."
        confirmLabel="Deactivate user"
      />
    </div>
  )
}
