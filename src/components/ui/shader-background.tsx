'use client'

import React, { useRef, useEffect } from 'react'

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
    col=mix(col,vec3(bg*.13,bg*.06,bg*.22),d);
  }
  O=vec4(col,1);
}`

const vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

class Renderer {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext
  program: WebGLProgram | null = null
  buffer: WebGLBuffer | null = null
  scale: number
  vertices = [-1, 1, -1, -1, 1, 1, 1, -1]

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas
    this.scale = scale
    this.gl = canvas.getContext('webgl2') as WebGL2RenderingContext
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale)
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
    const vs = gl.createShader(gl.VERTEX_SHADER)!
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    this.compile(vs, vertexSrc)
    this.compile(fs, defaultShaderSource)
    this.program = gl.createProgram()!
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
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
    gl.uniform2f(
      gl.getUniformLocation(program, 'resolution'),
      this.canvas.width,
      this.canvas.height,
    )
    gl.uniform1f(gl.getUniformLocation(program, 'time'), now * 1e-3)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

interface ShaderBackgroundProps {
  /** 0 to 1 — 1 = full intensity, 0.4 = dimmed for app screens */
  opacity?: number
  className?: string
}

export function ShaderBackground({ opacity = 1, className = '' }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio)
    const renderer = new Renderer(canvas, dpr)

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
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ background: 'black' }}
      />
    </div>
  )
}
