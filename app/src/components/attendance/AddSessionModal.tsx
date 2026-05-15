import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Calendar, StickyNote } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dayName } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  trainingId: string
  trainingName: string
  onClose: () => void
  onSaved: () => void
}

export default function AddSessionModal({ trainingId, trainingName, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!date) return
    setSaving(true)
    const { error } = await supabase.from('training_sessions').insert({
      training_id: trainingId,
      session_date: date,
      day_of_week: dayName(date),
      notes: notes.trim() || null,
    })
    if (error) {
      toast.error(error.message)
      setSaving(false)
    } else {
      toast.success('Session added')
      onSaved()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="modal-glass rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-primary text-sm">Add Session</h2>
              <p className="text-[10px] text-muted-c truncate max-w-[180px]">{trainingName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
              Session Date
            </label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            {date && (
              <p className="text-[10px] text-orange-500 px-1 font-semibold">
                {dayName(date)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
              Notes (optional)
            </label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-4 h-4 text-muted-c" />
              <textarea
                className="input pl-10 min-h-[80px] resize-none"
                placeholder="e.g. Focus on Shopify checkout flows…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button className="btn-ghost flex-1 h-10" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary flex-1 h-10"
              onClick={handleSave}
              disabled={saving || !date}
            >
              {saving ? 'Adding…' : 'Add Session'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
