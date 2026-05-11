import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Pencil, Calendar, Clock, Users, Zap,
  MessageSquare, ExternalLink, Trash2, CheckCircle2,
  Plus, PlayCircle, History, Target
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { toast } from 'sonner'
import { cn, fmtD, initials } from '@/lib/utils'
import type { Training, TrainingSession, TrainingEnrollment, Designer } from '@/types/database'

interface Props {
  training: Training
  onClose: () => void
  onEdit: (t: Training) => void
}

export default function TrainingDetail({ training, onClose, onEdit }: Props) {
  const { state, loadAll, can, dispatch } = useApp()
  const { designers, enrollments, sessions, attendance } = state

  const [activeTab, setActiveTab] = useState<'roster' | 'sessions'>('roster')
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)

  const myEnrollments = enrollments.filter(e => e.training_id === training.id)
  const mySessions = sessions.filter(s => s.training_id === training.id)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
  
  const myEnrolledDesigners = myEnrollments.map(e => ({
    ...designers.find(d => d.id === e.designer_id)!,
    schedule: e.designer_schedule
  })).filter(d => !!d.id)

  const isHandsOn = training.type === 'Hands-On'

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this training? All sessions and attendance will be lost.')) return
    setDeleting(true)
    await supabase.from('trainings').delete().eq('id', training.id)
    await loadAll()
    onClose()
  }

  async function handleFinish() {
    if (!confirm('Mark this training as completed? This cannot be undone easily.')) return
    setCompleting(true)
    const { error } = await supabase.from('trainings').update({ status: 'completed' }).eq('id', training.id)
    if (error) { toast.error(error.message); setCompleting(false); return }
    await loadAll()
    setCompleting(false)
    onClose()
  }

  async function goToAttendance() {
    dispatch({ type: 'SET_PAGE', payload: 'attendance' })
    // We'd need to set the active training in context here too, 
    // but the Attendance tab can read from state if we set a 'lastSelectedTraining'
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Banner / Header */}
        <div className="relative h-32 shrink-0 bg-surface-2 overflow-hidden">
          <div className="absolute inset-0 bg-orange-glow opacity-30" />
          <div className="absolute inset-0 bg-grid-dark opacity-10" />
          
          <div className="absolute top-4 right-4 flex gap-2">
            {can('canAddEditTrainings') && (
              <button onClick={() => onEdit(training)} className="p-2 rounded-xl glass hover:bg-orange-500/10 hover:text-orange-500 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl glass hover:text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-4 left-6 flex items-end gap-4">
             <div className={cn(
               'w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg',
               isHandsOn ? 'bg-orange-gradient' : 'bg-purple-gradient bg-purple-600'
             )}>
               {isHandsOn ? <Zap className="w-8 h-8 text-white fill-white" /> : <MessageSquare className="w-8 h-8 text-white" />}
             </div>
             <div className="mb-1">
               <div className="flex gap-2 mb-1">
                 <span className={cn('badge text-[10px]', isHandsOn ? 'badge-orange' : 'badge-purple')}>
                   {training.type}
                 </span>
                 <span className={cn('badge text-[10px]',
                   training.status === 'active' ? 'badge-orange'
                   : training.status === 'completed' ? 'badge-emerald'
                   : training.status === 'on-hold' ? 'badge-amber'
                   : 'badge-blue'
                 )}>
                   {training.status === 'on-hold' ? 'ON HOLD' : training.status.toUpperCase()}
                 </span>
               </div>
               <h2 className="font-display font-bold text-xl text-primary leading-tight">{training.name}</h2>
             </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 border-b border-border bg-surface shrink-0">
          <button
            onClick={() => setActiveTab('roster')}
            className={cn('px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all', activeTab === 'roster' ? 'border-orange-500 text-orange-500' : 'border-transparent text-muted-c hover:text-primary')}
          >
            Roster ({myEnrolledDesigners.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={cn('px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all', activeTab === 'sessions' ? 'border-orange-500 text-orange-500' : 'border-transparent text-muted-c hover:text-primary')}
          >
            Sessions ({mySessions.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface">
          <AnimatePresence mode="wait">
            {activeTab === 'roster' ? (
              <motion.div key="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-surface-2 border border-border">
                       <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Focus
                       </div>
                       <div className="text-sm font-medium text-primary">{training.platform || training.topic || '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-2 border border-border">
                       <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Timeline
                       </div>
                       <div className="text-sm font-medium text-primary">{fmtD(training.start_date)} → {fmtD(training.target_date)}</div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest mb-2 px-1">Enrolled Designers</div>
                    {myEnrolledDesigners.length === 0 ? (
                      <div className="py-8 text-center text-muted-c text-sm italic">No designers enrolled yet.</div>
                    ) : (
                      myEnrolledDesigners.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border-subtle group hover:border-orange-500/20 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[10px] font-bold">
                                 {initials(d.name)}
                              </div>
                              <div>
                                 <div className="text-sm font-medium text-primary">{d.name}</div>
                                 <div className="flex flex-wrap gap-1 mt-1">
                                    {d.schedule?.map(day => (
                                      <span key={day} className="text-[8px] font-bold uppercase tracking-tighter px-1 rounded bg-surface-3 text-muted-c">
                                        {isHandsOn ? day.slice(0, 3) : fmtD(day)}
                                      </span>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500 transition-all">
                              <PlayCircle className="w-4 h-4" />
                           </button>
                        </div>
                      ))
                    )}
                 </div>
              </motion.div>
            ) : (
              <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                 <div className="flex items-center justify-between px-1 mb-2">
                    <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">History Log</div>
                    {can('canAddSessions') && (
                      <button className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1 hover:underline">
                         <Plus className="w-3 h-3" /> Add Manual Session
                      </button>
                    )}
                 </div>
                 {mySessions.length === 0 ? (
                    <div className="py-12 text-center text-muted-c">
                       <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                       <p className="text-sm">No sessions logged yet.</p>
                    </div>
                 ) : (
                   mySessions.map((s, i) => (
                     <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-2 border border-border-subtle">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center font-bold text-orange-500 text-xs">
                           {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-sm font-medium text-primary">{fmtD(s.session_date)}</div>
                           <div className="text-[10px] text-muted-c uppercase tracking-widest">{s.day_of_week}</div>
                        </div>
                        {s.proof_url && (
                          <a href={s.proof_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg glass text-muted-c hover:text-orange-500 transition-colors">
                             <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button className="p-2 rounded-lg hover:bg-orange-500/10 text-orange-500 transition-colors">
                           <ClipboardCheck className="w-4 h-4" />
                        </button>
                     </div>
                   ))
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions Footer */}
        <div className="p-5 bg-surface-2 border-t border-border flex items-center justify-between shrink-0">
           <button
             onClick={handleDelete}
             disabled={deleting}
             className="p-2.5 rounded-xl text-muted-c hover:bg-red-500/10 hover:text-red-400 transition-all"
           >
             <Trash2 className="w-5 h-5" />
           </button>

           <div className="flex gap-2">
              <button onClick={goToAttendance} className="btn-outline h-10 px-6 gap-2">
                 <ClipboardCheck className="w-4 h-4" /> Go to Attendance
              </button>
              {training.status !== 'completed' && can('canAddEditTrainings') && (
                <button className="btn-primary h-10 px-6 gap-2" onClick={handleFinish} disabled={completing}>
                   <CheckCircle2 className="w-4 h-4" /> {completing ? 'Finishing…' : 'Finish & Assess'}
                </button>
              )}
           </div>
        </div>
      </motion.div>
    </div>
  )
}

function ClipboardCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}
