'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'motion/react'

export function TiltOnScroll({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  // Smoothed scroll progress
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20 })

  // Tilt from -6deg to +6deg as element passes through viewport
  const rotateX = useTransform(smooth, [0, 0.5, 1], [reduced ? 0 : 6, 0, reduced ? 0 : -6])
  // Subtle scale 0.94 -> 1 -> 0.94
  const scale = useTransform(smooth, [0, 0.5, 1], [reduced ? 1 : 0.94, 1, reduced ? 1 : 0.94])
  // Opacity dip at edges
  const opacity = useTransform(smooth, [0, 0.2, 0.8, 1], [0.4, 1, 1, 0.4])

  return (
    <div ref={ref} className={className} style={{ perspective: '1200px' }}>
      <motion.div style={{ rotateX, scale, opacity, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  )
}
