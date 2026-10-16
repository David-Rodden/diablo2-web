import { describe, expect, it } from 'vitest'
import { LineGlide } from '../../src/client/ui/line-glide.ts'
import { physicalGlyphScale, snapToPhysicalPixel } from '../../src/client/ui/vector-glyph-atlas.ts'

const LINE = 15

describe('LineGlide', () => {
  it('starts lines where they were when the oldest line scrolls off, then eases to rest', () => {
    const glide = new LineGlide()
    expect(glide.update(['a', 'b', 'c'], 0, 3, LINE, 0)).toBe(0)
    const first = glide.update(['a', 'b', 'c', 'd'], 1, 3, LINE, 16)
    expect(first).toBe(LINE)
    const later = glide.update(['a', 'b', 'c', 'd'], 1, 3, LINE, 66)
    expect(later).toBeGreaterThan(0)
    expect(later).toBeLessThan(first)
    let t = 66
    while (glide.isMoving(t)) {
      t += 16
      glide.update(['a', 'b', 'c', 'd'], 1, 3, LINE, t)
    }
    expect(glide.update(['a', 'b', 'c', 'd'], 1, 3, LINE, t + 16)).toBe(0)
    expect(t).toBeLessThan(600)
  })

  it('glides the remaining lines up when the top line expires', () => {
    const glide = new LineGlide()
    glide.update(['a', 'b', 'c'], 0, 3, LINE, 0)
    expect(glide.update(['b', 'c'], 0, 2, LINE, 16)).toBe(LINE)
  })

  it('glides downward when scrolling back through history', () => {
    const glide = new LineGlide()
    const keys = ['a', 'b', 'c', 'd', 'e', 'f']
    glide.update(keys, 3, 3, 16, 0)
    expect(glide.update(keys, 1, 3, 16, 16)).toBe(-32)
  })

  it('does not animate after the box has been hidden for a while', () => {
    const glide = new LineGlide()
    glide.update(['a', 'b'], 0, 2, LINE, 0)
    expect(glide.update(['b', 'c'], 0, 2, LINE, 5000)).toBe(0)
    expect(glide.isMoving(5000)).toBe(false)
  })
})

describe('physical pixel text placement', () => {
  it('snaps to device pixels instead of whole logical pixels', () => {
    expect(snapToPhysicalPixel(10.3, 1)).toBe(10)
    expect(snapToPhysicalPixel(10.3, 2)).toBe(10.5)
    expect(snapToPhysicalPixel(10.2, 4)).toBe(10.25)
  })

  it('reads the glyph scale from the context transform', () => {
    const ctxAt = (a: number) => ({ getTransform: () => ({ a, b: 0 }) }) as unknown as CanvasRenderingContext2D
    expect(physicalGlyphScale(ctxAt(1))).toBe(1)
    expect(physicalGlyphScale(ctxAt(2))).toBe(2)
    expect(physicalGlyphScale(ctxAt(2.6))).toBe(3)
    expect(physicalGlyphScale({} as CanvasRenderingContext2D)).toBe(1)
  })
})
