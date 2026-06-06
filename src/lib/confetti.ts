// Lightweight, dependency-free confetti burst. Spawns a temporary full-screen
// canvas, animates ~2.2s, then removes itself. Respects reduced-motion.
export function confetti() {
  if (typeof document === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const colors = ['#a78bfa', '#f0abfc', '#38bdf8', '#34d399', '#fbbf24', '#fb7185']
  const parts = Array.from({ length: 150 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.32,
    vx: (Math.random() - 0.5) * 13,
    vy: Math.random() * -13 - 4,
    size: Math.random() * 6 + 4,
    color: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }))

  const gravity = 0.3
  const duration = 2200
  const start = performance.now()

  function frame(now: number) {
    const elapsed = now - start
    ctx!.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of parts) {
      p.vy += gravity
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rot)
      ctx!.globalAlpha = Math.max(0, 1 - elapsed / duration)
      ctx!.fillStyle = p.color
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx!.restore()
    }
    if (elapsed < duration) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
