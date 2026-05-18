import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format YYYY-MM-DD → "Jan 15, 2026" */
export function fmtD(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** Format YYYY-MM-DD → "Jan 15" */
export function fmtDs(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

/** Get today as YYYY-MM-DD (local date, not UTC) */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 2-char initials from full name */
export function initials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** First name + last initial */
export function shortName(n: string): string {
  const parts = n.trim().split(' ').filter(Boolean)
  if (parts.length <= 1) return n
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/** Safe percentage: (n/d)*100, returns 0 if d===0 */
export function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100)
}

/** Normalise attendance value from DB */
export function normAtt(val: unknown): 'true' | 'false' | 'late' | null {
  if (val === 'late') return 'late'
  if (val === true || val === 'true') return 'true'
  if (val === false || val === 'false') return 'false'
  return null
}

/** True if the session date is strictly in the future (enabled at 12am on the date) */
export function isSessionFuture(sessionDate: string): boolean {
  return sessionDate > today()
}

/** Day-of-week from YYYY-MM-DD */
export function dayName(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}
