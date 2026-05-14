import { motion } from 'framer-motion'
import { Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  icon?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
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
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            danger ? 'bg-red-500/10' : 'bg-amber-500/10',
          )}>
            {icon ?? (danger
              ? <Trash2 className="w-5 h-5 text-red-400" />
              : <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="pt-1">
            <div className="font-display font-bold text-primary text-sm">{title}</div>
          </div>
        </div>

        <div className="text-xs text-secondary leading-relaxed">{message}</div>

        <div className="flex gap-2 pt-1">
          <button
            className="btn-ghost flex-1 h-10"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={cn(
              'flex-1 h-10 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600',
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
