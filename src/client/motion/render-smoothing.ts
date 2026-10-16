const SNAP_DISTANCE_SUBTILES = 3
const STALE_AFTER_TICKS = 50

export interface DisplayOffset {
  readonly dx: number
  readonly dy: number
}

interface Point {
  readonly x: number
  readonly y: number
}

interface PositionTrack {
  prev: Point
  curr: Point
  tick: number
  offset: DisplayOffset
}

export const NO_OFFSET: DisplayOffset = Object.freeze({ dx: 0, dy: 0 })

export class RenderSmoother {
  private readonly tracks = new Map<string, PositionTrack>()
  private lastSweepTick = 0

  smooth(key: string, x: number, y: number, tick: number, alpha: number): Point {
    const track = this.tracks.get(key) ?? { prev: { x, y }, curr: { x, y }, tick, offset: NO_OFFSET }
    if (track.tick !== tick) Object.assign(track, { prev: track.curr, tick })
    track.curr = { x, y }
    if (Math.hypot(x - track.prev.x, y - track.prev.y) > SNAP_DISTANCE_SUBTILES) track.prev = track.curr
    const shown = { x: track.prev.x + (x - track.prev.x) * alpha, y: track.prev.y + (y - track.prev.y) * alpha }
    track.offset = { dx: shown.x - x, dy: shown.y - y }
    this.tracks.set(key, track)
    return shown
  }

  displayOffset(key: string): DisplayOffset {
    return this.tracks.get(key)?.offset ?? NO_OFFSET
  }

  sweep(tick: number): void {
    if (tick - this.lastSweepTick < STALE_AFTER_TICKS) return
    this.lastSweepTick = tick
    ;[...this.tracks].filter(([, track]) => tick - track.tick > STALE_AFTER_TICKS).forEach(([key]) => this.tracks.delete(key))
  }
}
