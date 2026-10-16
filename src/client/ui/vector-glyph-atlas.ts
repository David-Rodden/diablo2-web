import { crispPixelScale } from '../view/crisp-scale.ts'
import type { FontAtlasMeta, FontGlyphMetric } from './font.ts'

const REFERENCE_PX = 100
const OUTLINE_COLOR = 'rgba(0, 0, 0, 0.7)'
const OUTLINE_WIDTH = 1.1
const EMBOLDEN_WIDTH = 0.35

type AtlasSource = HTMLImageElement | HTMLCanvasElement
interface GlyphMetrics {
  readonly px: number
  readonly baseline: number
}

export const smoothTextSetting = { enabled: false }

export const physicalGlyphScale = (ctx: CanvasRenderingContext2D): number => {
  const t = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null
  return crispPixelScale(t ? Math.hypot(t.a, t.b) : 1)
}

export const snapToPhysicalPixel = (value: number, scale: number): number => Math.round(value * scale) / scale

const range = (length: number): number[] => Array.from({ length }, (_, i) => i)

const isDrawable = (g: FontGlyphMetric): boolean => g.frameW > 0 && g.frameH > 0 && g.code > 0x20 && g.code !== 0xa0

const inkRows = (source: AtlasSource, g: FontGlyphMetric): readonly number[] => {
  const ctx = Object.assign(document.createElement('canvas'), { width: g.frameW, height: g.frameH }).getContext('2d')
  if (!ctx || typeof ctx.getImageData !== 'function') return []
  ctx.drawImage(source, g.x, g.y, g.frameW, g.frameH, 0, 0, g.frameW, g.frameH)
  const { data } = ctx.getImageData(0, 0, g.frameW, g.frameH)
  return range(g.frameH).filter((row) => range(g.frameW).some((col) => data[(row * g.frameW + col) * 4 + 3]! > 0))
}

const drawGlyph = (ctx: CanvasRenderingContext2D, g: FontGlyphMetric, baseline: number, fill: string, scale: number): void => {
  const ch = String.fromCharCode(g.code)
  const box = Math.max(1, Math.min(g.width, g.frameW)) * scale
  const ink = ctx.measureText(ch).width
  const squeeze = Math.min(1, box / ink)
  ctx.save()
  ctx.beginPath()
  ctx.rect(g.x * scale, g.y * scale, g.frameW * scale, g.frameH * scale)
  ctx.clip()
  ctx.translate(g.x * scale + (box - ink * squeeze) / 2, (g.y + baseline) * scale)
  ctx.scale(squeeze, 1)
  ;([[OUTLINE_COLOR, OUTLINE_WIDTH], [fill, EMBOLDEN_WIDTH]] as const).forEach(([strokeStyle, width]) =>
    Object.assign(ctx, { strokeStyle, lineWidth: width * scale }).strokeText(ch, 0, 0),
  )
  ctx.fillText(ch, 0, 0)
  ctx.restore()
}

export class VectorGlyphAtlas {
  private readonly atlases = new Map<string, HTMLCanvasElement>()
  private readonly metrics = new Map<string, GlyphMetrics | null>()
  private readonly pendingFaces = new Set<string>()

  get(key: string, source: AtlasSource, meta: FontAtlasMeta, family: string, fill: string, scale: number): HTMLCanvasElement | null {
    const atlasKey = `${key}|${fill}|${scale}`
    const cached = this.atlases.get(atlasKey)
    if (cached) return cached
    const metrics = typeof document !== 'undefined' && this.isFaceReady(family) ? this.resolveMetrics(key, source, meta, family) : null
    const atlas = metrics && Object.assign(document.createElement('canvas'), { width: source.width * scale, height: source.height * scale })
    const ctx = atlas?.getContext('2d')
    if (!metrics || !atlas || !ctx || typeof ctx.fillText !== 'function') return null
    Object.assign(ctx, { font: `${metrics.px * scale}px ${family}`, textBaseline: 'alphabetic', lineJoin: 'round', fillStyle: fill })
    meta.glyphs.filter(isDrawable).forEach((g) => drawGlyph(ctx, g, metrics.baseline, fill, scale))
    this.atlases.set(atlasKey, atlas)
    return atlas
  }

  invalidate(key: string): void {
    ;[...this.atlases.keys()].filter((k) => k.startsWith(`${key}|`)).forEach((k) => this.atlases.delete(k))
    this.metrics.delete(key)
  }

  private isFaceReady(family: string): boolean {
    const fonts = document.fonts
    const probe = `${REFERENCE_PX}px ${family}`
    if (typeof fonts?.check !== 'function') return false
    if (fonts.check(probe)) return true
    if (!this.pendingFaces.has(family)) {
      this.pendingFaces.add(family)
      void fonts.load(probe).finally(() => this.pendingFaces.delete(family))
    }
    return false
  }

  private resolveMetrics(key: string, source: AtlasSource, meta: FontAtlasMeta, family: string): GlyphMetrics | null {
    if (!this.metrics.has(key)) {
      const reference = meta.glyphs['H'.charCodeAt(0)]
      const rows = reference ? inkRows(source, reference) : []
      const measure = document.createElement('canvas').getContext('2d')
      if (measure) measure.font = `${REFERENCE_PX}px ${family}`
      const ascent = measure?.measureText('H').actualBoundingBoxAscent ?? 0
      const baseline = (rows.at(-1) ?? -1) + 1
      this.metrics.set(key, ascent > 0 && baseline > 0 ? { px: (REFERENCE_PX * (baseline - rows[0]!)) / ascent, baseline } : null)
    }
    return this.metrics.get(key) ?? null
  }
}
