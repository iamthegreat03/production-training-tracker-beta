import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Pencil, Calendar, Users, Zap,
  MessageSquare, ExternalLink, Trash2, CheckCircle2,
  History, Target, ChevronLeft, Check
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { toast } from 'sonner'
import { cn, fmtD, initials, normAtt, pct } from '@/lib/utils'
import type { Training } from '@/types/database'

interface Props {
  training: Training
  onClose: () => void
  onEdit: (t: Training) => void
}

export default function TrainingDetail({ training, onClose, onEdit }: Props) {
  const { state, loadAll, can, dispatch } = useApp()
  const { designers, enrollments, sessions, attendance, designerSkills } = state

  const [activeTab, setActiveTab] = useState<'roster' | 'sessions'>('roster')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showAssessPanel, setShowAssessPanel] = useState(false)
  const [viewOnlyMode, setViewOnlyMode] = useState(false)
  const [assessSelections, setAssessSelections] = useState<Set<string>>(new Set())

  interface AssessEntry { outputUrl: string; results: boolean[] }
  const [assessData, setAssessData] = useState<Record<string, AssessEntry>>({})

  const myEnrollments = enrollments.filter(e => e.training_id === training.id)
  const isAssessed = myEnrollments.some(e => e.final_score !== null)
  const mySessions = sessions.filter(s => s.training_id === training.id)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))

  const mySessIds = useMemo(() => new Set(mySessions.map(s => s.id)), [mySessions])

  const myEnrolledDesigners = myEnrollments.map(e => ({
    ...designers.find(d => d.id === e.designer_id)!,
    schedule: e.designer_schedule
  })).filter(d => !!d.id)

  const isHandsOn = training.type === 'Hands-On'
  const awardPlatform = isHandsOn ? training.platform : `DSG: ${training.name}`
  const awardLevel = isHandsOn ? (training.skill_level ?? 'Intermediate') : 'Completed'
  const trainingChecklist = training.checklist ?? []

  function getAttCount(designerId: string) {
    return attendance.filter(a =>
      mySessIds.has(a.session_id ?? '') &&
      a.designer_id === designerId &&
      (normAtt(a.is_present) === 'true' || normAtt(a.is_present) === 'late')
    ).length
  }

  function getAttScore(did: string): number {
    if (mySessions.length === 0) return 0
    return Math.round((getAttCount(did) / mySessions.length) * 100)
  }

  function getOutputScore(did: string): number {
    if (trainingChecklist.length === 0) return 100
    const results = assessData[did]?.results ?? []
    const passed = results.filter(Boolean).length
    return Math.round((passed / trainingChecklist.length) * 100)
  }

  function getFinalScore(did: string): number {
    const att = getAttScore(did)
    if (trainingChecklist.length === 0) return att
    return Math.round(att * 0.4 + getOutputScore(did) * 0.6)
  }

  function toggleResult(did: string, idx: number) {
    setAssessData(prev => {
      const entry = prev[did] ?? { outputUrl: '', results: trainingChecklist.map(() => false) }
      const results = [...entry.results]
      results[idx] = !results[idx]
      return { ...prev, [did]: { ...entry, results } }
    })
  }

  function openAssessPanel() {
    if (isHandsOn && !training.platform) {
      toast.error('Training has no platform configured — edit the training first')
      return
    }
    const preSelected = new Set(
      myEnrolledDesigners.filter(d => getAttCount(d.id) > 0).map(d => d.id)
    )
    setAssessSelections(preSelected)
    const cl = training.checklist ?? []
    const initialData: Record<string, AssessEntry> = {}
    myEnrolledDesigners.forEach(d => {
      const enrollment = myEnrollments.find(e => e.designer_id === d.id)
      // Pre-fill output URL from designer's own submission
      initialData[d.id] = {
        outputUrl: enrollment?.output_url ?? '',
        results: (enrollment?.checklist_results as boolean[] | null) ?? cl.map(() => false),
      }
    })
    setAssessData(initialData)
    setShowAssessPanel(true)
  }

  function openViewPanel() {
    const cl = training.checklist ?? []
    const initialData: Record<string, AssessEntry> = {}
    const awarded = new Set<string>()
    myEnrolledDesigners.forEach(d => {
      const enrollment = myEnrollments.find(e => e.designer_id === d.id)
      initialData[d.id] = {
        outputUrl: enrollment?.output_url ?? '',
        results: (enrollment?.checklist_results as boolean[] | null) ?? cl.map(() => false),
      }
      if (enrollment?.final_score !== null && enrollment?.final_score !== undefined) {
        awarded.add(d.id)
      }
    })
    setAssessData(initialData)
    setAssessSelections(awarded)
    setViewOnlyMode(true)
    setShowAssessPanel(true)
  }

  function toggleAssess(id: string) {
    setAssessSelections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllAttendees() {
    const attendedIds = new Set(myEnrolledDesigners.filter(d => getAttCount(d.id) > 0).map(d => d.id))
    setAssessSelections(attendedIds)
  }

  async function handleDelete() {
    setDeleting(true)
    setShowDeleteConfirm(false)
    const { error } = await supabase.from('trainings').delete().eq('id', training.id)
    if (error) {
      toast.error(error.message)
      setDeleting(false)
      return
    }
    await loadAll()
    onClose()
  }

  async function handleAssess() {
    const selectedIds = Array.from(assessSelections)
    if (selectedIds.length === 0) {
      toast.error('No designers selected')
      return
    }
    setCompleting(true)
    try {
      // Save assessment scores + output data to enrollment records
      const cl = training.checklist ?? []
      for (const did of selectedIds) {
        const enrollment = myEnrollments.find(e => e.designer_id === did)
        if (!enrollment) continue
        const data = assessData[did] ?? { outputUrl: '', results: cl.map(() => false) }
        const passed = data.results.filter(Boolean).length
        const outputScore = cl.length > 0 ? Math.round((passed / cl.length) * 100) : 100
        const attCount = getAttCount(did)
        const attScore = mySessions.length > 0 ? Math.round((attCount / mySessions.length) * 100) : 0
        const finalScore = cl.length > 0 ? Math.round(attScore * 0.4 + outputScore * 0.6) : attScore
        await supabase.from('training_enrollments').update({
          output_url: data.outputUrl || null,
          checklist_results: data.results,
          output_score: outputScore,
          attendance_score: attScore,
          final_score: finalScore,
        }).eq('id', enrollment.id)
      }

      const LEVEL_ORDER: Record<string, number> = { Intermediate: 0, Advanced: 1, Expert: 2, Completed: 3 }

      const rowsToUpsert = selectedIds
        .filter(did => {
          const existing = designerSkills.find(s => s.designer_id === did && s.platform === awardPlatform)
          if (!existing) return true
          return (LEVEL_ORDER[awardLevel] ?? 0) > (LEVEL_ORDER[existing.level] ?? 0)
        })
        .map(did => ({
          designer_id: did,
          platform: awardPlatform,
          level: awardLevel,
          source: training.name,
          updated_at: new Date().toISOString(),
        }))

      if (rowsToUpsert.length > 0) {
        const toInsert = rowsToUpsert.filter(r =>
          !designerSkills.some(s => s.designer_id === r.designer_id && s.platform === awardPlatform)
        )
        const toUpdate = rowsToUpsert
          .map(r => ({ ...r, sid: designerSkills.find(s => s.designer_id === r.designer_id && s.platform === awardPlatform)?.id }))
          .filter(r => r.sid)

        if (toInsert.length > 0) {
          const { error } = await supabase.from('designer_skills').insert(toInsert)
          if (error) { toast.error(error.message); setCompleting(false); return }
        }
        for (const r of toUpdate) {
          const { error } = await supabase.from('designer_skills')
            .update({ level: r.level, source: r.source, updated_at: r.updated_at })
            .eq('id', r.sid!)
          if (error) { toast.error(error.message); setCompleting(false); return }
        }
      }

      await loadAll()
      const skipped = selectedIds.length - rowsToUpsert.length
      toast.success(
        rowsToUpsert.length > 0
          ? `Skill awarded to ${rowsToUpsert.length} designer(s)${skipped > 0 ? ` (${skipped} already at this level or higher)` : ''}`
          : `All designers already have this skill level or higher`
      )
      setCompleting(false)
      setShowAssessPanel(false)
      onClose()
    } catch (err: any) {
      toast.error(err.message)
      setCompleting(false)
    }
  }

  function goToAttendance() {
    dispatch({ type: 'SET_PAGE', payload: 'attendance' })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Banner / Header */}
        <div className="relative h-24 sm:h-32 shrink-0 bg-surface-2 overflow-hidden">
          <div className="absolute inset-0 bg-orange-glow opacity-30" />
          <div className="absolute inset-0 bg-grid-dark opacity-10" />

          <div className="absolute top-4 right-4 flex gap-2">
            {!showAssessPanel && can('canAddEditTrainings') && training.status !== 'completed' && (
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

        {/* Assess Panel */}
        <AnimatePresence mode="wait">
          {showAssessPanel ? (
            <motion.div
              key="assess"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              className="flex-1 flex flex-col min-h-0 bg-surface"
            >
              {/* Assess header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
                <button onClick={() => { setShowAssessPanel(false); setViewOnlyMode(false) }} className="flex items-center gap-1.5 text-xs font-bold text-muted-c hover:text-primary transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                  {viewOnlyMode ? 'Assessment Results' : 'Assess Designers'}
                </span>
                {!viewOnlyMode && (
                  <button onClick={selectAllAttendees} className="text-xs font-bold text-orange-500 hover:underline">
                    Select Attendees
                  </button>
                )}
                {viewOnlyMode && <div className="w-20" />}
              </div>

              {/* Award info */}
              <div className="mx-6 mt-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-orange-gradient flex items-center justify-center shrink-0">
                  {isHandsOn ? <Zap className="w-4 h-4 text-white" /> : <MessageSquare className="w-4 h-4 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-orange-500">Awarding: {awardPlatform}</div>
                  <div className="text-[10px] text-muted-c uppercase tracking-widest">
                    {awardLevel} Level
                    {trainingChecklist.length > 0 && ' · 40% Attendance + 60% Output'}
                  </div>
                </div>
                <div className="text-xs font-bold text-primary shrink-0">
                  {assessSelections.size} selected
                </div>
              </div>

              {/* Designer list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {myEnrolledDesigners.length === 0 && (
                  <div className="py-12 text-center text-muted-c text-sm">No designers enrolled.</div>
                )}
                {myEnrolledDesigners.map(d => {
                  const attCount = getAttCount(d.id)
                  const checked = assessSelections.has(d.id)
                  const existing = designerSkills.find(s => s.designer_id === d.id && s.platform === awardPlatform)
                  const outputUrl = assessData[d.id]?.outputUrl ?? ''
                  const finalScore = getFinalScore(d.id)
                  const passedCount = (assessData[d.id]?.results ?? []).filter(Boolean).length

                  return (
                    <div
                      key={d.id}
                      className={cn(
                        'rounded-xl border transition-all',
                        checked ? 'border-orange-500/40 bg-orange-500/5' : 'border-border bg-surface-2'
                      )}
                    >
                      {/* Top row — click to toggle selection (disabled in view-only mode) */}
                      <div
                        className={cn('flex items-center gap-3 p-3', viewOnlyMode ? 'cursor-default' : 'cursor-pointer')}
                        onClick={() => { if (!viewOnlyMode) toggleAssess(d.id) }}
                      >
                        {viewOnlyMode ? (
                          <div className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                            checked ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-surface-2 border border-border'
                          )}>
                            {checked && <Check className="w-3 h-3 text-emerald-400" />}
                          </div>
                        ) : (
                          <div className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                            checked ? 'border-orange-500 bg-orange-500' : 'border-border'
                          )}>
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {initials(d.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-primary">{d.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={cn('text-[10px] font-bold uppercase tracking-wider', attCount > 0 ? 'text-emerald-400' : 'text-muted-c')}>
                              {attCount > 0 ? `${attCount}/${mySessions.length} att` : 'No attendance'}
                            </span>
                            {trainingChecklist.length > 0 && (
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                {passedCount}/{trainingChecklist.length} ✓
                              </span>
                            )}
                            {existing && (
                              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                                {existing.level}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          'text-xs font-bold px-2 py-1 rounded-lg shrink-0',
                          finalScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                          finalScore >= 60 ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        )}>
                          {finalScore}%
                        </div>
                      </div>

                      {/* Output URL + Checklist */}
                      <div className="px-3 pb-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <div className="ml-14">
                          {outputUrl ? (
                            <a
                              href={outputUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-outline h-7 px-3 text-[10px] font-bold gap-1.5 inline-flex items-center"
                            >
                              <ExternalLink className="w-3 h-3" /> View Output
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-c italic">No submission yet</span>
                          )}
                        </div>
                        {trainingChecklist.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 ml-14">
                            {trainingChecklist.map((item, idx) => {
                              const passed = assessData[d.id]?.results[idx] ?? false
                              return (
                                <button
                                  key={idx}
                                  onClick={() => { if (!viewOnlyMode) toggleResult(d.id, idx) }}
                                  disabled={viewOnlyMode}
                                  className={cn(
                                    'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all',
                                    passed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                      : 'bg-surface border-border text-muted-c',
                                    !viewOnlyMode && !passed && 'hover:border-orange-500/30',
                                    viewOnlyMode && 'cursor-default'
                                  )}
                                >
                                  {passed
                                    ? <Check className="w-2.5 h-2.5" />
                                    : <div className="w-2.5 h-2.5 rounded-sm border border-current opacity-40" />
                                  }
                                  {item}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Assess footer */}
              <div className="p-5 bg-surface-2 border-t border-border flex gap-2 shrink-0">
                {viewOnlyMode ? (
                  <button className="btn-ghost flex-1" onClick={() => { setShowAssessPanel(false); setViewOnlyMode(false) }}>
                    Close
                  </button>
                ) : (
                  <>
                    <button className="btn-ghost flex-1" onClick={() => setShowAssessPanel(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn-primary flex-1 gap-2"
                      onClick={handleAssess}
                      disabled={completing || assessSelections.size === 0}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {completing ? 'Awarding…' : `Award to ${assessSelections.size} Designer${assessSelections.size !== 1 ? 's' : ''}`}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="normal"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              className="flex-1 flex flex-col min-h-0"
            >
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
                    <motion.div key="roster" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.16,1,0.3,1] }} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="sessions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.16,1,0.3,1] }} className="space-y-3">
                      <div className="px-1 mb-2">
                        <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">History Log</div>
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
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-surface-2 border-t border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="p-2.5 rounded-xl text-muted-c hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="flex flex-wrap gap-2">
                  <button onClick={goToAttendance} className="btn-outline h-10 px-4 gap-2">
                    <Users className="w-4 h-4" /><span className="hidden sm:inline">Go to</span> Attendance
                  </button>
                  {training.status === 'completed' && can('canAddEditTrainings') && (
                    isAssessed ? (
                      <button className="btn-outline h-10 px-4 gap-2" onClick={openViewPanel}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> View Assessment
                      </button>
                    ) : (
                      <button className="btn-primary h-10 px-4 gap-2" onClick={openAssessPanel}>
                        <CheckCircle2 className="w-4 h-4" /><span className="hidden sm:inline">Finish &</span> Assess
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="font-display font-bold text-primary text-sm">Delete Training</div>
                  <div className="text-xs text-muted-c mt-0.5">
                    {isAssessed
                      ? 'This training has been assessed.'
                      : training.status === 'completed'
                      ? 'This training is marked as completed.'
                      : 'This action cannot be undone.'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-secondary leading-relaxed">
                {isAssessed ? (
                  <>
                    All sessions, attendance records, and assessment scores will be <span className="text-red-400 font-semibold">permanently deleted</span>.
                    <br /><br />
                    Designer skill awards will <span className="text-emerald-400 font-semibold">not be revoked</span> — they keep their skill levels.
                  </>
                ) : training.status === 'completed' ? (
                  <>
                    All sessions and attendance records will be <span className="text-red-400 font-semibold">permanently deleted</span>.
                    <br /><br />
                    This cannot be undone.
                  </>
                ) : (
                  'All sessions and attendance records will be permanently deleted.'
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  className="btn-ghost flex-1 h-10"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
