const MAX_PIXEL_SCALE = 4
const SCALE_EPSILON = 0.02

export const crispPixelScale = (displayScale: number): number =>
  Number.isFinite(displayScale) && displayScale > 1 ? Math.min(MAX_PIXEL_SCALE, Math.ceil(displayScale - SCALE_EPSILON)) : 1

export const crispRenderDpr = (uiScale: number, dpr: number): number =>
  Number.isFinite(uiScale) && uiScale > 0 ? crispPixelScale(uiScale * dpr) / uiScale : dpr

export const devicePixelRatioOrOne = (): number =>
  typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1

export const crispCanvasScale = (canvas: HTMLCanvasElement, nativeWidth: number, nativeHeight: number): number =>
  crispPixelScale(Math.max(canvas.clientWidth / nativeWidth, canvas.clientHeight / nativeHeight) * devicePixelRatioOrOne())

export const syncCrispBackingStore = (canvas: HTMLCanvasElement, nativeWidth: number, nativeHeight: number): number => {
  const scale = crispCanvasScale(canvas, nativeWidth, nativeHeight)
  if (canvas.width !== nativeWidth * scale || canvas.height !== nativeHeight * scale) Object.assign(canvas, { width: nativeWidth * scale, height: nativeHeight * scale })
  return scale
}

export const syncPhysicalBackingStore = (canvas: HTMLCanvasElement): void => {
  const [width, height] = [canvas.clientWidth, canvas.clientHeight].map((css) => Math.max(1, Math.round(css * devicePixelRatioOrOne())))
  if (canvas.width !== width || canvas.height !== height) Object.assign(canvas, { width, height })
}
