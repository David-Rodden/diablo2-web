const FULLSCREEN_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const EASU_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 u_inSize;
uniform vec2 u_outSize;
out vec4 o_color;

vec3 tap(ivec2 p) {
  return texelFetch(u_input, clamp(p, ivec2(0), ivec2(u_inSize) - 1), 0).rgb;
}

float luma(vec3 c) {
  return c.b * 0.5 + (c.r * 0.5 + c.g);
}

void accumulateDirection(inout vec2 dir, inout float len, float w, float lA, float lB, float lC, float lD, float lE) {
  float lenX = max(max(abs(lD - lC), abs(lC - lB)), 1e-5);
  float dirX = lD - lB;
  dir.x += dirX * w;
  lenX = clamp(abs(dirX) / lenX, 0.0, 1.0);
  len += lenX * lenX * w;
  float lenY = max(max(abs(lE - lC), abs(lC - lA)), 1e-5);
  float dirY = lE - lA;
  dir.y += dirY * w;
  lenY = clamp(abs(dirY) / lenY, 0.0, 1.0);
  len += lenY * lenY * w;
}

void accumulateTap(inout vec3 aC, inout float aW, vec2 off, vec2 dir, vec2 len2, float lob, float clp, vec3 c) {
  vec2 v = vec2(dot(off, dir), dot(off, vec2(-dir.y, dir.x))) * len2;
  float d2 = min(dot(v, v), clp);
  float wB = 0.4 * d2 - 1.0;
  float wA = lob * d2 - 1.0;
  wB *= wB;
  wA *= wA;
  wB = 1.5625 * wB - 0.5625;
  float w = wB * wA;
  aC += c * w;
  aW += w;
}

void main() {
  vec2 pp = gl_FragCoord.xy * (u_inSize / u_outSize) - 0.5;
  vec2 fp = floor(pp);
  pp -= fp;
  ivec2 o = ivec2(fp);
  vec3 bC = tap(o + ivec2(0, -1)), cC = tap(o + ivec2(1, -1));
  vec3 eC = tap(o + ivec2(-1, 0)), fC = tap(o), gC = tap(o + ivec2(1, 0)), hC = tap(o + ivec2(2, 0));
  vec3 iC = tap(o + ivec2(-1, 1)), jC = tap(o + ivec2(0, 1)), kC = tap(o + ivec2(1, 1)), lC = tap(o + ivec2(2, 1));
  vec3 nC = tap(o + ivec2(0, 2)), oC = tap(o + ivec2(1, 2));
  float bL = luma(bC), cL = luma(cC), eL = luma(eC), fL = luma(fC), gL = luma(gC), hL = luma(hC);
  float iL = luma(iC), jL = luma(jC), kL = luma(kC), lL = luma(lC), nL = luma(nC), oL = luma(oC);

  vec2 dir = vec2(0.0);
  float len = 0.0;
  accumulateDirection(dir, len, (1.0 - pp.x) * (1.0 - pp.y), bL, eL, fL, gL, jL);
  accumulateDirection(dir, len, pp.x * (1.0 - pp.y), cL, fL, gL, hL, kL);
  accumulateDirection(dir, len, (1.0 - pp.x) * pp.y, fL, iL, jL, kL, nL);
  accumulateDirection(dir, len, pp.x * pp.y, gL, jL, kL, lL, oL);

  float dirR = dot(dir, dir);
  bool flat_ = dirR < 1.0 / 32768.0;
  dir = flat_ ? vec2(1.0, 0.0) : dir * inversesqrt(dirR);
  len = len * 0.5;
  len *= len;
  float stretch = dot(dir, dir) / max(abs(dir.x), abs(dir.y));
  vec2 len2 = vec2(1.0 + (stretch - 1.0) * len, 1.0 - 0.5 * len);
  float lob = 0.5 + ((1.0 / 4.0 - 0.04) - 0.5) * len;
  float clp = 1.0 / lob;

  vec3 aC = vec3(0.0);
  float aW = 0.0;
  accumulateTap(aC, aW, vec2(0.0, -1.0) - pp, dir, len2, lob, clp, bC);
  accumulateTap(aC, aW, vec2(1.0, -1.0) - pp, dir, len2, lob, clp, cC);
  accumulateTap(aC, aW, vec2(-1.0, 1.0) - pp, dir, len2, lob, clp, iC);
  accumulateTap(aC, aW, vec2(0.0, 1.0) - pp, dir, len2, lob, clp, jC);
  accumulateTap(aC, aW, vec2(0.0, 0.0) - pp, dir, len2, lob, clp, fC);
  accumulateTap(aC, aW, vec2(-1.0, 0.0) - pp, dir, len2, lob, clp, eC);
  accumulateTap(aC, aW, vec2(1.0, 1.0) - pp, dir, len2, lob, clp, kC);
  accumulateTap(aC, aW, vec2(2.0, 1.0) - pp, dir, len2, lob, clp, lC);
  accumulateTap(aC, aW, vec2(2.0, 0.0) - pp, dir, len2, lob, clp, hC);
  accumulateTap(aC, aW, vec2(1.0, 0.0) - pp, dir, len2, lob, clp, gC);
  accumulateTap(aC, aW, vec2(1.0, 2.0) - pp, dir, len2, lob, clp, oC);
  accumulateTap(aC, aW, vec2(0.0, 2.0) - pp, dir, len2, lob, clp, nC);

  vec3 mn = min(min(fC, gC), min(jC, kC));
  vec3 mx = max(max(fC, gC), max(jC, kC));
  o_color = vec4(min(mx, max(mn, aC / aW)), 1.0);
}`

const RCAS_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform float u_sharpness;
out vec4 o_color;

vec3 tap(ivec2 p) {
  return texelFetch(u_input, clamp(p, ivec2(0), textureSize(u_input, 0) - 1), 0).rgb;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 b = tap(p + ivec2(0, 1)), d = tap(p + ivec2(-1, 0)), e = tap(p), f = tap(p + ivec2(1, 0)), h = tap(p + ivec2(0, -1));
  vec3 mn4 = min(min(b, d), min(f, h));
  vec3 mx4 = max(max(b, d), max(f, h));
  vec3 hitMin = mn4 / max(4.0 * mx4, vec3(1e-5));
  vec3 hitMax = (1.0 - mx4) / min(4.0 * mn4 - 4.0, vec3(-1e-5));
  vec3 lobeRGB = max(-hitMin, hitMax);
  float lobe = max(-0.1875, min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) * u_sharpness;
  o_color = vec4((lobe * (b + d + f + h) + e) / (4.0 * lobe + 1.0), 1.0);
}`

const RCAS_SHARPNESS_STOPS = 0.35

interface Target {
  readonly framebuffer: WebGLFramebuffer
  readonly texture: WebGLTexture
  readonly width: number
  readonly height: number
}

interface Pass {
  readonly program: WebGLProgram
  readonly uniforms: Readonly<Record<string, WebGLUniformLocation | null>>
}

export const smoothUpscaleSetting = { enabled: false }

export class FsrUpscaler {
  private readonly easu: Pass
  private readonly rcas: Pass
  private scene: Target | null = null
  private upscaled: Target | null = null

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.easu = this.createPass(EASU_FRAGMENT, ['u_input', 'u_inSize', 'u_outSize'])
    this.rcas = this.createPass(RCAS_FRAGMENT, ['u_input', 'u_sharpness'])
  }

  bindScene(width: number, height: number): void {
    this.scene = this.ensureTarget(this.scene, width, height)
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.scene.framebuffer)
  }

  present(outWidth: number, outHeight: number): void {
    const { gl, scene } = this
    if (scene === null) return
    this.upscaled = this.ensureTarget(this.upscaled, outWidth, outHeight)
    gl.disable(gl.BLEND)
    gl.disable(gl.SCISSOR_TEST)
    gl.viewport(0, 0, outWidth, outHeight)
    gl.bindVertexArray(null)
    gl.activeTexture(gl.TEXTURE0)

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.upscaled.framebuffer)
    gl.useProgram(this.easu.program)
    gl.bindTexture(gl.TEXTURE_2D, scene.texture)
    gl.uniform1i(this.easu.uniforms.u_input!, 0)
    gl.uniform2f(this.easu.uniforms.u_inSize!, scene.width, scene.height)
    gl.uniform2f(this.easu.uniforms.u_outSize!, outWidth, outHeight)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(this.rcas.program)
    gl.bindTexture(gl.TEXTURE_2D, this.upscaled.texture)
    gl.uniform1i(this.rcas.uniforms.u_input!, 0)
    gl.uniform1f(this.rcas.uniforms.u_sharpness!, 2 ** -RCAS_SHARPNESS_STOPS)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.enable(gl.BLEND)
  }

  dispose(): void {
    ;[this.scene, this.upscaled].forEach((target) => target && this.deleteTarget(target))
    ;[this.easu, this.rcas].forEach((pass) => this.gl.deleteProgram(pass.program))
  }

  private ensureTarget(existing: Target | null, width: number, height: number): Target {
    if (existing && existing.width === width && existing.height === height) return existing
    if (existing) this.deleteTarget(existing)
    const { gl } = this
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    ;[gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST))
    ;[gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE))
    const framebuffer = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    return { framebuffer, texture, width, height }
  }

  private deleteTarget({ framebuffer, texture }: Target): void {
    this.gl.deleteFramebuffer(framebuffer)
    this.gl.deleteTexture(texture)
  }

  private createPass(fragmentSource: string, uniformNames: readonly string[]): Pass {
    const { gl } = this
    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`FSR shader compile failed: ${gl.getShaderInfoLog(shader)}`)
      return shader
    }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, FULLSCREEN_VERTEX))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`FSR program link failed: ${gl.getProgramInfoLog(program)}`)
    return { program, uniforms: Object.fromEntries(uniformNames.map((name) => [name, gl.getUniformLocation(program, name)])) }
  }
}
