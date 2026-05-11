import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Designer } from '@/types/database'

const RANKS = ['Tier 1', 'Tier 2', 'Tier 3']
const PLATFORMS = ['Clickfunnels', 'GoHighLevel', 'Shopify', 'Wix', 'Wordpress']

interface Props {
  designer: Designer | null   // null = new
  teams: string[]
  onClose: () => void
  onSaved: () => void
}

export default function DesignerModal({ designer, teams, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: designer?.name ?? '',
    email: designer?.email ?? '',
    team: designer?.team ?? '',
    rank: designer?.rank ?? 'Tier 1',
    platform: designer?.platform ?? '',
    notes: designer?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      team: form.team || null,
      rank: form.rank,
      platform: form.platform || null,
      notes: form.notes.trim() || null,
    }
    const { error: err } = designer
      ? await supabase.from('designers').update(payload).eq('id', designer.id)
      : await supabase.from('designers').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
             style={{ borderColor: 'rgb(var(--border))' }}>
          <h2 className="font-display font-bold text-primary">
            {designer ? 'Edit Designer' : 'Add Designer'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Jamaica Daig" />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Email</label>
            <input className="input" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="email@rwds.com" />
          </div>

          {/* Team + Rank row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Team</label>
              <select className="input" value={form.team} onChange={e => set('team', e.target.value)}>
                <option value="">Uncategorized</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Tier</label>
              <select className="input" value={form.rank} onChange={e => set('rank', e.target.value)}>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Primary Platform</label>
            <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">None</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Notes</label>
            <textarea className="input resize-none" rows={3} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : designer ? 'Save Changes' : 'Add Designer'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
