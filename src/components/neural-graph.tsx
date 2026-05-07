// AI-themed background: a constellation of nodes with pulsing connections.
// Pure SVG + CSS animations. Server-renderable. Decorative only (aria-hidden).

const nodes: { x: number; y: number; d: number }[] = [
  { x: 6, y: 14, d: 0.0 },
  { x: 20, y: 8, d: 0.6 },
  { x: 36, y: 18, d: 1.2 },
  { x: 52, y: 10, d: 1.8 },
  { x: 68, y: 20, d: 2.4 },
  { x: 84, y: 12, d: 3.0 },
  { x: 94, y: 26, d: 0.4 },
  { x: 12, y: 32, d: 1.0 },
  { x: 28, y: 28, d: 1.6 },
  { x: 44, y: 36, d: 2.2 },
  { x: 60, y: 30, d: 2.8 },
  { x: 76, y: 40, d: 0.2 },
  { x: 90, y: 44, d: 0.8 },
  { x: 8, y: 52, d: 1.4 },
  { x: 24, y: 50, d: 2.0 },
  { x: 40, y: 58, d: 2.6 },
  { x: 56, y: 52, d: 3.2 },
  { x: 72, y: 60, d: 0.5 },
  { x: 88, y: 56, d: 1.1 },
  { x: 16, y: 72, d: 1.7 },
  { x: 32, y: 76, d: 2.3 },
  { x: 50, y: 70, d: 2.9 },
  { x: 66, y: 78, d: 0.3 },
  { x: 82, y: 72, d: 0.9 },
]

const edges: [number, number][] = [
  // Top row chain
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  // Top-to-mid bridges
  [0, 7], [1, 8], [2, 9], [3, 10], [4, 11], [5, 12], [6, 12],
  // Mid row chain
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
  // Mid-to-lower bridges
  [7, 13], [8, 14], [9, 15], [10, 16], [11, 17], [12, 18],
  // Lower-mid row chain
  [13, 14], [14, 15], [15, 16], [16, 17], [17, 18],
  // Lower-to-bottom bridges
  [13, 19], [14, 20], [15, 21], [16, 21], [17, 22], [18, 23],
  // Bottom row chain
  [19, 20], [20, 21], [21, 22], [22, 23],
  // Diagonal connectors for depth
  [2, 8], [4, 10], [9, 14], [11, 16], [15, 20], [17, 22],
]

export function NeuralGraph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <g>
        {edges.map(([a, b], i) => {
          const n1 = nodes[a]
          const n2 = nodes[b]
          return (
            <line
              key={`e-${i}`}
              x1={n1.x}
              y1={n1.y}
              x2={n2.x}
              y2={n2.y}
              stroke="rgba(167,139,250,0.5)"
              strokeWidth={0.12}
              strokeLinecap="round"
              style={{
                animation: `pulse-line ${4 + (i % 5)}s ease-in-out ${(i * 0.17).toFixed(2)}s infinite`,
              }}
            />
          )
        })}
        {nodes.map((n, i) => (
          <g key={`n-${i}`}>
            {/* Outer halo */}
            <circle
              cx={n.x}
              cy={n.y}
              r={1.2}
              fill="rgba(167,139,250,0.18)"
              style={{
                animation: `pulse-node 3.5s ease-in-out ${n.d}s infinite`,
              }}
            />
            {/* Solid core */}
            <circle
              cx={n.x}
              cy={n.y}
              r={0.42}
              fill="rgba(221,214,254,0.95)"
              style={{
                animation: `pulse-node 3.5s ease-in-out ${n.d}s infinite`,
                filter: 'drop-shadow(0 0 1.6px rgba(139,92,246,0.9))',
              }}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
