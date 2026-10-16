import type { D2FontRenderer } from './font.ts'

const BAR_WIDTH = 300
const BAR_HEIGHT = 13
const BAR_TOP = 4

export interface XpBarState {
  readonly level: number
  readonly xp: number
  readonly currentLevelXp: number
  readonly nextLevelXp: number
}

export const xpProgress = ({ xp, currentLevelXp, nextLevelXp }: XpBarState): number =>
  nextLevelXp > currentLevelXp ? Math.max(0, Math.min(1, (xp - currentLevelXp) / (nextLevelXp - currentLevelXp))) : 1

export const xpBarLabel = (state: XpBarState, lang: 'ENG' | 'CHI'): string =>
  `${lang === 'ENG' ? 'Level' : '等级'} ${state.level}: ${(Math.floor(xpProgress(state) * 1000) / 10).toFixed(1)}%`

export function drawXpBar(ctx: CanvasRenderingContext2D, font: D2FontRenderer, state: XpBarState, viewportWidth: number, lang: 'ENG' | 'CHI'): void {
  const x = Math.round((viewportWidth - BAR_WIDTH) / 2)
  ctx.save()
  ctx.fillStyle = 'rgba(8, 6, 4, 0.78)'
  ctx.fillRect(x, BAR_TOP, BAR_WIDTH, BAR_HEIGHT)
  ctx.fillStyle = 'rgba(176, 148, 82, 0.85)'
  ctx.fillRect(x + 1, BAR_TOP + 1, (BAR_WIDTH - 2) * xpProgress(state), BAR_HEIGHT - 2)
  ctx.strokeStyle = '#6c5838'
  ctx.strokeRect(x + 0.5, BAR_TOP + 0.5, BAR_WIDTH - 1, BAR_HEIGHT - 1)
  font.drawText(ctx, xpBarLabel(state, lang), x + BAR_WIDTH / 2, BAR_TOP + BAR_HEIGHT - 2, { font: 'font8', color: 'white', align: 'center', shadow: true })
  ctx.restore()
}
