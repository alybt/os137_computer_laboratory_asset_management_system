import { useEffect, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { api } from '../lib/api'
import { daysFromNow } from '../lib/format'
import { Modal, Spinner } from './ui'
import { useToast } from '../context/ToastContext'

const EMPTY = {
  asset_id: '',
  borrower_name: '',
  borrower_email: '',
  department: '',
  purpose: '',
  due_date: '',
  notes: '',
}

export default function AssignmentForm({
  open,
  onClose,
  assignment = null,
  assets = [],
  preselectedAssetId = '',
  onSaved,
}) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (assignment) {
      setForm({
        asset_id: String(assignment.asset_id),
        borrower_name: assignment.borrower_name || '',
        borrower_email: assignment.borrower_email || '',
        department: assignment.department || '',
        purpose: assignment.purpose || '',
        due_date: assignment.due_date || '',
        notes: assignment.notes || '',
      })
    } else {
      setForm({
        ...EMPTY,
        asset_id: preselectedAssetId ? String(preselectedAssetId) : '',
        due_date: daysFromNow(7),
      })
    }
  }, [open, assignment, preselectedAssetId])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      borrower_name: form.borrower_name.trim(),
      borrower_email: form.borrower_email.trim() || null,
      department: form.department.trim() || null,
      purpose: form.purpose.trim() || null,
      due_date: form.due_date || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (assignment) {
        await api.patch(`/assignments/${assignment.id}`, payload)
        toast.success('Assignment updated')
      } else {
        await api.post('/assignments', {
          ...payload,
          asset_id: Number(form.asset_id),
        })
        toast.success('Asset issued successfully')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedAsset = assignment
    ? { asset_tag: assignment.asset_tag, name: assignment.asset_name }
    : assets.find((asset) => String(asset.id) === String(form.asset_id))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignment ? 'Edit assignment' : 'Issue an asset'}
      description={
        assignment
          ? `Update the check-out details for ${assignment.asset_tag}.`
          : 'Record who is borrowing an asset and when it is due back.'
      }
      icon={ArrowLeftRight}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="assignment-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : assignment ? 'Save changes' : 'Issue asset'}
          </button>
        </>
      }
    >
      <form id="assignment-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {assignment ? (
          <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Asset
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {selectedAsset?.asset_tag} · {selectedAsset?.name}
            </p>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="asset_id">
              Asset to issue *
            </label>
            <select
              id="asset_id"
              required
              className="select"
              value={form.asset_id}
              onChange={(event) => update('asset_id', event.target.value)}
            >
              <option value="">Select an available asset…</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} — {asset.name}
                  {asset.laboratory_name ? ` (${asset.laboratory_name})` : ''}
                </option>
              ))}
            </select>
            {assets.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No available assets right now. Return an asset or add new inventory first.
              </p>
            )}
            {selectedAsset && (
              <p className="mt-1.5 text-xs text-slate-400">
                {selectedAsset.category_name || 'Uncategorized'} ·{' '}
                {selectedAsset.laboratory_name || 'Unassigned'}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="borrower_name">
              Borrower name *
            </label>
            <input
              id="borrower_name"
              required
              className="input"
              value={form.borrower_name}
              onChange={(event) => update('borrower_name', event.target.value)}
              placeholder="Prof. Ana Reyes"
            />
          </div>
          <div>
            <label className="label" htmlFor="borrower_email">
              Email
            </label>
            <input
              id="borrower_email"
              type="email"
              className="input"
              value={form.borrower_email}
              onChange={(event) => update('borrower_email', event.target.value)}
              placeholder="ana.reyes@university.edu"
            />
          </div>
          <div>
            <label className="label" htmlFor="department">
              Department / office
            </label>
            <input
              id="department"
              className="input"
              value={form.department}
              onChange={(event) => update('department', event.target.value)}
              placeholder="College of Computer Studies"
            />
          </div>
          <div>
            <label className="label" htmlFor="due_date">
              Due date
            </label>
            <input
              id="due_date"
              type="date"
              className="input"
              value={form.due_date}
              onChange={(event) => update('due_date', event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="purpose">
            Purpose
          </label>
          <input
            id="purpose"
            className="input"
            value={form.purpose}
            onChange={(event) => update('purpose', event.target.value)}
            placeholder="Faculty workstation for consultation hours"
          />
        </div>

        <div>
          <label className="label" htmlFor="assignment_notes">
            Notes
          </label>
          <textarea
            id="assignment_notes"
            rows={3}
            className="input resize-none"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            placeholder="Accessories included, condition on release…"
          />
        </div>
      </form>
    </Modal>
  )
}
