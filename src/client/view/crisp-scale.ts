const MAX_PIXEL_SCALE = 4
const SCALE_EPSILON = 0.02

export function crispPixelScale(displayScale: number): number {
  if (!Number.isFinite(displayScale) || displayScale <= 1) return 1
  return Math.min(MAX_PIXEL_SCALE, Math.ceil(displayScale - SCALE_EPSILON))
}

export function crispRenderDpr(uiScale: number, dpr: number): number {
  if (!Number.isFinite(uiScale) || uiScale <= 0) return dpr
  return crispPixelScale(uiScale * dpr) / uiScale
}

export function crispCanvasScale(canvas: HTMLCanvasElement, nativeWidth: number, nativeHeight: number): number {
  const displayScale = Math.max(canvas.clientWidth / nativeWidth, canvas.clientHeight / nativeHeight)
  return crispPixelScale(displayScale * devicePixelRatioOrOne())
}

export function devicePixelRatioOrOne(): number {
  return typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1
}
