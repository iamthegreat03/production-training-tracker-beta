import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'pt-glass-blur'
const DEFAULT_BLUR = 2

const PRESETS = [
  { label: 'Off',     value: 0 },
  { label: 'Subtle',  value: 1 },
  { label: 'Default', value: 2 },
  { label: 'Strong',  value: 4 },
  { label: 'Max',     value: 8 },
]

export function useGlassBlur() {
  const [blur, setBlurState] = useState<number>(() => {
    const s = localStorage.getItem(STORAGE_KEY)
    return s !== null ? parseFloat(s) : DEFAULT_BLUR
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-blur', String(blur))
    localStorage.setItem(STORAGE_KEY, String(blur))
  }, [blur])

  return [blur, setBlurState] as const
}

export function applyStoredGlassBlur() {
  const s = localStorage.getItem(STORAGE_KEY)
  const v = s !== null ? parseFloat(s) : DEFAULT_BLUR
  document.documentElement.style.setProperty('--glass-blur', String(v))
}

interface Props {
  open: boolean
  onClose: () => void
  blur: number
  setBlur: (v: number) => void
}

export default function SettingsPanel({ open, onClose, blur, setBlur }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-72 rounded-2xl modal-glass border shadow-xl"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-primary">Appearance</span>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-2 text-muted-c hover:text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Blur control */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Glass Blur</span>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                  {blur === 0 ? 'Off' : `${blur}×`}
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0} max={8} step={0.5}
                value={blur}
                onChange={e => setBlur(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
                style={{ height: '4px' }}
              />
              <div className="flex items-center justify-between text-[9px] text-muted-c font-medium">
                <span>Off</span>
                <span>Max</span>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5 pt-1">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setBlur(p.value)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                      blur === p.value
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                        : 'bg-surface-2 text-muted-c hover:text-primary border border-border'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
