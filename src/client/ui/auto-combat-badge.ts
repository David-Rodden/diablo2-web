import type { D2FontRenderer } from './font.ts'

const CENTER_X = 735
const BASELINE_Y = 500
const WIDTH = 112
const HEIGHT = 14

export interface AutoCombatBadge {
  readonly on: boolean
  readonly key: string
}

export const autoCombatBadgeLabel = ({ on, key }: AutoCombatBadge, lang: 'ENG' | 'CHI'): string => {
  const keyLabel = key === 'SPACE' ? (lang === 'ENG' ? 'Space' : '空格') : key
  return lang === 'ENG' ? `Auto-Fight ${on ? 'ON' : 'OFF'} (${keyLabel})` : `自动战斗 ${on ? '开' : '关'} (${keyLabel})`
}

export function drawAutoCombatBadge(ctx: CanvasRenderingContext2D, font: D2FontRenderer, badge: AutoCombatBadge, offsetX: number, offsetY: number, lang: 'ENG' | 'CHI'): void {
  const x = offsetX + CENTER_X
  const y = offsetY + BASELINE_Y
  ctx.save()
  ctx.fillStyle = 'rgba(8, 6, 4, 0.72)'
  ctx.fillRect(x - WIDTH / 2, y - HEIGHT + 3, WIDTH, HEIGHT)
  ctx.strokeStyle = badge.on ? '#3c8c3c' : '#4a3e2c'
  ctx.strokeRect(x - WIDTH / 2 + 0.5, y - HEIGHT + 3.5, WIDTH - 1, HEIGHT - 1)
  font.drawText(ctx, autoCombatBadgeLabel(badge, lang), x, y, { font: 'font8', color: badge.on ? 'green' : 'gray', align: 'center', shadow: true })
  ctx.restore()
}
