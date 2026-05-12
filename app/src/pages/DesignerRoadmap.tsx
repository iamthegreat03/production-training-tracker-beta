import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, MessageSquare, Calendar, Clock, ChevronRight, Target, StickyNote, Link, ExternalLink, Check } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn, fmtD, fmtDs, pct } from '@/lib/utils'

export default function DesignerRoadmap() {
  const { state, loadAll } = useApp()
  const { designer, trainings, enrollments, sessions, attendance } = state

  const [outputUrls, setOutputUrls] = useState<Record<string, string>>({})
  const [savingOutput, setSavingOutput] = useState<string | null>(null)

  async function submitOutput(enrollmentId: string) {
    const url = (outputUrls[enrollmentId] ?? '').trim()
    setSavingOutput(enrollmentId)
    const { error } = await supabase
      .from('training_enrollments')
      .update({ output_url: url || null })
      .eq('id', enrollmentId)
    setSavingOutput(null)
    if (error) { toast.error('Failed to save link'); return }
    toast.success('Output link saved!')
    await loadAll()
  }

  const myEnrollments = useMemo(() =>
    enrollments.filter(e => e.designer_id === designer?.id),
  [enrollments, designer])

  const myTrainings = useMemo(() => {
    const ids = new Set(myEnrollments.map(e => e.training_id))
    return trainings.filter(t => ids.has(t.id) && t.status !== 'completed')
      .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
  }, [trainings, myEnrollments])

  const today = new Date().toISOString().split('T')[0]

  if (!designer) return null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title font-display">My Roadmap</h1>
        <p className="page-subtitle">Active and upcoming training programs</p>
      </div>

      {myTrainings.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center border-dashed">
          <Target className="w-10 h-10 mx-auto mb-3 text-muted-c opacity-40" />
          <p className="text-muted-c">You have no active trainings.</p>
          <p className="text-xs text-muted-c mt-1">Ask your trainer to enroll you in a program.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myTrainings.map((t, i) => {
            const enrollment = myEnrollments.find(e => e.training_id === t.id)
            const tSessions = sessions.filter(s => s.training_id === t.id).sort((a, b) => a.session_date.localeCompare(b.session_date))
            const myAtt = attendance.filter(a => a.designer_id === designer.id && tSessions.some(s => s.id === a.session_id))
            const present = myAtt.filter(a => a.is_present === 'true' || a.is_present === 'late').length
            const rate = pct(present, myAtt.filter(a => a.is_present !== null).length)
            const nextSession = tSessions.find(s => s.session_date >= today)
            const sched = enrollment?.designer_schedule ?? []
            const isHandsOn = t.type === 'Hands-On'

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 360, delay: Math.min(i * 0.06, 0.3) }}
                className="card rounded-2xl overflow-hidden"
              >
                {/* Color bar */}
                <div className={cn('h-1', isHandsOn ? 'bg-orange-gradient' : 'bg-gradient-to-r from-purple-600 to-blue-500')} />

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isHandsOn ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-400'
                      )}>
                        {isHandsOn ? <Zap className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-primary">{t.name}</h3>
                        <p className="text-[10px] text-muted-c uppercase tracking-widest mt-0.5">{t.type}</p>
                      </div>
                    </div>
                    <span className={cn('badge text-[10px]', t.status === 'active' ? 'badge-orange' : 'badge-blue')}>
                      {t.status}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-surface-2 rounded-xl p-3 text-center">
                      <div className="font-bold text-orange-500">{rate}%</div>
                      <div className="text-[9px] text-muted-c uppercase tracking-widest mt-0.5">Attendance</div>
                    </div>
                    <div className="bg-surface-2 rounded-xl p-3 text-center">
                      <div className="font-bold text-primary">{tSessions.length}</div>
                      <div className="text-[9px] text-muted-c uppercase tracking-widest mt-0.5">Sessions</div>
                    </div>
                    <div className="bg-surface-2 rounded-xl p-3 text-center">
                      <div className="font-bold text-primary">{present}</div>
                      <div className="text-[9px] text-muted-c uppercase tracking-widest mt-0.5">Attended</div>
                    </div>
                  </div>

                  {/* Next session */}
                  {nextSession && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                      <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-orange-500">Next: </span>
                        <span className="text-xs text-primary">{fmtD(nextSession.session_date)}</span>
                        <span className="text-[10px] text-muted-c ml-2">{nextSession.day_of_week}</span>
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  {sched.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-c" />
                      <span className="text-xs text-muted-c">Your schedule: </span>
                      <div className="flex gap-1">
                        {sched.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-surface-2 text-[10px] font-bold text-primary">
                            {isHandsOn ? s.slice(0, 3) : fmtDs(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Latest trainer note */}
                  {(() => {
                    const latestNote = [...tSessions]
                      .sort((a, b) => b.session_date.localeCompare(a.session_date))
                      .map(s => myAtt.find(a => a.session_id === s.id))
                      .find(a => a?.notes)
                    if (!latestNote?.notes) return null
                    return (
                      <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle space-y-1">
                        <div className="text-[9px] font-bold text-muted-c uppercase tracking-widest flex items-center gap-1">
                          <StickyNote className="w-3 h-3" /> Latest Trainer Note
                        </div>
                        <p className="text-xs text-primary leading-relaxed">{latestNote.notes}</p>
                      </div>
                    )
                  })()}

                  {/* Submit Output — Hands-On with checklist only */}
                  {isHandsOn && (t.checklist?.length ?? 0) > 0 && enrollment && (() => {
                    const saved = enrollment.output_url ?? ''
                    const current = outputUrls[enrollment.id] ?? saved
                    const isSubmitted = !!saved
                    return (
                      <div className="space-y-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                            <Link className="w-3 h-3" /> Submit Output
                          </span>
                          {isSubmitted && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <Check className="w-3 h-3" /> Submitted
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            className="input h-8 flex-1 text-xs"
                            placeholder="Paste your output link here…"
                            value={current}
                            onChange={e => setOutputUrls(prev => ({ ...prev, [enrollment.id]: e.target.value }))}
                          />
                          {isSubmitted && saved && (
                            <a
                              href={saved}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-outline h-8 px-2 text-[10px] font-bold gap-1 flex items-center shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            className="btn-primary h-8 px-3 text-[10px] shrink-0"
                            onClick={() => submitOutput(enrollment.id)}
                            disabled={savingOutput === enrollment.id || !current.trim()}
                          >
                            {savingOutput === enrollment.id ? 'Saving…' : isSubmitted ? 'Update' : 'Submit'}
                          </button>
                        </div>
                        {t.checklist && (
                          <div className="flex flex-wrap gap-1">
                            {t.checklist.map((item, i) => (
                              <span key={i} className="text-[9px] text-muted-c px-1.5 py-0.5 rounded bg-surface-2 border border-border">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Date range */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-c">
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    <span>{fmtD(t.start_date)} {t.target_date ? `→ ${fmtD(t.target_date)}` : ''}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
