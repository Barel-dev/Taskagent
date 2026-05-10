'use client'

import { useEffect, useRef, useState } from 'react'

type Direction = 'up' | 'left' | 'right'

type Props = {
  children: React.ReactNode
  delay?: number
  className?: string
  direction?: Direction
}

function hiddenTransform(direction: Direction) {
  switch (direction) {
    case 'left':
      return 'translateX(-80px)'
    case 'right':
      return 'translateX(80px)'
    case 'up':
    default:
      return 'translateY(60px)'
  }
}

function visibleTransform(direction: Direction) {
  switch (direction) {
    case 'left':
    case 'right':
      return 'translateX(0)'
    case 'up':
    default:
      return 'translateY(0)'
  }
}

export function Reveal({
  children,
  delay = 0,
  className = '',
  direction = 'up',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect users who prefer reduced motion.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionProperty: 'opacity, transform',
        transitionDuration: '1100ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? visibleTransform(direction) : hiddenTransform(direction),
        willChange: 'opacity, transform',
      }}
      className={className}
    >
      {children}
    </div>
  )
}
