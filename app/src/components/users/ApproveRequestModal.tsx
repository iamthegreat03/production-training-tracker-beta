import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, UserCheck, Mail, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type { AccessRequest, UserRole } from '@/types/database'

const ROLES: UserRole[] = ['designer', 'staff', 'trainer', 'admin']

const ROLE_STYLE: Record<UserRole, { active: string; label: string }> = {
  designer: { active: 'border-emerald-500 bg-emerald-500/8 text-emerald-400', label: 'text-emerald-400' },
  staff:    { active: 'border-blue-500 bg-blue-500/8 text-blue-400',          label: 'text-blue-400'    },
  trainer:  { active: 'border-orange-500 bg-orange-500/8 text-orange-400',    label: 'text-orange-400'  },
  admin:    { active: 'border-purple-500 bg-purple-500/8 text-purple-400',    label: 'text-purple-400'  },
}

interface Props {
  request: AccessRequest
  onClose: () => void
  onDone: () => void
}

export default function ApproveRequestModal({ request, onClose, onDone }: Props) {
  const { state } = useApp()
  const { designers } = state

  const [role, setRole] = useState<UserRole>((request.requested_role as UserRole) ?? 'designer')
  const [designerId, setDesignerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setSaving(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('approve-access', {
        body: {
          action: 'approve',
          requestId: request.id,
          role,
          designerId: designerId || null,
        },
      })
      if (fnError || data?.error) {
        setError(fnError?.message ?? data?.error ?? 'Something went wrong')
      } else {
        onDone()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleReject() {
    setSaving(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('approve-access', {
        body: { action: 'reject', requestId: request.id },
      })
      if (fnError || data?.error) {
        setError(fnError?.message ?? data?.error ?? 'Something went wrong')
      } else {
        onDone()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="modal-glass rounded-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-primary leading-none">Review Request</h2>
              <p className="text-[10px] text-muted-c mt-0.5">Approve to create account and send credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">
            {/* Requester info */}
            <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-2">
              <p className="text-[10px] font-bold text-muted-c uppercase tracking-widest">Requester</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {request.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">{request.name}</div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-c">
                    <Mail className="w-3 h-3" />
                    {request.email}
                  </div>
                </div>
              </div>
              {request.message && (
                <div className="flex items-start gap-2 pt-1 border-t border-border">
                  <MessageSquare className="w-3 h-3 text-muted-c mt-0.5 shrink-0" />
                  <p className="text-[11px] text-secondary italic leading-relaxed">{request.message}</p>
                </div>
              )}
            </div>

            {/* Role picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Assign Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => {
                  const s = ROLE_STYLE[r]
                  const isActive = role === r
                  return (
                    <button key={r} onClick={() => setRole(r)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        isActive ? s.active : 'border-border bg-surface-2 hover:border-orange-500/30'
                      )}
                    >
                      <div className={cn('text-[10px] font-bold uppercase tracking-widest', isActive ? s.label : 'text-primary')}>
                        {r}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Designer profile link */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                Link to Designer Profile <span className="normal-case font-normal">(optional)</span>
              </label>
              <select className="input w-full" value={designerId} onChange={e => setDesignerId(e.target.value)}>
                <option value="">— None —</option>
                {designers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}{d.team ? ` · ${d.team}` : ''}</option>
                ))}
              </select>
              <p className="text-[9px] text-muted-c px-1">Required for designer accounts to access their personal dashboard.</p>
            </div>

            {error && (
              <div className="text-[10px] text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border shrink-0 space-y-2">
          <button className="btn-primary w-full h-11" onClick={handleApprove} disabled={saving}>
            {saving ? 'Processing…' : 'Approve & Send Email'}
          </button>
          <button
            onClick={handleReject}
            disabled={saving}
            className="w-full h-10 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Reject Request
          </button>
        </div>
      </motion.div>
    </div>
  )
}
