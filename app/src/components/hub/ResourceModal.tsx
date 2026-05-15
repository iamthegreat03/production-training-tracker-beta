import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, Copy, Check, Pencil, BookOpen } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { HubResource, HubCategory } from '@/types/database'
import { getResourceIcon, ICON_OPTIONS, CATEGORY_META } from './ResourceCard'

type ModalMode = 'view' | 'edit' | 'create'

interface ResourceModalProps {
  resource: HubResource | null
  mode: ModalMode
  defaultCategory: HubCategory
  canManage: boolean
  onClose: () => void
  onEdit: () => void
}

const CATEGORIES: { value: HubCategory; label: string }[] = [
  { value: 'learn',       label: 'Learn'       },
  { value: 'assets',      label: 'Assets'      },
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'code',        label: 'Code'        },
]

const BLANK = (category: HubCategory) => ({
  category,
  title: '',
  description: '',
  icon_name: 'BookOpen',
  thumbnail_url: '',
  content: '',
  language: '',
  external_url: '',
  tags: '',
})

export default function ResourceModal({ resource, mode, defaultCategory, canManage, onClose, onEdit }: ResourceModalProps) {
  const { loadAll, state } = useApp()
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState(BLANK(defaultCategory))

  useEffect(() => {
    if (mode === 'create') {
      setForm(BLANK(defaultCategory))
    } else if (resource && (mode === 'edit' || mode === 'view')) {
      setForm({
        category: resource.category,
        title: resource.title,
        description: resource.description ?? '',
        icon_name: resource.icon_name ?? 'BookOpen',
        thumbnail_url: resource.thumbnail_url ?? '',
        content: resource.content ?? '',
        language: resource.language ?? '',
        external_url: resource.external_url ?? '',
        tags: resource.tags?.join(', ') ?? '',
      })
    }
  }, [resource, mode, defaultCategory])

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const payload = {
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      icon_name: form.icon_name || 'BookOpen',
      thumbnail_url: form.thumbnail_url.trim() || null,
      content: form.content.trim() || null,
      language: form.language.trim() || null,
      external_url: form.external_url.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      created_by: state.user?.id ?? null,
    }

    if (mode === 'create') {
      const { error } = await supabase.from('hub_resources').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Resource added')
    } else if (mode === 'edit' && resource) {
      const { error } = await supabase.from('hub_resources').update(payload).eq('id', resource.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Resource updated')
    }

    await loadAll()
    setSaving(false)
    onClose()
  }

  function handleCopy() {
    if (!resource?.content) return
    navigator.clipboard.writeText(resource.content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const isEditing = mode === 'edit' || mode === 'create'
  const meta = CATEGORY_META[form.category as HubCategory] ?? CATEGORY_META.learn
  const Icon = getResourceIcon(form.icon_name)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        className="modal-glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {!isEditing && (
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', meta.bg)}>
                <Icon className={cn('w-4 h-4', meta.color)} />
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-primary text-sm">
                {mode === 'create' ? 'Add Resource' : mode === 'edit' ? 'Edit Resource' : resource?.title}
              </h2>
              {!isEditing && (
                <span className={cn('text-[10px] font-bold uppercase tracking-widest', meta.color)}>
                  {meta.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && canManage && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-c hover:text-orange-500 hover:bg-orange-500/10 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-xl btn-ghost text-muted-c">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <EditForm form={form} set={set} saving={saving} mode={mode} meta={meta} Icon={Icon} />
          ) : (
            <ViewContent resource={resource!} copied={copied} onCopy={handleCopy} />
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
            <button className="btn-ghost flex-1 h-10" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary flex-1 h-10" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Add Resource' : 'Save Changes'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── View Mode ──────────────────────────────────────────────────────────────────

function ViewContent({ resource, copied, onCopy }: {
  resource: HubResource
  copied: boolean
  onCopy: () => void
}) {
  const meta = CATEGORY_META[resource.category]

  return (
    <div className="p-6 space-y-5">
      {/* Description */}
      {resource.description && (
        <p className="text-sm text-secondary leading-relaxed">{resource.description}</p>
      )}

      {/* Thumbnail */}
      {resource.thumbnail_url && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={resource.thumbnail_url} alt={resource.title} className="w-full object-cover max-h-64" />
        </div>
      )}

      {/* Content */}
      {resource.content && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">
            {resource.category === 'code' ? `Code ${resource.language ? `· ${resource.language}` : ''}` : 'Content'}
          </div>
          {resource.category === 'code' ? (
            <div className="relative group">
              <pre
                className="rounded-xl p-4 text-xs font-mono text-secondary overflow-x-auto leading-relaxed"
                style={{ background: 'rgb(var(--surface-2))' }}
              >
                {resource.content}
              </pre>
              <button
                onClick={onCopy}
                className={cn(
                  'absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-surface opacity-0 group-hover:opacity-100 text-muted-c hover:text-primary border border-border',
                )}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <div
              className="text-sm text-secondary leading-relaxed whitespace-pre-wrap rounded-xl p-4 border border-border"
              style={{ background: 'rgb(var(--surface-2))' }}
            >
              {resource.content}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resource.tags.map(tag => (
            <span key={tag} className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide', meta.bg, meta.color)}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* External URL */}
      {resource.external_url && (
        <a
          href={resource.external_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-sm font-bold text-primary hover:bg-surface-2 hover:border-orange-500/30 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          {resource.category === 'assets' ? 'Download / Open Asset' : 'Open External Link'}
        </a>
      )}

      {/* Standalone copy button when no inline copy (non-code) */}
      {resource.category === 'code' && resource.content && !resource.content && (
        <button
          onClick={onCopy}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-400 hover:bg-emerald-500/15 transition-all"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      )}
    </div>
  )
}

// ── Edit / Create Form ─────────────────────────────────────────────────────────

function EditForm({ form, set, saving, mode, meta, Icon }: {
  form: ReturnType<typeof BLANK>
  set: (key: string, value: string) => void
  saving: boolean
  mode: ModalMode
  meta: typeof CATEGORY_META.learn
  Icon: React.FC<any>
}) {
  const isCode = form.category === 'code'

  return (
    <div className="p-6 space-y-4">
      {/* Category + Icon row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Category</label>
          <select
            className="input text-sm"
            value={form.category}
            onChange={e => set('category', e.target.value)}
            disabled={saving}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Icon</label>
          <div className="flex gap-2">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
              <Icon className={cn('w-4 h-4', meta.color)} />
            </div>
            <select
              className="input text-sm flex-1"
              value={form.icon_name}
              onChange={e => set('icon_name', e.target.value)}
              disabled={saving || isCode}
            >
              {ICON_OPTIONS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Title <span className="text-red-400">*</span></label>
        <input
          className="input"
          placeholder="Resource title…"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          disabled={saving}
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Description</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="Brief summary of this resource…"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          disabled={saving}
        />
      </div>

      {/* External URL */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">
          External URL <span className="text-muted-c/60 normal-case font-medium">(optional)</span>
        </label>
        <input
          className="input"
          placeholder="https://…"
          value={form.external_url}
          onChange={e => set('external_url', e.target.value)}
          disabled={saving}
        />
      </div>

      {/* Thumbnail (not for code) */}
      {!isCode && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">
            Thumbnail URL <span className="text-muted-c/60 normal-case font-medium">(optional image URL)</span>
          </label>
          <input
            className="input"
            placeholder="https://…"
            value={form.thumbnail_url}
            onChange={e => set('thumbnail_url', e.target.value)}
            disabled={saving}
          />
        </div>
      )}

      {/* Language (code only) */}
      {isCode && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Language</label>
          <input
            className="input"
            placeholder="javascript, css, html, tsx…"
            value={form.language}
            onChange={e => set('language', e.target.value)}
            disabled={saving}
          />
        </div>
      )}

      {/* Content */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">
          {isCode ? 'Code Snippet' : 'Content'} <span className="text-muted-c/60 normal-case font-medium">(optional)</span>
        </label>
        <textarea
          className={cn('input resize-none', isCode && 'font-mono text-xs')}
          rows={isCode ? 8 : 4}
          placeholder={isCode ? '// Paste your code here…' : 'Additional content or notes…'}
          value={form.content}
          onChange={e => set('content', e.target.value)}
          disabled={saving}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">
          Tags <span className="text-muted-c/60 normal-case font-medium">(comma-separated)</span>
        </label>
        <input
          className="input"
          placeholder="figma, layout, responsive…"
          value={form.tags}
          onChange={e => set('tags', e.target.value)}
          disabled={saving}
        />
      </div>
    </div>
  )
}
