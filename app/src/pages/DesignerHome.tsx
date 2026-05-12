import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Zap, Calendar, Star, Trophy, Clock,
  ArrowRight, Flame, Target, MessageSquare, Link
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn, fmtD, pct, initials } from '@/lib/utils'

export default function DesignerHome() {
  const { state, dispatch, loadAll } = useApp()
  const { trainings, enrollments, sessions, attendance, designerSkills } = state

  const myDesigner = state.designer

  const myEnrollments = useMemo(() =>
    enrollments.filter(e => e.designer_id === myDesigner?.id),
  [enrollments, myDesigner])

  const myActiveTrainings = useMemo(() => {
    const ids = new Set(myEnrollments.map(e => e.training_id))
    return trainings.filter(t => ids.has(t.id) && t.status !== 'completed')
  }, [trainings, myEnrollments])

  const mySkills = useMemo(() =>
    designerSkills.filter(s => s.designer_id === myDesigner?.id),
  [designerSkills, myDesigner])

  // Hands-On trainings with a checklist that need an output submission
  const myOutputTrainings = useMemo(() => {
    const ids = new Set(myEnrollments.map(e => e.training_id))
    return trainings
      .filter(t =>
        ids.has(t.id) &&
        t.type === 'Hands-On' &&
        (t.checklist?.length ?? 0) > 0 &&
        (t.status === 'active' || t.status === 'completed')
      )
      .map(t => ({ training: t, enrollment: myEnrollments.find(e => e.training_id === t.id)! }))
      .filter(x => !!x.enrollment)
  }, [trainings, myEnrollments])

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

  const myAtt = useMemo(() =>
    attendance.filter(a => a.designer_id === myDesigner?.id),
  [attendance, myDesigner])

  // Streak: count consecutive present/late sessions going back from the most recent marked one
  const streak = useMemo(() => {
    if (!myDesigner) return 0
    const enrolledIds = new Set(myEnrollments.map(e => e.training_id))
    const markedSessions = sessions
      .filter(s => enrolledIds.has(s.training_id ?? ''))
      .map(s => {
        const att = myAtt.find(a => a.session_id === s.id)
        return { date: s.session_date, val: att?.is_present ?? null }
      })
      .filter(x => x.val !== null)
      .sort((a, b) => b.date.localeCompare(a.date))

    let count = 0
    for (const { val } of markedSessions) {
      if (val === 'true' || val === 'late') count++
      else break
    }
    return count
  }, [myEnrollments, sessions, myAtt, myDesigner])

  // Real upcoming sessions from enrolled trainings
  const upcomingSessions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const enrolledIds = new Set(myEnrollments.map(e => e.training_id))
    return sessions
      .filter(s => enrolledIds.has(s.training_id ?? '') && s.session_date >= today)
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
      .slice(0, 3)
      .map(s => ({ ...s, training: trainings.find(t => t.id === s.training_id) }))
  }, [sessions, myEnrollments, trainings])

  if (!myDesigner) return (
    <div className="p-12 text-center text-muted-c italic">
      Designer record not found. Please contact an admin.
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="relative p-8 rounded-[2rem] overflow-hidden bg-surface-2 border border-border">
        <div className="absolute inset-0 bg-orange-glow opacity-10" />
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Target className="w-48 h-48 text-orange-500" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-orange-gradient flex items-center justify-center text-2xl font-bold text-white shadow-orange-md">
            {initials(myDesigner.name)}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-extrabold text-primary tracking-tight">
              Welcome back, {myDesigner.name.split(' ')[0]}!
            </h1>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="badge badge-orange uppercase text-[10px]">{myDesigner.team || 'Unassigned'} Team</span>
              <span className="badge badge-blue uppercase text-[10px]">{myDesigner.rank} Designer</span>
              {streak > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold">
                  <Flame className="w-3 h-3 fill-orange-500" /> {streak} SESSION STREAK
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Roadmap */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" /> My Active Roadmap
            </h3>
            <button
              onClick={() => dispatch({ type: 'SET_PAGE', payload: 'roadmap' })}
              className="text-[10px] font-bold text-orange-500 uppercase hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myActiveTrainings.length === 0 ? (
              <div className="col-span-full py-12 text-center card border-dashed">
                <p className="text-sm text-muted-c">No active trainings on your roadmap.</p>
              </div>
            ) : (
              myActiveTrainings.map(t => {
                const mySess = sessions.filter(s => s.training_id === t.id)
                const myAttForT = myAtt.filter(a => mySess.some(ms => ms.id === a.session_id))
                const present = myAttForT.filter(a => a.is_present === 'true' || a.is_present === 'late').length
                const total = mySess.length
                const progress = pct(present, total)
                const isHandsOn = t.type === 'Hands-On'

                return (
                  <div key={t.id} className="card p-5 group cursor-pointer hover:border-orange-500/30 transition-all"
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'roadmap' })}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        isHandsOn ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-500'
                      )}>
                        {isHandsOn ? <Zap className="w-5 h-5 fill-current" /> : <MessageSquare className="w-5 h-5" />}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-primary">{progress}%</div>
                        <div className="text-[9px] text-muted-c uppercase">Progress</div>
                      </div>
                    </div>
                    <h4 className="font-display font-bold text-primary mb-1 truncate">{t.name}</h4>
                    <p className="text-[10px] text-muted-c uppercase tracking-widest mb-4">{t.platform || t.topic || 'General'}</p>
                    <div className="progress-track h-1.5">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-muted-c">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtD(t.target_date)}</div>
                      <div className="flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                        Details <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Submit Output */}
          {myOutputTrainings.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                <Link className="w-4 h-4 text-blue-400" /> Submit Your Output
              </h3>
              <div className="space-y-3">
                {myOutputTrainings.map(({ training: t, enrollment }) => {
                  const saved = enrollment.output_url ?? ''
                  const current = outputUrls[enrollment.id] ?? saved
                  const isSubmitted = !!saved
                  return (
                    <div key={t.id} className="card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-primary">{t.name}</div>
                          <div className="text-[10px] text-muted-c uppercase tracking-widest">{t.platform}</div>
                        </div>
                        <span className={cn('badge text-[10px]', isSubmitted ? 'badge-emerald' : 'badge-amber')}>
                          {isSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          className="input h-9 flex-1 text-xs"
                          placeholder="Paste your output link here…"
                          value={current}
                          onChange={e => setOutputUrls(prev => ({ ...prev, [enrollment.id]: e.target.value }))}
                        />
                        <button
                          className="btn-primary h-9 px-4 text-xs shrink-0"
                          onClick={() => submitOutput(enrollment.id)}
                          disabled={savingOutput === enrollment.id || !current.trim()}
                        >
                          {savingOutput === enrollment.id ? 'Saving…' : isSubmitted ? 'Update' : 'Submit'}
                        </button>
                      </div>
                      {t.checklist && t.checklist.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {t.checklist.map((item, i) => (
                            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-border text-[10px] text-muted-c">
                              <div className="w-2 h-2 rounded-sm border border-muted-c/40" />
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Achievements */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2 px-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Recent Achievements
            </h3>
            <div className="flex flex-wrap gap-4">
              {mySkills.length === 0 ? (
                <div className="w-full py-8 text-center card border-dashed">
                  <p className="text-sm text-muted-c">Complete trainings to earn badges.</p>
                </div>
              ) : (
                mySkills.slice(0, 6).map(s => (
                  <div key={s.id} className="card p-3 flex flex-col items-center gap-2 w-24 text-center">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg',
                      s.level === 'Expert' ? 'bg-orange-gradient' : s.level === 'Advanced' ? 'bg-blue-600' : 'bg-slate-600'
                    )}>
                      <Star className={cn('w-6 h-6', s.level === 'Expert' ? 'fill-white' : '')} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-primary truncate w-full">{s.platform}</div>
                      <div className="text-[8px] font-bold text-muted-c uppercase tracking-tighter">{s.level}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Sessions */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> Next Sessions
            </h3>
            {upcomingSessions.length === 0 ? (
              <p className="text-xs text-muted-c italic py-4 text-center">No upcoming sessions.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(s => {
                  const isHandsOn = s.training?.type === 'Hands-On'
                  const [, month, day] = s.session_date.split('-')
                  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-border-subtle hover:border-orange-500/20 transition-all">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold shrink-0',
                        isHandsOn ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-500'
                      )}>
                        <span className="text-[9px] leading-none uppercase">{monthNames[parseInt(month, 10) - 1]}</span>
                        <span className="text-sm leading-none">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-primary truncate">{s.training?.name ?? '—'}</div>
                        <div className="text-[9px] text-muted-c uppercase">{s.day_of_week}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-5 overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <TrendingUp className="w-24 h-24" />
            </div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-c uppercase mb-1">
                  <span>Attendance Rate</span>
                  <span className="text-primary">
                    {pct(myAtt.filter(a => a.is_present === 'true' || a.is_present === 'late').length, myAtt.length)}%
                  </span>
                </div>
                <div className="progress-track h-1">
                  <div className="progress-fill" style={{ width: `${pct(myAtt.filter(a => a.is_present === 'true' || a.is_present === 'late').length, myAtt.length)}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-[10px] font-bold text-muted-c uppercase">Earned Skills</div>
                <div className="text-sm font-bold text-primary">{mySkills.length}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-muted-c uppercase">Active Enrolled</div>
                <div className="text-sm font-bold text-primary">{myActiveTrainings.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}
