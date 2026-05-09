// Calm, restrained background in the Linear aesthetic.
// One soft top violet glow + a single grain noise overlay. No motion.
// Server-renderable. Decorative only (aria-hidden).

export function LandingBg() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Single soft top glow */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[80vh]"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(139,92,246,0.18), transparent 60%)',
        }}
      />
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
    </div>
  )
}
