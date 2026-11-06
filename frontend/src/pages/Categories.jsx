import { useCallback, useEffect, useState } from 'react'
import { Boxes, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
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

const EMPTY = { name: '', description: '', color: '#6366f1' }

const COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#ef4444',
  '#64748b',
]

function CategoryForm({ open, onClose, category, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      category
        ? {
            name: category.name || '',
            description: category.description || '',
            color: category.color || '#6366f1',
          }
        : EMPTY,
    )
  }, [open, category])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
    }
    try {
      if (category) {
        await api.patch(`/categories/${category.id}`, payload)
        toast.success('Category updated')
      } else {
        await api.post('/categories', payload)
        toast.success('Category added')
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
      title={category ? 'Edit category' : 'Add a category'}
      description={
        category
          ? `Update the ${category.name} category.`
          : 'Group similar laboratory assets together.'
      }
      icon={Tags}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="category-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : category ? 'Save changes' : 'Add category'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="category_name">
            Category name *
          </label>
          <input
            id="category_name"
            required
            className="input"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Desktop Computers"
          />
        </div>
        <div>
          <label className="label" htmlFor="category_description">
            Description
          </label>
          <textarea
            id="category_description"
            rows={3}
            className="input resize-none"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="What kinds of assets belong in this category?"
          />
        </div>
        <div>
          <span className="label">Color</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => update('color', color)}
                className={`h-9 w-9 rounded-full transition ${
                  form.color === color
                    ? 'ring-2 ring-slate-900 ring-offset-2'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Use color ${color}`}
              />
            ))}
            <label className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
              Custom
              <input
                type="color"
                value={form.color}
                onChange={(event) => update('color', event.target.value)}
                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const { isAdmin, canWrite } = useAuth()
  const toast = useToast()
  const [categories, setCategories] = useState([])
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
      setCategories(await api.get('/categories'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = categories.filter((category) => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return [category.name, category.description]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term))
  })

  const totalAssets = categories.reduce(
    (sum, category) => sum + category.asset_count,
    0,
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/categories/${deleteTarget.id}`)
      toast.success('Category deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingBlock label="Loading categories…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize assets into meaningful groups for faster reporting."
        actions={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add category
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search categories…"
          className="w-full max-w-md"
        />
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
            {categories.length} categories
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
            {formatNumber(totalAssets)} categorized assets
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Tags}
            title={query ? 'No categories matched' : 'No categories yet'}
            description={
              query
                ? 'Try a different search term.'
                : 'Create categories to group desktops, laptops, printers, and more.'
            }
            action={
              canWrite && !query ? (
                <button type="button" className="btn-primary" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add category
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((category) => (
            <div
              key={category.id}
              className="card group relative overflow-hidden p-5 transition hover:shadow-md"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: category.color }}
                >
                  <Tags className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-slate-900">{category.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500">
                    {category.description || 'No description provided.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Boxes className="h-3.5 w-3.5" />
                  {category.asset_count} asset{category.asset_count === 1 ? '' : 's'}
                </span>
                {(canWrite || isAdmin) && (
                  <div className="flex items-center gap-1">
                    {canWrite && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          setEditing(category)
                          setFormOpen(true)
                        }}
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleteTarget(category)}
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.name || 'category'}?`}
        description="Categories with assets attached cannot be deleted. Reassign those assets first."
        confirmLabel="Delete category"
      />
    </div>
  )
}
