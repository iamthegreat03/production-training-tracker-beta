import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, Zap, MessageSquare } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn, fmtD, fmtDs, pct, normAtt } from '@/lib/utils'

export default function DesignerHistory() {
  const { state } = useApp()
  const { designer, trainings, enrollments, sessions, attendance } = state

  const completedTrainings = useMemo(() => {
    if (!designer) return []
    const enrolledIds = new Set(
      enrollments.filter(e => e.designer_id === designer.id).map(e => e.training_id)
    )
    return trainings
      .filter(t => enrolledIds.has(t.id) && t.status === 'completed')
      .sort((a, b) => (b.target_date ?? '').localeCompare(a.target_date ?? ''))
  }, [trainings, enrollments, designer])

  if (!designer) return null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title font-display">History</h1>
        <p className="page-subtitle">Your completed training record</p>
      </div>

      {completedTrainings.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center border-dashed">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-c opacity-40" />
          <p className="text-muted-c">No completed trainings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedTrainings.map((t, i) => {
            const tSessions = sessions
              .filter(s => s.training_id === t.id)
              .sort((a, b) => a.session_date.localeCompare(b.session_date))
            const myAtt = attendance.filter(a =>
              a.designer_id === designer.id && tSessions.some(s => s.id === a.session_id)
            )
            const present = myAtt.filter(a => normAtt(a.is_present) === 'true' || normAtt(a.is_present) === 'late').length
            const absent = myAtt.filter(a => normAtt(a.is_present) === 'false').length
            const rate = pct(present, myAtt.filter(a => normAtt(a.is_present) !== null).length)
            const isHandsOn = t.type === 'Hands-On'

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 360, delay: Math.min(i * 0.06, 0.3) }}
                className="card rounded-2xl p-5 space-y-4"
              >
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
                      <p className="text-xs text-muted-c mt-0.5">
                        {fmtD(t.start_date)} → {fmtD(t.target_date)}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-emerald text-[10px]">Completed</span>
                </div>

                {/* Session heatmap */}
                <div className="flex flex-wrap gap-1.5">
                  {tSessions.map(s => {
                    const att = myAtt.find(a => a.session_id === s.id)
                    const val = normAtt(att?.is_present)
                    return (
                      <div
                        key={s.id}
                        title={`${fmtDs(s.session_date)}: ${val ?? 'unmarked'}`}
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center',
                          val === 'true' ? 'bg-emerald-500/20 border border-emerald-500/40' :
                          val === 'late' ? 'bg-amber-500/20 border border-amber-500/40' :
                          val === 'false' ? 'bg-red-500/20 border border-red-500/40' :
                          'bg-surface-2 border border-border'
                        )}
                      >
                        {val === 'true' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {val === 'late' && <Clock className="w-3 h-3 text-amber-400" />}
                        {val === 'false' && <XCircle className="w-3 h-3 text-red-400" />}
                      </div>
                    )
                  })}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-primary">{present} present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-muted-c">{absent} absent</span>
                  </div>
                  <div className="ml-auto text-sm font-bold font-display text-orange-500">
                    {rate}%
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
