'use client'

import React, { useRef, useEffect } from 'react'

interface HeroProps {
  trustBadge?: {
    text: string
    icons?: string[]
  }
  headline: {
    line1: string
    line2: string
  }
  subtitle: string
  buttons?: {
    primary?: {
      text: string
      href?: string
      onClick?: () => void
    }
    secondary?: {
      text: string
      href?: string
      onClick?: () => void
    }
  }
  className?: string
}

const defaultShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a);
    d=a;
    p*=2./(i+1.);
  }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    // Violet/fuchsia tinted nebula (was orange — now matches TaskAgent brand)
    col=mix(col,vec3(bg*.13,bg*.06,bg*.22),d);
  }
  O=vec4(col,1);
}`

const vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

class WebGLRenderer {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext
  program: WebGLProgram | null = null
  vs: WebGLShader | null = null
  fs: WebGLShader | null = null
  buffer: WebGLBuffer | null = null
  scale: number
  shaderSource: string
  mouseMove: [number, number] = [0, 0]
  mouseCoords: [number, number] = [0, 0]
  pointerCoords: number[] = [0, 0]
  nbrOfPointers = 0
  vertices = [-1, 1, -1, -1, 1, 1, 1, -1]

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas
    this.scale = scale
    this.gl = canvas.getContext('webgl2') as WebGL2RenderingContext
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale)
    this.shaderSource = defaultShaderSource
  }

  updateScale(scale: number) {
    this.scale = scale
    this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale)
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
  }

  setup() {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)!
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!
    this.compile(this.vs, vertexSrc)
    this.compile(this.fs, this.shaderSource)
    this.program = gl.createProgram()!
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)
  }

  init() {
    const gl = this.gl
    const program = this.program
    if (!program) return
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  }

  render(now = 0) {
    const gl = this.gl
    const program = this.program
    if (!program) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.uniform2f(gl.getUniformLocation(program, 'resolution'), this.canvas.width, this.canvas.height)
    gl.uniform1f(gl.getUniformLocation(program, 'time'), now * 1e-3)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio)
    const renderer = new WebGLRenderer(canvas, dpr)
    rendererRef.current = renderer

    const resize = () => {
      const d = Math.max(1, 0.5 * window.devicePixelRatio)
      canvas.width = window.innerWidth * d
      canvas.height = window.innerHeight * d
      renderer.updateScale(d)
    }

    renderer.setup()
    renderer.init()
    resize()

    const loop = (now: number) => {
      renderer.render(now)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      className={`relative h-screen w-full overflow-hidden bg-black ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ background: 'black' }}
      />

      {/* Soft top/bottom fade so the next section blends in */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#0a0e1a]"
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
        {trustBadge && (
          <div className="mb-8 ash-fade-in-down">
            <div className="flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/10 px-5 py-2 text-sm backdrop-blur-md">
              {trustBadge.icons && (
                <div className="flex gap-1">
                  {trustBadge.icons.map((icon, index) => (
                    <span key={index} className="text-violet-200">
                      {icon}
                    </span>
                  ))}
                </div>
              )}
              <span className="text-violet-100">{trustBadge.text}</span>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl space-y-6 px-4 text-center">
          <div className="space-y-1">
            <h1 className="ash-fade-in-up ash-delay-200 bg-gradient-to-r from-violet-200 via-fuchsia-300 to-pink-300 bg-clip-text text-5xl font-semibold tracking-[-0.03em] text-transparent md:text-7xl lg:text-[7rem] lg:leading-[0.95]">
              {headline.line1}
            </h1>
            <h1 className="ash-fade-in-up ash-delay-400 bg-gradient-to-r from-fuchsia-300 via-pink-400 to-rose-300 bg-clip-text text-5xl font-semibold tracking-[-0.03em] text-transparent md:text-7xl lg:text-[7rem] lg:leading-[0.95]">
              {headline.line2}
            </h1>
          </div>

          <div className="ash-fade-in-up ash-delay-600 mx-auto max-w-3xl">
            <p className="text-base font-light leading-relaxed text-violet-100/80 md:text-lg lg:text-xl">
              {subtitle}
            </p>
          </div>

          {buttons && (
            <div className="ash-fade-in-up ash-delay-800 mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              {buttons.primary && (
                <a
                  href={buttons.primary.href ?? '#'}
                  onClick={buttons.primary.onClick}
                  className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-105 hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-[0_0_60px_rgba(139,92,246,0.6)]"
                >
                  {buttons.primary.text}
                </a>
              )}
              {buttons.secondary && (
                <a
                  href={buttons.secondary.href ?? '#'}
                  onClick={buttons.secondary.onClick}
                  className="rounded-full border border-violet-300/30 bg-violet-500/10 px-8 py-4 text-base font-semibold text-violet-100 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-violet-300/50 hover:bg-violet-500/20"
                >
                  {buttons.secondary.text}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Hero
