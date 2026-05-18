import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Zap, Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'designer', label: 'Designer',  desc: 'Personal dashboard and roadmap access' },
  { value: 'staff',    label: 'Staff',     desc: 'Manage designers and track attendance' },
  { value: 'trainer',  label: 'Trainer',   desc: 'Manage trainings and sessions' },
]

export default function Login() {
  const [view, setView] = useState<'login' | 'request' | 'sent'>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Request state
  const [reqName, setReqName] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [reqRole, setReqRole] = useState('designer')
  const [reqMessage, setReqMessage] = useState('')
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!reqName.trim() || !reqEmail.trim()) {
      setReqError('Name and email are required')
      return
    }
    setReqLoading(true)
    setReqError('')
    const { error: err } = await supabase.from('access_requests').insert({
      name: reqName.trim(),
      email: reqEmail.trim().toLowerCase(),
      requested_role: reqRole,
      message: reqMessage.trim() || null,
    })
    if (err) {
      setReqError(err.message)
      setReqLoading(false)
    } else {
      setView('sent')
      setReqLoading(false)
    }
  }

  return (
    <div className={cn('min-h-dvh flex items-center justify-center p-4', 'bg-app relative overflow-hidden')}>
      <div className="absolute inset-0 bg-grid-dark dark:bg-grid-dark bg-grid-light opacity-100" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-glow opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-orange-500/8 blur-2xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-gradient glow-orange-md mb-4 shadow-orange-lg">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary">PT Tracker</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-secondary))' }}>
            Production Training Command Center
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Login view ── */}
          {view === 'login' && (
            <motion.div key="login"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass rounded-2xl p-6 shadow-glass">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c z-10" />
                      <input
                        type="email" required value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@rwds.com"
                        className="input pl-9" style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c z-10" />
                      <input
                        type={showPass ? 'text' : 'password'} required value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input pl-9 pr-9" style={{ fontSize: '16px' }}
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-c hover:text-primary transition-colors">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </motion.p>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Signing in…
                      </span>
                    ) : 'Sign In'}
                  </button>
                </form>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setView('request'); setReqError('') }}
                  className="flex items-center gap-2 mx-auto text-xs font-semibold text-muted-c hover:text-orange-400 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Don't have an account? Request Access
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Request Access view ── */}
          {view === 'request' && (
            <motion.div key="request"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass rounded-2xl p-6 shadow-glass">
                <div className="flex items-center gap-2 mb-5">
                  <button onClick={() => setView('login')} className="p-1 rounded-lg text-muted-c hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="font-display font-bold text-primary text-sm leading-none">Request Access</h2>
                    <p className="text-[10px] text-muted-c mt-0.5">An admin will review and send your credentials.</p>
                  </div>
                </div>

                <form onSubmit={handleRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Full Name</label>
                    <input className="input w-full" value={reqName} onChange={e => setReqName(e.target.value)}
                      placeholder="Your full name" style={{ fontSize: '16px' }} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c z-10" />
                      <input type="email" className="input w-full pl-9" value={reqEmail}
                        onChange={e => setReqEmail(e.target.value)}
                        placeholder="your@email.com" style={{ fontSize: '16px' }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Role</label>
                    <div className="space-y-2">
                      {ROLE_OPTIONS.map(r => (
                        <button key={r.value} type="button" onClick={() => setReqRole(r.value)}
                          className={cn(
                            'w-full p-3 rounded-xl border text-left transition-all',
                            reqRole === r.value
                              ? 'border-orange-500 bg-orange-500/8'
                              : 'border-border bg-surface-2 hover:border-orange-500/30'
                          )}
                        >
                          <div className={cn('text-[10px] font-bold uppercase tracking-widest', reqRole === r.value ? 'text-orange-400' : 'text-primary')}>
                            {r.label}
                          </div>
                          <div className="text-[9px] text-muted-c mt-0.5">{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">
                      Message <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <textarea className="input w-full resize-none" rows={2} value={reqMessage}
                      onChange={e => setReqMessage(e.target.value)}
                      placeholder="Anything you'd like the admin to know…" />
                  </div>

                  {reqError && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {reqError}
                    </p>
                  )}

                  <button type="submit" disabled={reqLoading} className="btn-primary w-full justify-center py-2.5">
                    {reqLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Submitting…
                      </span>
                    ) : 'Submit Request'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── Sent confirmation ── */}
          {view === 'sent' && (
            <motion.div key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass rounded-2xl p-8 shadow-glass text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-primary text-lg">Request Sent!</h2>
                  <p className="text-sm text-muted-c mt-1">
                    Your request has been submitted. An admin will review it and send your login credentials to <span className="text-primary font-medium">{reqEmail}</span>.
                  </p>
                </div>
                <button onClick={() => setView('login')} className="btn-outline w-full justify-center py-2.5">
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs mt-6 text-muted-c">RWDS Design Team · Internal Use Only</p>
      </motion.div>
    </div>
  )
}
