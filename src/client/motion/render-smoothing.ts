const SNAP_DISTANCE_SUBTILES = 3
const STALE_AFTER_TICKS = 50
const NO_OFFSET = Object.freeze({ dx: 0, dy: 0 })

interface PositionTrack {
  prevX: number
  prevY: number
  currX: number
  currY: number
  tick: number
  offsetX: number
  offsetY: number
}

export interface DisplayOffset {
  readonly dx: number
  readonly dy: number
}

export class RenderSmoother {
  private readonly tracks = new Map<string, PositionTrack>()
  private lastSweepTick = 0

  smooth(
    key: string,
    x: number,
    y: number,
    tick: number,
    alpha: number,
  ): { readonly x: number; readonly y: number } {
    const track = this.tracks.get(key)
    if (track === undefined) {
      this.tracks.set(key, { prevX: x, prevY: y, currX: x, currY: y, tick, offsetX: 0, offsetY: 0 })
      return { x, y }
    }
    if (track.tick !== tick) {
      track.prevX = track.currX
      track.prevY = track.currY
      track.tick = tick
    }
    track.currX = x
    track.currY = y
    const dx = track.currX - track.prevX
    const dy = track.currY - track.prevY
    if (dx * dx + dy * dy > SNAP_DISTANCE_SUBTILES * SNAP_DISTANCE_SUBTILES) {
      track.prevX = x
      track.prevY = y
      track.offsetX = 0
      track.offsetY = 0
      return { x, y }
    }
    const shownX = track.prevX + dx * alpha
    const shownY = track.prevY + dy * alpha
    track.offsetX = shownX - x
    track.offsetY = shownY - y
    return { x: shownX, y: shownY }
  }

  displayOffset(key: string): DisplayOffset {
    const track = this.tracks.get(key)
    return track === undefined ? NO_OFFSET : { dx: track.offsetX, dy: track.offsetY }
  }

  sweep(tick: number): void {
    if (tick - this.lastSweepTick < STALE_AFTER_TICKS) return
    this.lastSweepTick = tick
    for (const [key, track] of this.tracks) {
      if (tick - track.tick > STALE_AFTER_TICKS) this.tracks.delete(key)
    }
  }
}
