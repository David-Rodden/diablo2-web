import type { D2FontRenderer } from './font.ts'

const CENTER_X = 65
const BASELINE_Y = 500
const HEIGHT = 14
const PADDING = 12

export type PotionShortageKind = 'life' | 'mana'

export const potionShortageLabel = (kind: PotionShortageKind, lang: 'ENG' | 'CHI'): string =>
  lang === 'ENG' ? `No ${kind === 'life' ? 'healing' : 'mana'} potions` : `没有${kind === 'life' ? '治疗' : '法力'}药剂`

export function drawPotionShortageBadge(ctx: CanvasRenderingContext2D, font: D2FontRenderer, kind: PotionShortageKind, offsetX: number, offsetY: number, lang: 'ENG' | 'CHI'): void {
  const label = potionShortageLabel(kind, lang)
  const width = font.measureText(label, 'font8') + PADDING
  const x = offsetX + CENTER_X
  const y = offsetY + BASELINE_Y
  ctx.save()
  ctx.fillStyle = 'rgba(8, 6, 4, 0.72)'
  ctx.fillRect(x - width / 2, y - HEIGHT + 3, width, HEIGHT)
  ctx.strokeStyle = '#8c3030'
  ctx.strokeRect(x - width / 2 + 0.5, y - HEIGHT + 3.5, width - 1, HEIGHT - 1)
  font.drawText(ctx, label, x, y, { font: 'font8', color: 'red', align: 'center', shadow: true })
  ctx.restore()
}
