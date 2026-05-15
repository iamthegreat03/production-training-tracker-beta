import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Star, Trophy, Award, Shield } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type { SkillLevel } from '@/types/database'
import AnimatedNumber from '@/components/shared/AnimatedNumber'

const LEVEL_CONFIG: Record<SkillLevel, { label: string; color: string; bg: string; icon: typeof Star }> = {
  Intermediate: { label: 'Intermediate', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: Star },
  Advanced:     { label: 'Advanced',     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', icon: Award },
  Expert:       { label: 'Expert',       color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: Trophy },
  Completed:    { label: 'Completed',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: Shield },
}

export default function DesignerBadges() {
  const { state } = useApp()
  const { designer, designerSkills } = state

  const mySkills = useMemo(() =>
    designerSkills.filter(s => s.designer_id === designer?.id),
  [designerSkills, designer])

  // Group by level
  const byLevel = useMemo(() => {
    const map: Record<SkillLevel, typeof mySkills> = {
      Expert: [], Advanced: [], Intermediate: [], Completed: [],
    }
    mySkills.forEach(s => {
      if (map[s.level]) map[s.level].push(s)
    })
    return map
  }, [mySkills])

  const totalBadges = mySkills.length

  if (!designer) return null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title font-display">Badges</h1>
        <p className="page-subtitle">Your earned skills and certifications</p>
      </div>

      {/* Summary */}
      <div className="relative card rounded-2xl p-5 overflow-hidden shine">
        <div className="absolute inset-0 bg-orange-glow opacity-30 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-c">Total Badges Earned</p>
            <p className="font-display font-bold text-4xl text-gradient-orange mt-1"><AnimatedNumber value={totalBadges} /></p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-orange-gradient flex items-center justify-center glow-orange-md">
            <Trophy className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="relative z-10 mt-4 flex gap-3 flex-wrap">
          {(['Expert', 'Advanced', 'Intermediate', 'Completed'] as SkillLevel[]).map(lvl => {
            const cfg = LEVEL_CONFIG[lvl]
            const count = byLevel[lvl].length
            return (
              <div key={lvl} className={cn('px-3 py-1.5 rounded-xl border text-xs font-bold', cfg.bg, cfg.color)}>
                {count} {cfg.label}
              </div>
            )
          })}
        </div>
      </div>

      {totalBadges === 0 ? (
        <div className="card rounded-2xl p-12 text-center border-dashed">
          <Star className="w-10 h-10 mx-auto mb-3 text-muted-c opacity-40" />
          <p className="text-muted-c">No badges yet.</p>
          <p className="text-xs text-muted-c mt-1">Complete trainings to earn skill badges.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['Expert', 'Advanced', 'Intermediate', 'Completed'] as SkillLevel[]).map(lvl => {
            const skills = byLevel[lvl]
            if (skills.length === 0) return null
            const cfg = LEVEL_CONFIG[lvl]
            const Icon = cfg.icon

            return (
              <div key={lvl} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-4 h-4', cfg.color)} />
                  <h3 className={cn('text-xs font-bold uppercase tracking-widest', cfg.color)}>{cfg.label}</h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-c">{skills.length}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {skills.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 320, delay: Math.min(i * 0.05, 0.25) }}
                      className={cn('rounded-2xl border p-4 flex flex-col items-center gap-2 text-center', cfg.bg)}
                    >
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cfg.bg)}>
                        <Icon className={cn('w-6 h-6', cfg.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{s.platform}</p>
                        {s.source && (
                          <p className="text-[9px] text-muted-c mt-0.5 uppercase tracking-wider">{s.source}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
