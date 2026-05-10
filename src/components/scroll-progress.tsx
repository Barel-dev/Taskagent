'use client'

import { useEffect, useState } from 'react'

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0

    function update() {
      const scrolled = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (scrolled / max) * 100 : 0)
    }

    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      data-scroll-progress
      className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500"
        style={{ width: `${progress}%`, transition: 'width 80ms linear' }}
      />
    </div>
  )
}
