import type { FontAtlasMeta, FontGlyphMetric } from './font.ts'

const MAX_ATLAS_SCALE = 4
const REFERENCE_PX = 100
const CAP_REFERENCE_CHAR = 'H'
const OUTLINE_COLOR = 'rgba(0, 0, 0, 0.7)'
const OUTLINE_WIDTH_PX = 1.1
const EMBOLDEN_WIDTH_PX = 0.35

type AtlasSource = HTMLImageElement | HTMLCanvasElement

export interface VectorGlyphStyle {
  readonly family: string
  readonly fillColor: string
  readonly baselineRow: number
}

export function physicalGlyphScale(ctx: CanvasRenderingContext2D): number {
  if (typeof ctx.getTransform !== 'function') return 1
  const t = ctx.getTransform()
  const scale = Math.hypot(t.a, t.b)
  if (!Number.isFinite(scale) || scale <= 1) return 1
  return Math.min(MAX_ATLAS_SCALE, Math.ceil(scale - 0.01))
}

export function snapToPhysicalPixel(value: number, scale: number): number {
  return Math.round(value * scale) / scale
}

function opaqueRowRange(source: AtlasSource, glyph: FontGlyphMetric): { top: number; bottom: number } | null {
  const probe = document.createElement('canvas')
  probe.width = glyph.frameW
  probe.height = glyph.frameH
  const ctx = probe.getContext('2d')
  if (!ctx || typeof ctx.getImageData !== 'function') return null
  ctx.drawImage(source, glyph.x, glyph.y, glyph.frameW, glyph.frameH, 0, 0, glyph.frameW, glyph.frameH)
  const { data } = ctx.getImageData(0, 0, glyph.frameW, glyph.frameH)
  let top = -1
  let bottom = -1
  for (let row = 0; row < glyph.frameH; row++) {
    for (let col = 0; col < glyph.frameW; col++) {
      if (data[(row * glyph.frameW + col) * 4 + 3]! > 0) {
        if (top < 0) top = row
        bottom = row
        break
      }
    }
  }
  return top < 0 ? null : { top, bottom }
}

export class VectorGlyphAtlas {
  private readonly atlases = new Map<string, HTMLCanvasElement>()
  private readonly fontPx = new Map<string, number>()
  private readonly pendingFaces = new Set<string>()

  get(
    key: string,
    source: AtlasSource,
    meta: FontAtlasMeta,
    style: VectorGlyphStyle,
    scale: number,
  ): HTMLCanvasElement | null {
    const atlasKey = `${key}:${style.fillColor}:${scale}`
    const cached = this.atlases.get(atlasKey)
    if (cached) return cached
    if (typeof document === 'undefined' || !this.isFaceReady(style.family)) return null
    const px = this.resolveFontPx(key, source, meta, style)
    if (px === null) return null
    const atlas = document.createElement('canvas')
    atlas.width = source.width * scale
    atlas.height = source.height * scale
    const ctx = atlas.getContext('2d')
    if (!ctx || typeof ctx.fillText !== 'function') return null
    ctx.font = `${px * scale}px ${style.family}`
    ctx.textBaseline = 'alphabetic'
    ctx.lineJoin = 'round'
    ctx.fillStyle = style.fillColor
    for (const glyph of meta.glyphs) {
      if (glyph.frameW <= 0 || glyph.frameH <= 0 || glyph.code <= 0x20 || glyph.code === 0xa0) continue
      const ch = String.fromCharCode(glyph.code)
      const box = Math.max(1, Math.min(glyph.width, glyph.frameW)) * scale
      const inkWidth = ctx.measureText(ch).width
      const squeeze = inkWidth > box ? box / inkWidth : 1
      ctx.save()
      ctx.beginPath()
      ctx.rect(glyph.x * scale, glyph.y * scale, glyph.frameW * scale, glyph.frameH * scale)
      ctx.clip()
      ctx.translate(glyph.x * scale + (box - inkWidth * squeeze) / 2, (glyph.y + style.baselineRow) * scale)
      ctx.scale(squeeze, 1)
      ctx.strokeStyle = OUTLINE_COLOR
      ctx.lineWidth = OUTLINE_WIDTH_PX * scale
      ctx.strokeText(ch, 0, 0)
      ctx.strokeStyle = style.fillColor
      ctx.lineWidth = EMBOLDEN_WIDTH_PX * scale
      ctx.strokeText(ch, 0, 0)
      ctx.fillText(ch, 0, 0)
      ctx.restore()
    }
    this.atlases.set(atlasKey, atlas)
    return atlas
  }

  invalidate(key: string): void {
    for (const k of [...this.atlases.keys()]) {
      if (k.startsWith(`${key}:`)) this.atlases.delete(k)
    }
    this.fontPx.delete(key)
  }

  private isFaceReady(family: string): boolean {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (!fonts || typeof fonts.check !== 'function') return false
    const probe = `${REFERENCE_PX}px ${family}`
    if (fonts.check(probe)) return true
    if (!this.pendingFaces.has(family)) {
      this.pendingFaces.add(family)
      void fonts.load(probe).finally(() => this.pendingFaces.delete(family))
    }
    return false
  }

  private resolveFontPx(key: string, source: AtlasSource, meta: FontAtlasMeta, style: VectorGlyphStyle): number | null {
    const known = this.fontPx.get(key)
    if (known !== undefined) return known
    const glyph = meta.glyphs[CAP_REFERENCE_CHAR.charCodeAt(0)] ?? meta.glyphs['0'.charCodeAt(0)]
    if (!glyph) return null
    const rows = opaqueRowRange(source, glyph)
    if (rows === null) return null
    const capHeight = Math.min(style.baselineRow, rows.bottom + 1) - rows.top
    const measure = document.createElement('canvas').getContext('2d')
    if (!measure || capHeight <= 0) return null
    measure.font = `${REFERENCE_PX}px ${style.family}`
    const ascent = measure.measureText(CAP_REFERENCE_CHAR).actualBoundingBoxAscent
    if (!(ascent > 0)) return null
    const px = (REFERENCE_PX * capHeight) / ascent
    this.fontPx.set(key, px)
    return px
  }
}
