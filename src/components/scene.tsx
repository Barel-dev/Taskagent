'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'

type Layer = { speed: number; children: React.ReactNode; className?: string }

export function Scene({
  layers,
  className = '',
  height = 'auto',
}: {
  layers: Layer[]
  className?: string
  height?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <div ref={ref} className={`relative ${className}`} style={{ height }}>
      {layers.map((layer, i) => (
        <SceneLayer
          key={i}
          progress={scrollYProgress}
          speed={reduced ? 0 : layer.speed}
          className={layer.className}
        >
          {layer.children}
        </SceneLayer>
      ))}
    </div>
  )
}

function SceneLayer({
  progress,
  speed,
  className,
  children,
}: {
  progress: ReturnType<typeof useScroll>['scrollYProgress']
  speed: number
  className?: string
  children: React.ReactNode
}) {
  // Map scroll progress (0->1) into a Y translate range based on speed.
  // Negative speed = faster than scroll (foreground feel)
  // Positive speed = slower than scroll (background feel)
  const y = useTransform(progress, [0, 1], [`${speed * 50}px`, `${speed * -50}px`])
  return (
    <motion.div className={`absolute inset-0 ${className ?? ''}`} style={{ y }}>
      {children}
    </motion.div>
  )
}
