import { describe, expect, it } from 'vitest'
import { D2_EXPERIENCE_TABLE_99 } from '../../src/common/skills/formulas.ts'
import { drawXpBar, xpBarLabel, xpProgress } from '../../src/client/ui/xp-bar.ts'
import type { D2FontRenderer } from '../../src/client/ui/font.ts'

const at = (level: number, fraction: number) => {
  const currentLevelXp = D2_EXPERIENCE_TABLE_99[level]!
  const nextLevelXp = D2_EXPERIENCE_TABLE_99[level + 1]!
  return { level, xp: currentLevelXp + (nextLevelXp - currentLevelXp) * fraction, currentLevelXp, nextLevelXp }
}

describe('experience bar', () => {
  it('measures progress within the current level, not total experience', () => {
    expect(xpProgress(at(1, 0))).toBe(0)
    expect(xpProgress(at(30, 0.374))).toBeCloseTo(0.374)
    expect(xpProgress({ level: 99, xp: 3_520_485_254, currentLevelXp: 3_520_485_254, nextLevelXp: 0 })).toBe(1)
  })

  it('labels the level and the percentage rounded down to a tenth', () => {
    expect(xpBarLabel(at(12, 0.3749), 'ENG')).toBe('Level 12: 37.4%')
    expect(xpBarLabel(at(12, 0.9999), 'CHI')).toBe('等级 12: 99.9%')
  })

  it('fills the bar in proportion to progress, centred in the viewport', () => {
    const rects: number[][] = []
    const ctx = { save() {}, restore() {}, strokeRect() {}, fillRect: (...r: number[]) => void rects.push(r) } as unknown as CanvasRenderingContext2D
    const texts: string[] = []
    const font = { drawText: (_: unknown, text: string) => void texts.push(text) } as unknown as D2FontRenderer
    drawXpBar(ctx, font, at(5, 0.5), 800, 'ENG')
    expect(rects[0]).toEqual([250, 4, 300, 13])
    expect(rects[1]![2]).toBeCloseTo(149)
    expect(texts).toEqual(['Level 5: 50.0%'])
  })
})
