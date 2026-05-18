import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { ExtTraining, ExtTrainingStatus } from '@/types/database'

const STATUSES: { value: ExtTrainingStatus; label: string; desc: string }[] = [
  { value: 'requested',  label: 'Requested',  desc: 'Pending confirmation' },
  { value: 'scheduled',  label: 'Scheduled',  desc: 'Date set, not started' },
  { value: 'completed',  label: 'Completed',  desc: 'All sessions done' },
  { value: 'cancelled',  label: 'Cancelled',  desc: 'No longer proceeding' },
]

const DEPT_SUGGESTIONS = [
  'Sales', 'Marketing', 'Compliance', 'Human Resources',
  'Finance', 'Operations', 'IT / Tech', 'Legal',
  'Customer Service', 'Executive',
]

interface Props {
  training: ExtTraining | null
  onClose: () => void
  onSaved: () => void
}

export default function ExtTrainingModal({ training, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(training?.title ?? '')
  const [department, setDepartment] = useState(training?.department ?? '')
  const [topic, setTopic] = useState(training?.topic ?? '')
  const [requestedBy, setRequestedBy] = useState(training?.requested_by ?? '')
  const [facilitator, setFacilitator] = useState(training?.facilitator ?? '')
  const [status, setStatus] = useState<ExtTrainingStatus>(training?.status ?? 'requested')
  const [notes, setNotes] = useState(training?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    if (!department.trim()) { setError('Department is required'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: title.trim(),
        department: department.trim(),
        topic: topic.trim() || null,
        requested_by: requestedBy.trim() || null,
        facilitator: facilitator.trim() || null,
        status,
        notes: notes.trim() || null,
      }
      const { error: err } = training
        ? await supabase.from('ext_trainings').update(payload).eq('id', training.id)
        : await supabase.from('ext_trainings').insert(payload)
      if (err) setError(err.message)
      else { onSaved(); onClose() }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="modal-glass rounded-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display font-bold text-primary leading-none">
              {training ? 'Edit Program' : 'Add Training Program'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Program Title</label>
              <input
                className="input w-full"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Product Knowledge: Checkout Flow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Department</label>
              <input
                className="input w-full"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                list="dept-suggestions"
                placeholder="e.g. Sales, Marketing, Compliance…"
              />
              <datalist id="dept-suggestions">
                {DEPT_SUGGESTIONS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                Topic / Agenda <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                className="input w-full"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Payment gateway, returns process…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                  Requested By <span className="normal-case font-normal text-[9px]">(opt.)</span>
                </label>
                <input
                  className="input w-full"
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  placeholder="Name or role"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                  Facilitator <span className="normal-case font-normal text-[9px]">(opt.)</span>
                </label>
                <input
                  className="input w-full"
                  value={facilitator}
                  onChange={e => setFacilitator(e.target.value)}
                  placeholder="Who will lead it"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      status === s.value
                        ? 'border-orange-500 bg-orange-500/8 text-orange-400'
                        : 'border-border bg-surface-2 hover:border-orange-500/30'
                    )}
                  >
                    <div className={cn('text-[10px] font-bold uppercase tracking-widest mb-0.5', status === s.value ? 'text-orange-400' : 'text-primary')}>
                      {s.label}
                    </div>
                    <div className="text-[9px] text-muted-c leading-tight">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                Notes <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                className="input w-full resize-none"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context…"
              />
            </div>

            {error && (
              <div className="text-[10px] text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">{error}</div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-border shrink-0">
          <button className="btn-primary w-full h-11" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : training ? 'Update Program' : 'Add Program'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
