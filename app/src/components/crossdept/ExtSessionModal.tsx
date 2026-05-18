import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { today } from '@/lib/utils'
import type { ExtSession } from '@/types/database'

interface Props {
  session: ExtSession | null
  trainingId: string
  onClose: () => void
  onSaved: () => void
}

export default function ExtSessionModal({ session, trainingId, onClose, onSaved }: Props) {
  const [sessionDate, setSessionDate] = useState(session?.session_date ?? today())
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [attendeeCount, setAttendeeCount] = useState(session?.attendee_count ?? 0)
  const [proofUrl, setProofUrl] = useState(session?.proof_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!sessionDate) { setError('Session date is required'); return }
    if (attendeeCount < 0) { setError('Attendee count must be 0 or more'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        training_id: trainingId,
        session_date: sessionDate,
        attendee_count: attendeeCount,
        notes: notes.trim() || null,
        proof_url: proofUrl.trim() || null,
      }
      const { error: err } = session
        ? await supabase.from('ext_sessions').update(payload).eq('id', session.id)
        : await supabase.from('ext_sessions').insert(payload)
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
        className="modal-glass rounded-2xl w-full max-w-sm flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display font-bold text-primary leading-none">
              {session ? 'Edit Session' : 'Log Session'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Session Date</label>
            <input
              type="date"
              className="input w-full"
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
              What Was Discussed <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Introduced checkout flow, handled refund Q&A…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Number of Attendees</label>
            <input
              type="number"
              min={0}
              className="input w-full"
              value={attendeeCount}
              onChange={e => setAttendeeCount(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
              Proof / Recording URL <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="url"
              className="input w-full"
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          {error && (
            <div className="text-[10px] text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">{error}</div>
          )}
        </div>

        <div className="p-5 border-t border-border shrink-0">
          <button className="btn-primary w-full h-11" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : session ? 'Update Session' : 'Log Session'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
