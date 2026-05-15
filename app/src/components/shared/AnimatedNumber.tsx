import { useEffect, useRef } from 'react'

interface Props {
  value: number
  suffix?: string
  duration?: number
}

export default function AnimatedNumber({ value, suffix = '', duration = 1100 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    let rafId: number
    const start = performance.now()
    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - elapsed, 4)
      const current = Math.round(value * ease)
      if (ref.current) ref.current.textContent = current + suffix
      if (elapsed < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [value, suffix, duration])

  return <span ref={ref}>{value}{suffix}</span>
}
