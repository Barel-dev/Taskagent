'use client'

import { useEffect, useRef } from 'react'

// Mouse-tracking spotlight: a fixed, behind-everything radial violet gradient
// that follows the cursor with rAF-smoothed motion. Decorative only.
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion — render a static centered glow.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      el.style.transform = `translate3d(${window.innerWidth / 2 - 300}px, ${window.innerHeight / 2 - 300}px, 0)`
      return
    }

    let raf = 0
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY

    function animate() {
      // Smooth interpolation toward target.
      currentX += (targetX - currentX) * 0.12
      currentY += (targetY - currentY) * 0.12
      if (el) {
        el.style.transform = `translate3d(${currentX - 300}px, ${currentY - 300}px, 0)`
      }
      raf = requestAnimationFrame(animate)
    }

    function onMove(e: MouseEvent) {
      targetX = e.clientX
      targetY = e.clientY
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      data-spotlight
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[600px] w-[600px]"
      style={{
        background:
          'radial-gradient(closest-side, rgba(139,92,246,0.18), rgba(167,139,250,0.06) 50%, transparent 75%)',
        filter: 'blur(20px)',
        willChange: 'transform',
        mixBlendMode: 'screen',
      }}
    />
  )
}
