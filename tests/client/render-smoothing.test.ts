import { describe, expect, it } from 'vitest'
import { RenderSmoother } from '../../src/client/motion/render-smoothing.ts'

describe('RenderSmoother', () => {
  it('returns the tick position the first time a unit is seen', () => {
    const smoother = new RenderSmoother()
    expect(smoother.smooth('player:1', 100, 200, 1, 0.5)).toEqual({ x: 100, y: 200 })
  })

  it('blends between the previous and current tick positions by alpha', () => {
    const smoother = new RenderSmoother()
    smoother.smooth('player:1', 100, 200, 1, 1)
    expect(smoother.smooth('player:1', 101, 202, 2, 0)).toEqual({ x: 100, y: 200 })
    expect(smoother.smooth('player:1', 101, 202, 2, 0.5)).toEqual({ x: 100.5, y: 201 })
    expect(smoother.smooth('player:1', 101, 202, 2, 1)).toEqual({ x: 101, y: 202 })
  })

  it('advances the blend start only when a new tick arrives', () => {
    const smoother = new RenderSmoother()
    smoother.smooth('missile:7', 0, 0, 1, 1)
    smoother.smooth('missile:7', 1, 0, 2, 0.25)
    smoother.smooth('missile:7', 1, 0, 2, 0.75)
    expect(smoother.smooth('missile:7', 2, 0, 3, 0.5)).toEqual({ x: 1.5, y: 0 })
  })

  it('snaps instead of blending across teleports', () => {
    const smoother = new RenderSmoother()
    smoother.smooth('player:1', 100, 100, 1, 1)
    expect(smoother.smooth('player:1', 180, 140, 2, 0.5)).toEqual({ x: 180, y: 140 })
    expect(smoother.smooth('player:1', 181, 140, 3, 0.5)).toEqual({ x: 180.5, y: 140 })
  })

  it('keeps units independent', () => {
    const smoother = new RenderSmoother()
    smoother.smooth('monster:1', 0, 0, 1, 1)
    smoother.smooth('monster:2', 10, 10, 1, 1)
    expect(smoother.smooth('monster:1', 2, 0, 2, 0.5)).toEqual({ x: 1, y: 0 })
    expect(smoother.smooth('monster:2', 10, 10, 2, 0.5)).toEqual({ x: 10, y: 10 })
  })

  it('reports how far the drawn position trails the tick position', () => {
    const smoother = new RenderSmoother()
    expect(smoother.displayOffset('monster:9')).toEqual({ dx: 0, dy: 0 })
    smoother.smooth('monster:9', 10, 10, 1, 1)
    smoother.smooth('monster:9', 12, 11, 2, 0.25)
    expect(smoother.displayOffset('monster:9')).toEqual({ dx: -1.5, dy: -0.75 })
    smoother.smooth('monster:9', 60, 60, 3, 0.25)
    expect(smoother.displayOffset('monster:9')).toEqual({ dx: 0, dy: 0 })
  })

  it('forgets units that have not been seen for a long time', () => {
    const smoother = new RenderSmoother()
    smoother.smooth('item:3', 5, 5, 1, 1)
    smoother.sweep(200)
    expect(smoother.smooth('item:3', 6, 6, 200, 0)).toEqual({ x: 6, y: 6 })
  })
})
