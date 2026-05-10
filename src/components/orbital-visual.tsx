// Animated SVG: concentric orbital rings with traveling glowing nodes.
// Suggests spacecraft / satellites / orbiting agents.
export function OrbitalVisual() {
  return (
    <div className="mx-auto mt-16 w-full max-w-[600px] aspect-square">
      <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.6)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </radialGradient>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.5)" />
            <stop offset="50%" stopColor="rgba(244,114,182,0.3)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.2)" />
          </linearGradient>
        </defs>

        {/* Soft central glow */}
        <circle cx="200" cy="200" r="80" fill="url(#core-glow)" />

        {/* Central core */}
        <circle
          cx="200"
          cy="200"
          r="6"
          fill="rgb(221,214,254)"
          filter="drop-shadow(0 0 8px rgba(167,139,250,1))"
        />

        {/* Three orbital rings, each rotating at different speeds */}
        <g
          style={{
            transformOrigin: '200px 200px',
            animation: 'orbit-ring 20s linear infinite',
          }}
        >
          <ellipse
            cx="200"
            cy="200"
            rx="80"
            ry="32"
            fill="none"
            stroke="url(#ring-grad)"
            strokeWidth="1"
            opacity="0.7"
          />
          <circle
            cx="280"
            cy="200"
            r="3"
            fill="rgb(196,181,253)"
            filter="drop-shadow(0 0 6px rgba(167,139,250,1))"
          />
        </g>

        <g
          style={{
            transformOrigin: '200px 200px',
            animation: 'orbit-ring 35s linear infinite reverse',
          }}
        >
          <ellipse
            cx="200"
            cy="200"
            rx="130"
            ry="55"
            fill="none"
            stroke="url(#ring-grad)"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle
            cx="330"
            cy="200"
            r="3"
            fill="rgb(249,168,212)"
            filter="drop-shadow(0 0 6px rgba(244,114,182,1))"
          />
        </g>

        <g
          style={{
            transformOrigin: '200px 200px',
            animation: 'orbit-ring 50s linear infinite',
          }}
        >
          <ellipse
            cx="200"
            cy="200"
            rx="180"
            ry="80"
            fill="none"
            stroke="url(#ring-grad)"
            strokeWidth="1"
            opacity="0.35"
          />
          <circle
            cx="380"
            cy="200"
            r="3"
            fill="rgb(125,211,252)"
            filter="drop-shadow(0 0 6px rgba(56,189,248,1))"
          />
        </g>
      </svg>
    </div>
  )
}
