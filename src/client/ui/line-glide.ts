const GLIDE_TIME_CONSTANT_MS = 55
const SETTLED_PX = 0.2
const STALE_AFTER_MS = 250
const MAX_GLIDE_LINES = 6

export class LineGlide {
  private offsetPx = 0
  private lastMs: number | null = null
  private previousWindow: readonly string[] = []

  update(keys: readonly string[], start: number, count: number, lineHeight: number, nowMs: number): number {
    const fresh = this.lastMs !== null && nowMs - this.lastMs <= STALE_AFTER_MS
    if (fresh) {
      const dt = nowMs - this.lastMs!
      this.offsetPx *= Math.exp(-dt / GLIDE_TIME_CONSTANT_MS)
      this.offsetPx += this.shiftSinceLastWindow(keys, start, lineHeight)
      const limit = MAX_GLIDE_LINES * lineHeight
      this.offsetPx = Math.max(-limit, Math.min(limit, this.offsetPx))
      if (Math.abs(this.offsetPx) < SETTLED_PX) this.offsetPx = 0
    } else {
      this.offsetPx = 0
    }
    this.lastMs = nowMs
    this.previousWindow = keys.slice(start, start + count)
    return this.offsetPx
  }

  isMoving(nowMs: number): boolean {
    return this.offsetPx !== 0 && this.lastMs !== null && nowMs - this.lastMs <= STALE_AFTER_MS
  }

  private shiftSinceLastWindow(keys: readonly string[], start: number, lineHeight: number): number {
    if (this.previousWindow.length === 0) return 0
    const position = new Map<string, number>()
    keys.forEach((key, index) => position.set(key, index))
    for (let row = 0; row < this.previousWindow.length; row++) {
      const index = position.get(this.previousWindow[row]!)
      if (index !== undefined) return (row - (index - start)) * lineHeight
    }
    return 0
  }
}
