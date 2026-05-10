// Calm Linear-style background with subtle depth.
// Multiple soft glows positioned around the viewport + a few twinkling
// sparkles + grain noise. Pure CSS animations, very slow, never flashy.
// Server-renderable. Decorative only (aria-hidden).

export function LandingBg() {
  // Hand-placed sparkles — only 14, very subtle
  const sparkles = [
    { x: 12, y: 8, d: 0.0, s: 1.4 },
    { x: 28, y: 18, d: 1.2, s: 1.0 },
    { x: 45, y: 6, d: 2.4, s: 1.6 },
    { x: 62, y: 14, d: 0.6, s: 1.2 },
    { x: 78, y: 22, d: 3.0, s: 1.4 },
    { x: 90, y: 10, d: 1.8, s: 1.0 },
    { x: 8, y: 36, d: 2.7, s: 1.3 },
    { x: 35, y: 44, d: 0.9, s: 1.1 },
    { x: 70, y: 38, d: 2.1, s: 1.5 },
    { x: 18, y: 65, d: 0.3, s: 1.2 },
    { x: 52, y: 72, d: 1.5, s: 1.4 },
    { x: 85, y: 60, d: 2.5, s: 1.0 },
    { x: 30, y: 88, d: 1.0, s: 1.3 },
    { x: 75, y: 92, d: 2.2, s: 1.5 },
  ]

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ backgroundColor: '#0a0a0a', zIndex: 0 }}
    >
      {/* Top center violet glow (primary) */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[80vh]"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(139,92,246,0.22), transparent 60%)',
          animation: 'la-pulse 14s ease-in-out infinite',
        }}
      />

      {/* Mid-left violet accent — slow drift */}
      <div
        aria-hidden
        className="absolute -left-[20%] top-[30%] h-[600px] w-[800px] rounded-full opacity-50 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, rgba(139,92,246,0.18), transparent 70%)',
          animation: 'la-drift-a 40s ease-in-out infinite',
        }}
      />

      {/* Mid-right cyan accent */}
      <div
        aria-hidden
        className="absolute -right-[15%] top-[55%] h-[700px] w-[800px] rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, rgba(56,189,248,0.14), transparent 70%)',
          animation: 'la-drift-b 50s ease-in-out infinite',
        }}
      />

      {/* Bottom-left pink accent */}
      <div
        aria-hidden
        className="absolute -left-[10%] top-[80%] h-[700px] w-[800px] rounded-full opacity-45 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, rgba(244,114,182,0.16), transparent 70%)',
          animation: 'la-drift-a 56s ease-in-out infinite',
          animationDelay: '8s',
        }}
      />

      {/* Sparkles — 14 hand-placed, subtle twinkle */}
      <div aria-hidden className="absolute inset-0">
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.s}px`,
              height: `${s.s}px`,
              boxShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(167,139,250,0.4)',
              animation: `la-twinkle ${4 + (i % 4)}s ease-in-out ${s.d}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Subtle grain noise */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(140% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  )
}
