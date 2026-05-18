import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type { SkillLevel, DesignerSkill } from '@/types/database'
import AnimatedNumber from '@/components/shared/AnimatedNumber'

type LevelCfg = {
  label: string
  image: string
  glow: string
  chipClass: string
}

const LEVEL_CONFIG: Record<SkillLevel, LevelCfg> = {
  Intermediate: {
    label: 'Intermediate',
    image: '/intermidiate_badge.png',
    glow: 'rgba(100,180,80,0.55)',
    chipClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  Advanced: {
    label: 'Advanced',
    image: '/advance_badge.png',
    glow: 'rgba(200,133,74,0.55)',
    chipClass: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  Expert: {
    label: 'Expert',
    image: '/expert_badge.png',
    glow: 'rgba(220,60,30,0.6)',
    chipClass: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  Completed: {
    label: 'Completed',
    image: '/expert_badge.png',
    glow: 'rgba(34,211,238,0.6)',
    chipClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
}

function BadgeCard({ skill, cfg, index }: { skill: DesignerSkill; cfg: LevelCfg; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 280, delay: Math.min(index * 0.07, 0.4) }}
      className="flex flex-col items-center gap-2"
    >
      <div style={{ filter: `drop-shadow(0 4px 20px ${cfg.glow})` }}>
        <img
          src={cfg.image}
          alt={cfg.label}
          className="w-36 h-36 object-contain"
        />
      </div>
      <div className="text-center" style={{ maxWidth: 144 }}>
        <p className="text-xs font-bold text-primary leading-tight truncate">{skill.platform}</p>
        {skill.source && (
          <p className="text-[9px] text-muted-c mt-0.5 uppercase tracking-wider truncate">{skill.source}</p>
        )}
      </div>
    </motion.div>
  )
}

export default function DesignerBadges() {
  const { state } = useApp()
  const { designer, designerSkills } = state

  const mySkills = useMemo(() =>
    designerSkills.filter(s => s.designer_id === designer?.id),
  [designerSkills, designer])

  const byLevel = useMemo(() => {
    const map: Record<SkillLevel, typeof mySkills> = {
      Expert: [], Advanced: [], Intermediate: [], Completed: [],
    }
    mySkills.forEach(s => { if (map[s.level]) map[s.level].push(s) })
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

      {/* Summary card */}
      <div className="relative card rounded-2xl p-5 overflow-hidden shine">
        <div className="absolute inset-0 bg-orange-glow opacity-30 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-c">Total Badges Earned</p>
            <p className="font-display font-bold text-4xl text-gradient-orange mt-1">
              <AnimatedNumber value={totalBadges} />
            </p>
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
              <div key={lvl} className={cn('px-3 py-1.5 rounded-xl border text-xs font-bold', cfg.chipClass)}>
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
        <div className="space-y-8">
          {(['Expert', 'Advanced', 'Intermediate', 'Completed'] as SkillLevel[]).map(lvl => {
            const skills = byLevel[lvl]
            if (skills.length === 0) return null
            const cfg = LEVEL_CONFIG[lvl]

            return (
              <div key={lvl} className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <img src={cfg.image} alt="" className="w-4 h-4 object-contain" />
                  <h3 className={cn('text-xs font-bold uppercase tracking-widest', cfg.chipClass.split(' ')[0])}>
                    {cfg.label}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-c">{skills.length}</span>
                </div>

                <div className="flex flex-wrap gap-5">
                  {skills.map((s, i) => (
                    <BadgeCard key={s.id} skill={s} cfg={cfg} index={i} />
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
