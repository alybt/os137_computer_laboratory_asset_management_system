import { useCallback, useEffect, useState } from 'react'
import {
  Boxes,
  Building2,
  DoorOpen,
  FlaskConical,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatNumber } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchInput,
  Spinner,
} from '../components/ui'

const EMPTY = {
  name: '',
  code: '',
  building: '',
  room: '',
  capacity: '',
  description: '',
}

function LabForm({ open, onClose, lab, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      lab
        ? {
            name: lab.name || '',
            code: lab.code || '',
            building: lab.building || '',
            room: lab.room || '',
            capacity: lab.capacity ?? '',
            description: lab.description || '',
          }
        : EMPTY,
    )
  }, [open, lab])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      building: form.building.trim() || null,
      room: form.room.trim() || null,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      description: form.description.trim() || null,
    }
    try {
      if (lab) {
        await api.patch(`/laboratories/${lab.id}`, payload)
        toast.success('Laboratory updated')
      } else {
        await api.post('/laboratories', payload)
        toast.success('Laboratory added')
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
      title={lab ? 'Edit laboratory' : 'Add a laboratory'}
      description={
        lab ? `Update the details for ${lab.code}.` : 'Create a new computer laboratory or facility.'
      }
      icon={FlaskConical}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="lab-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : lab ? 'Save changes' : 'Add laboratory'}
          </button>
        </>
      }
    >
      <form id="lab-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="lab_name">
              Laboratory name *
            </label>
            <input
              id="lab_name"
              required
              className="input"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Computer Laboratory 4"
            />
          </div>
          <div>
            <label className="label" htmlFor="lab_code">
              Code *
            </label>
            <input
              id="lab_code"
              required
              className="input font-mono uppercase"
              value={form.code}
              onChange={(event) => update('code', event.target.value)}
              placeholder="CL-4"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="lab_building">
              Building
            </label>
            <input
              id="lab_building"
              className="input"
              value={form.building}
              onChange={(event) => update('building', event.target.value)}
              placeholder="Main Building"
            />
          </div>
          <div>
            <label className="label" htmlFor="lab_room">
              Room
            </label>
            <input
              id="lab_room"
              className="input"
              value={form.room}
              onChange={(event) => update('room', event.target.value)}
              placeholder="204"
            />
          </div>
          <div>
            <label className="label" htmlFor="lab_capacity">
              Capacity
            </label>
            <input
              id="lab_capacity"
              type="number"
              min="0"
              className="input"
              value={form.capacity}
              onChange={(event) => update('capacity', event.target.value)}
              placeholder="40"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="lab_description">
            Description
          </label>
          <textarea
            id="lab_description"
            rows={3}
            className="input resize-none"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="What is this laboratory used for?"
          />
        </div>
      </form>
    </Modal>
  )
}

const ACCENTS = [
  'from-brand-500 to-indigo-700',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-700',
]

export default function Laboratories() {
  const { isAdmin, canWrite } = useAuth()
  const toast = useToast()
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setLabs(await api.get('/laboratories'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = labs.filter((lab) => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return [lab.name, lab.code, lab.building, lab.room]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term))
  })

  const totalCapacity = labs.reduce((sum, lab) => sum + (lab.capacity || 0), 0)
  const totalAssets = labs.reduce((sum, lab) => sum + lab.asset_count, 0)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/laboratories/${deleteTarget.id}`)
      toast.success('Laboratory deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingBlock label="Loading laboratories…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Laboratories"
        subtitle="Manage the physical computer laboratories and facilities on campus."
        actions={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add laboratory
            </button>
          ) : null
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Laboratories
            </p>
            <p className="text-xl font-bold text-slate-900">{labs.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total capacity
            </p>
            <p className="text-xl font-bold text-slate-900">
              {formatNumber(totalCapacity)} seats
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Assigned assets
            </p>
            <p className="text-xl font-bold text-slate-900">{formatNumber(totalAssets)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search laboratory, code, building, or room…"
          className="max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FlaskConical}
            title={query ? 'No laboratories matched' : 'No laboratories yet'}
            description={
              query
                ? 'Try a different search term.'
                : 'Add the computer laboratories and facilities where assets are installed.'
            }
            action={
              canWrite && !query ? (
                <button type="button" className="btn-primary" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add laboratory
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lab, index) => (
            <div key={lab.id} className="card overflow-hidden transition hover:shadow-md">
              <div
                className={`flex items-start gap-3 bg-gradient-to-br ${
                  ACCENTS[index % ACCENTS.length]
                } p-5 text-white`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug">{lab.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/70">{lab.code}</p>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                  {lab.asset_count} assets
                </span>
              </div>
              <div className="space-y-3 p-5">
                <p className="line-clamp-2 min-h-10 text-sm text-slate-500">
                  {lab.description || 'No description provided.'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {lab.building || 'No building'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                    {lab.room ? `Room ${lab.room}` : 'No room'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {lab.capacity ? `${lab.capacity} seats` : 'No capacity'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {lab.asset_count} assets
                  </span>
                </div>
                {(canWrite || isAdmin) && (
                  <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                    {canWrite && (
                      <button
                        type="button"
                        className="btn-ghost !px-2.5 !py-1.5 text-xs"
                        onClick={() => {
                          setEditing(lab)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-ghost !px-2.5 !py-1.5 text-xs !text-rose-600 hover:!bg-rose-50"
                        onClick={() => setDeleteTarget(lab)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LabForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        lab={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.name || 'laboratory'}?`}
        description="Laboratories with assets attached cannot be deleted. Reassign those assets first."
        confirmLabel="Delete laboratory"
      />
    </div>
  )
}
