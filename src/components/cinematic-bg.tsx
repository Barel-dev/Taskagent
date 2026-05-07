// Cinematic background — flowing beams, twinkling sparkles, orbiting orbs,
// aurora ribbons, grain. Pure SVG + CSS animations. Server-renderable.

export function CinematicBackground() {
  return (
    <>
      {/* Aurora ribbons — flowing color bands at top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[60vh] overflow-hidden"
      >
        <div
          className="absolute inset-x-[-20%] top-0 h-[40%] blur-3xl"
          style={{
            background:
              'linear-gradient(120deg, transparent 0%, rgba(139,92,246,0.4) 30%, rgba(244,114,182,0.4) 60%, transparent 100%)',
            animation: 'aurora-shift 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-x-[-20%] top-[20%] h-[40%] blur-3xl"
          style={{
            background:
              'linear-gradient(60deg, transparent 0%, rgba(56,189,248,0.30) 40%, rgba(139,92,246,0.30) 70%, transparent 100%)',
            animation: 'aurora-shift 18s ease-in-out infinite reverse',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Orbiting violet orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-[15%] z-0 h-[700px] w-[700px] rounded-full opacity-65 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.55), transparent 70%)',
          animation: 'orbit-violet 32s ease-in-out infinite, glow-pulse 7s ease-in-out infinite',
        }}
      />

      {/* Orbiting pink orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[15%] right-[10%] z-0 h-[600px] w-[600px] rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(244,114,182,0.45), transparent 70%)',
          animation: 'orbit-pink 38s ease-in-out infinite, glow-pulse 9s ease-in-out infinite',
        }}
      />

      {/* Distant cyan accent (slow, calm) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[60%] left-[40%] z-0 h-[700px] w-[800px] rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.30), transparent 70%)',
          animation: 'orbit-violet 50s ease-in-out infinite',
          animationDelay: '4s',
        }}
      />

      {/* Flowing energy beams (SVG curved paths) */}
      <FlowingBeams />

      {/* Sparkle field — 50 twinkling pinpoints */}
      <SparkleField />

      {/* Subtle grain noise */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          backgroundSize: '180px 180px',
        }}
      />

      {/* Vignette — focuses eye toward center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(150% 100% at 50% 30%, transparent 50%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </>
  )
}

function FlowingBeams() {
  const beams = [
    {
      d: 'M-100,150 C400,50 800,250 1200,100 S1700,200 2100,80',
      g: 'beam-violet',
      dur: 14,
      delay: 0,
      width: 1.5,
    },
    {
      d: 'M-100,320 C400,220 800,420 1200,260 S1700,360 2100,250',
      g: 'beam-cyan',
      dur: 18,
      delay: 2,
      width: 1.2,
    },
    {
      d: 'M-100,520 C400,420 800,620 1200,470 S1700,560 2100,430',
      g: 'beam-pink',
      dur: 16,
      delay: 4,
      width: 1.4,
    },
    {
      d: 'M-100,720 C400,620 800,820 1200,670 S1700,760 2100,640',
      g: 'beam-violet',
      dur: 22,
      delay: 1,
      width: 1.0,
    },
    {
      d: 'M-100,920 C400,820 800,1020 1200,870 S1700,960 2100,840',
      g: 'beam-cyan',
      dur: 20,
      delay: 3,
      width: 1.3,
    },
    {
      d: 'M-100,1120 C400,1020 800,1220 1200,1070 S1700,1160 2100,1040',
      g: 'beam-pink',
      dur: 19,
      delay: 5,
      width: 1.1,
    },
  ]

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 2000 1500"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="beam-violet" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(139,92,246,0)" />
          <stop offset="50%" stopColor="rgba(167,139,250,0.7)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </linearGradient>
        <linearGradient id="beam-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(56,189,248,0)" />
          <stop offset="50%" stopColor="rgba(125,211,252,0.55)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0)" />
        </linearGradient>
        <linearGradient id="beam-pink" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(244,114,182,0)" />
          <stop offset="50%" stopColor="rgba(249,168,212,0.55)" />
          <stop offset="100%" stopColor="rgba(244,114,182,0)" />
        </linearGradient>
        <filter id="beam-glow">
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
      </defs>

      <g filter="url(#beam-glow)">
        {beams.map((b, i) => (
          <path
            key={i}
            d={b.d}
            stroke={`url(#${b.g})`}
            strokeWidth={b.width}
            fill="none"
            strokeDasharray="60 500"
            style={{
              animation: `beam-flow ${b.dur}s linear ${b.delay}s infinite`,
            }}
          />
        ))}
      </g>
    </svg>
  )
}

function SparkleField() {
  // Deterministic pseudo-random placement (no useEffect, SSR-safe).
  const sparkles = Array.from({ length: 50 }, (_, i) => {
    const x = (i * 37 + 17) % 100
    const y = (i * 53 + 11) % 100
    const size = 0.6 + ((i * 7) % 20) / 10 // 0.6–2.5px
    const delay = ((i * 0.31) % 5).toFixed(2)
    const duration = 3 + ((i * 7) % 5) // 3–7s
    return { x, y, size, delay, duration }
  })

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            boxShadow: '0 0 6px rgba(255,255,255,0.85), 0 0 12px rgba(167,139,250,0.5)',
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
