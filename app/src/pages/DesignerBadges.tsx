import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Crown, Trophy, Shield, Zap, Star } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type { SkillLevel, DesignerSkill } from '@/types/database'
import AnimatedNumber from '@/components/shared/AnimatedNumber'

type LevelCfg = {
  label: string
  tier: string
  stars: number
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  color: string
  bg: string
  rim: string
  glow: string
  tierBg: string
  chipClass: string
}

const LEVEL_CONFIG: Record<SkillLevel, LevelCfg> = {
  Intermediate: {
    label: 'Intermediate', tier: 'I', stars: 2,
    icon: Shield,
    color: '#C8854A',
    bg: 'linear-gradient(170deg, #1E0C00 0%, #301800 50%, #1E0C00 100%)',
    rim: '#C8854A',
    glow: 'rgba(200,133,74,0.65)',
    tierBg: 'rgba(200,133,74,0.15)',
    chipClass: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  Advanced: {
    label: 'Advanced', tier: 'II', stars: 3,
    icon: Zap,
    color: '#94A3B8',
    bg: 'linear-gradient(170deg, #080E1A 0%, #111C2E 50%, #080E1A 100%)',
    rim: '#94A3B8',
    glow: 'rgba(148,163,184,0.55)',
    tierBg: 'rgba(148,163,184,0.12)',
    chipClass: 'text-slate-300 bg-slate-400/10 border-slate-400/30',
  },
  Expert: {
    label: 'Expert', tier: 'III', stars: 4,
    icon: Trophy,
    color: '#EAB308',
    bg: 'linear-gradient(170deg, #140E00 0%, #241A00 50%, #140E00 100%)',
    rim: '#EAB308',
    glow: 'rgba(234,179,8,0.7)',
    tierBg: 'rgba(234,179,8,0.15)',
    chipClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  },
  Completed: {
    label: 'Completed', tier: 'IV', stars: 5,
    icon: Crown,
    color: '#22D3EE',
    bg: 'linear-gradient(170deg, #001418 0%, #001F2A 50%, #001418 100%)',
    rim: '#22D3EE',
    glow: 'rgba(34,211,238,0.65)',
    tierBg: 'rgba(34,211,238,0.15)',
    chipClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
}

const BANNER_CLIP = 'polygon(8% 0%, 92% 0%, 100% 8%, 100% 78%, 50% 100%, 0% 78%, 0% 8%)'

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-[3px] justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="#EAB308">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

function BadgeCard({ skill, cfg, index }: { skill: DesignerSkill; cfg: LevelCfg; index: number }) {
  const Icon = cfg.icon
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 280, delay: Math.min(index * 0.07, 0.4) }}
      className="flex flex-col items-center gap-2.5"
    >
      {/* drop-shadow respects clip-path, unlike box-shadow */}
      <div style={{ filter: `drop-shadow(0 4px 18px ${cfg.glow})` }}>
        {/* Outer rim layer */}
        <div
          className="relative"
          style={{ width: 110, height: 150, clipPath: BANNER_CLIP, background: cfg.rim }}
        >
          {/* Inner dark body — 2px inset creates the rim border */}
          <div
            className="absolute"
            style={{
              top: 2, left: 2,
              width: 106, height: 146,
              clipPath: BANNER_CLIP,
              background: cfg.bg,
            }}
          />

          {/* Content */}
          <div className="absolute inset-0 z-10 flex flex-col items-center pt-[14px] px-3">
            <StarRow count={cfg.stars} />

            {/* Wing divider */}
            <div className="flex items-center w-full gap-1 mt-2 mb-1">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${cfg.rim}90)` }} />
              <div className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: cfg.rim }} />
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${cfg.rim}90)` }} />
            </div>

            {/* Main icon */}
            <Icon
              style={{
                width: 42, height: 42,
                color: cfg.color,
                filter: `drop-shadow(0 0 10px ${cfg.glow})`,
              }}
            />

            {/* Tier label */}
            <div
              className="mt-2 px-2.5 py-0.5 rounded text-[9px] font-black tracking-[0.15em] uppercase"
              style={{
                background: cfg.tierBg,
                color: cfg.color,
                border: `1px solid ${cfg.rim}55`,
              }}
            >
              {cfg.tier}
            </div>
          </div>
        </div>
      </div>

      {/* Name below the badge */}
      <div className="text-center" style={{ maxWidth: 110 }}>
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
            const Icon = cfg.icon

            return (
              <div key={lvl} className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
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
