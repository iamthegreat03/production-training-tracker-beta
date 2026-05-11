import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Clock, MessageSquare, Undo2 } from 'lucide-react'
import { cn, initials, pct, normAtt } from '@/lib/utils'
import type { Designer, Attendance, TrainingSession, AttendanceValue } from '@/types/database'

interface Props {
  designer: Designer
  attendance: Attendance | null
  allAttendance: Attendance[]
  sessions: TrainingSession[]
  scheduledSessionIds: Set<string>
  onMark: (val: AttendanceValue) => void
  onSaveNotes: (note: string) => Promise<void>
  index: number
}

export default function AttendanceCard({
  designer, attendance, allAttendance, sessions, scheduledSessionIds,
  onMark, onSaveNotes, index,
}: Props) {
  const currentVal = normAtt(attendance?.is_present)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState(attendance?.notes ?? '')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    setNoteText(attendance?.notes ?? '')
  }, [attendance?.notes])

  const myPresent = allAttendance.filter(a => normAtt(a.is_present) === 'true' || normAtt(a.is_present) === 'late').length
  const myMarked = allAttendance.filter(a => normAtt(a.is_present) !== null).length
  const rate = pct(myPresent, myMarked)
  const hasNotes = !!attendance?.notes

  async function handleSaveNote() {
    setSavingNote(true)
    await onSaveNotes(noteText)
    setSavingNote(false)
    setShowNotes(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          'card p-4 flex flex-col gap-3 group relative overflow-hidden transition-all duration-300',
          currentVal === 'true' && 'border-emerald-500/30 bg-emerald-500/[0.02]',
          currentVal === 'late' && 'border-amber-500/30 bg-amber-500/[0.02]',
          currentVal === 'false' && 'border-red-500/30 bg-red-500/[0.02]'
        )}
      >
        {/* Designer Info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
              {initials(designer.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-primary truncate leading-tight">{designer.name}</div>
              <div className="text-[10px] text-muted-c font-medium uppercase tracking-tighter mt-0.5">{designer.team || 'Uncategorized'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNotes(true)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                hasNotes
                  ? 'text-orange-500 bg-orange-500/10'
                  : 'text-muted-c hover:text-orange-500 opacity-0 group-hover:opacity-100'
              )}
              title={hasNotes ? 'View/edit output notes' : 'Add output notes'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <div className="text-right">
              <div className="text-xs font-bold text-orange-500 leading-none">{rate}%</div>
              <div className="text-[9px] text-muted-c uppercase tracking-widest mt-1">Rate</div>
            </div>
          </div>
        </div>

        {/* Marking Actions */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMark('true') }}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-all',
              currentVal === 'true' ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 shadow-lg' : 'bg-surface-2 border-border text-muted-c hover:border-emerald-500/40'
            )}
          >
            <Check className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Present</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onMark('late') }}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-all',
              currentVal === 'late' ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/20 shadow-lg' : 'bg-surface-2 border-border text-muted-c hover:border-amber-500/40'
            )}
          >
            <Clock className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Late</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onMark('false') }}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-all',
              currentVal === 'false' ? 'bg-red-500 border-red-400 text-white shadow-red-500/20 shadow-lg' : 'bg-surface-2 border-border text-muted-c hover:border-red-500/40'
            )}
          >
            <X className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Absent</span>
          </button>
        </div>

        {/* Heatmap — all sessions; gray = not scheduled, dim white = scheduled/unmarked */}
        <div className="flex flex-wrap gap-1.5 mt-1 px-1">
          {sessions.map(s => {
            const att = allAttendance.find(a => a.session_id === s.id)
            const val = normAtt(att?.is_present)
            const scheduled = scheduledSessionIds.has(s.id)
            return (
              <div
                key={s.id}
                title={scheduled ? s.session_date : `${s.session_date} (not scheduled)`}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-500',
                  !scheduled
                    ? 'bg-slate-400/[0.06]'
                    : val === 'true'  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : val === 'late'  ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                    : val === 'false' ? 'bg-red-500 shadow-sm shadow-red-500/50'
                    : 'bg-slate-400/40'
                )}
              />
            )
          })}
        </div>

        {currentVal !== null && (
          <button
            onClick={(e) => { e.stopPropagation(); onMark(null) }}
            className="absolute bottom-2 right-2 p-1 text-muted-c hover:text-primary transition-colors"
          >
            <Undo2 className="w-3 h-3" />
          </button>
        )}
      </motion.div>

      {/* Output Notes Modal */}
      <AnimatePresence>
        {showNotes && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowNotes(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-primary">{designer.name}</h3>
                  <p className="text-xs text-muted-c mt-0.5">Output / Progress Notes</p>
                </div>
                <button onClick={() => setShowNotes(false)} className="p-1.5 rounded-lg text-muted-c hover:text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                className="input resize-none w-full"
                rows={4}
                placeholder="What did this designer work on or produce this session?"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setShowNotes(false)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleSaveNote} disabled={savingNote}>
                  {savingNote ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
