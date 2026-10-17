import { describe, expect, it } from 'vitest'
import { AutoPotionPlanner, bottomBeltPotions, inventoryPotions, potionShortage, type AutoPotionThresholds, type Potion, type PotionVitals } from '../../src/client/input/auto-potion.ts'
import { CommandMapper } from '../../src/client/input/command-mapper.ts'
import type { HudModel } from '../../src/client/ui-model/hud-model.ts'
import { HudManager } from '../../src/client/ui/hud-manager.ts'
import { ClientWorld } from '../../src/client/world/client-world.ts'
import type { ItemData } from '../../src/netproto/index.ts'

const THRESHOLDS: AutoPotionThresholds = { life: 50, rejuv: 25, mana: 20, merc: 40 }
const belt = (...codes: string[]): Potion[] => codes.map((code, column) => ({ column, code }))
const bag = (...codes: string[]): Potion[] => codes.map((code, index) => ({ itemId: 100 + index, code }))
const vitals = (patch: Partial<PotionVitals> = {}): PotionVitals => ({ life: 100, maxLife: 100, mana: 100, maxMana: 100, mercLifePct: null, ...patch })

describe('auto-potion planner', () => {
  it('does nothing while life and mana are above their thresholds', () => {
    expect(new AutoPotionPlanner().plan(belt('hp3', 'mp3'), vitals({ life: 60, mana: 30 }), THRESHOLDS, 0)).toBeNull()
  })

  it('picks the smallest healing potion that covers the missing life', () => {
    expect(new AutoPotionPlanner().plan(belt('hp5', 'hp2', 'hp3', 'hp1'), vitals({ life: 85, maxLife: 180 }), THRESHOLDS, 0)).toEqual({ column: 2, code: 'hp3', kind: 'life' })
  })

  it('falls back to the largest healing potion when none covers the gap', () => {
    expect(new AutoPotionPlanner().plan(belt('hp1', 'hp2'), vitals({ life: 400, maxLife: 1000 }), THRESHOLDS, 0)).toEqual({ column: 1, code: 'hp2', kind: 'life' })
  })

  it('reaches for the smallest sufficient rejuvenation at critical life', () => {
    const planner = new AutoPotionPlanner()
    expect(planner.plan(belt('hp5', 'rvl', 'rvs'), vitals({ life: 20 }), THRESHOLDS, 0)).toEqual({ column: 2, code: 'rvs', kind: 'life' })
    expect(planner.plan(belt('hp5', 'rvl', 'rvs'), vitals({ life: 10 }), THRESHOLDS, 0)).toEqual({ column: 1, code: 'rvl', kind: 'life' })
  })

  it('waits for a healing potion to finish before drinking another, unless life becomes critical', () => {
    const planner = new AutoPotionPlanner()
    const first = planner.plan(belt('hp3', 'hp3'), vitals({ life: 40 }), THRESHOLDS, 0)!
    planner.record(first, 0)
    expect(planner.plan(belt('hp3'), vitals({ life: 40 }), THRESHOLDS, 500)).toBeNull()
    expect(planner.plan(belt('hp3'), vitals({ life: 40 }), THRESHOLDS, 3_000)).toBeNull()
    expect(planner.plan(belt('hp3'), vitals({ life: 20 }), THRESHOLDS, 3_000)).toEqual({ column: 0, code: 'hp3', kind: 'life' })
    expect(planner.plan(belt('hp3'), vitals({ life: 40 }), THRESHOLDS, 7_000)).toEqual({ column: 0, code: 'hp3', kind: 'life' })
  })

  it('drinks mana potions independently of healing potions', () => {
    const planner = new AutoPotionPlanner()
    planner.record({ column: 0, code: 'hp4', kind: 'life' }, 0)
    expect(planner.plan(belt('hp4', 'mp2', 'mp5'), vitals({ life: 40, mana: 8, maxMana: 48 }), THRESHOLDS, 1_000)).toEqual({ column: 1, code: 'mp2', kind: 'mana' })
  })

  it('never uses a rejuvenation potion just for mana', () => {
    expect(new AutoPotionPlanner().plan(belt('rvl'), vitals({ mana: 5 }), THRESHOLDS, 0)).toBeNull()
  })

  it('feeds the mercenary the strongest healing potion', () => {
    expect(new AutoPotionPlanner().plan(belt('hp2', 'hp4', 'mp1'), vitals({ mercLifePct: 30 }), THRESHOLDS, 0)).toEqual({ column: 1, code: 'hp4', kind: 'merc' })
  })

  it('treats a zero threshold as switched off', () => {
    expect(new AutoPotionPlanner().plan(belt('hp1', 'mp1', 'rvs'), vitals({ life: 10, mana: 0, mercLifePct: 5 }), { life: 0, rejuv: 0, mana: 0, merc: 0 }, 0)).toBeNull()
  })

  it('leaves at least a second between drinks', () => {
    const planner = new AutoPotionPlanner()
    planner.record({ column: 0, code: 'rvs', kind: 'life' }, 0)
    expect(planner.plan(belt('rvs'), vitals({ life: 10 }), THRESHOLDS, 900)).toBeNull()
    expect(planner.plan(belt('rvs'), vitals({ life: 10 }), THRESHOLDS, 1_000)).not.toBeNull()
  })

  it('drinks from the inventory before touching the belt', () => {
    const planner = new AutoPotionPlanner()
    expect(planner.plan([...belt('hp3'), ...bag('mp1', 'hp2', 'hp4')], vitals({ life: 45 }), THRESHOLDS, 0)).toEqual({ itemId: 101, code: 'hp2', kind: 'life' })
    expect(planner.plan([...belt('rvl'), ...bag('rvs')], vitals({ life: 20 }), THRESHOLDS, 0)).toEqual({ itemId: 100, code: 'rvs', kind: 'life' })
  })

  it('falls back to the belt when the inventory has none of the needed potion', () => {
    expect(new AutoPotionPlanner().plan([...bag('hp5'), ...belt('mp2')], vitals({ mana: 8, maxMana: 50 }), THRESHOLDS, 0)).toEqual({ column: 0, code: 'mp2', kind: 'mana' })
  })

  it('feeds the mercenary from the belt only', () => {
    expect(new AutoPotionPlanner().plan([...bag('hp5'), ...belt('hp1')], vitals({ mercLifePct: 30 }), THRESHOLDS, 0)).toEqual({ column: 0, code: 'hp1', kind: 'merc' })
    expect(new AutoPotionPlanner().plan(bag('hp5'), vitals({ mercLifePct: 30 }), THRESHOLDS, 0)).toBeNull()
  })

  it('does nothing once the player is dead', () => {
    expect(new AutoPotionPlanner().plan(belt('rvl'), vitals({ life: 0 }), THRESHOLDS, 0)).toBeNull()
  })
})

describe('belt reading', () => {
  it('only offers the bottom potion of each column', () => {
    expect(bottomBeltPotions([{ code: 'hp1', gridX: 4 }, { code: 'mp2 ', gridX: 1 }, { code: 'hp3', gridX: 8 }, { code: 'rvl', gridX: 13 }])).toEqual([
      { column: 1, code: 'mp2' },
      { column: 0, code: 'hp1' },
    ])
  })

  it('reads drinkable potions from the inventory and ignores everything else', () => {
    expect(inventoryPotions([{ id: 7, code: 'hp4 ' }, { id: 8, code: 'tsc' }, { id: 9, code: 'rvs' }, { id: 10, code: 'yps' }])).toEqual([
      { itemId: 7, code: 'hp4' },
      { itemId: 9, code: 'rvs' },
    ])
  })

  it('counts inventory potions as supply', () => {
    expect(potionShortage(bag('hp1'), THRESHOLDS, vitals())).toBeNull()
  })

  it('always warns about a missing healing supply but about mana only while mana is low', () => {
    expect(potionShortage(belt('mp1'), THRESHOLDS, vitals())).toBe('life')
    expect(potionShortage(belt('hp1'), THRESHOLDS, vitals())).toBeNull()
    expect(potionShortage(belt('hp1'), THRESHOLDS, vitals({ mana: 10 }))).toBe('mana')
    expect(potionShortage(belt('rvs'), THRESHOLDS, vitals())).toBeNull()
    expect(potionShortage([], { ...THRESHOLDS, life: 0, mana: 0 }, vitals({ mana: 0 }))).toBeNull()
  })
})

const putInBelt = (world: ClientWorld, id: number, code: string, slot: number) =>
  world.apply({
    type: 'ItemEvent',
    action: 0,
    container: 'belt',
    item: { id, itemId: id, code, rawCode: `${code} `, container: 'belt', action: 0, flags: 0x00200010, rawFlags: 0x00200010, gridX: slot, gridY: 0, x: slot, y: 0 } as unknown as ItemData,
  })

const putInInventory = (world: ClientWorld, id: number, code: string) =>
  world.apply({
    type: 'ItemEvent',
    action: 0,
    container: 'inventory',
    item: { id, itemId: id, code, rawCode: `${code} `, container: 'inventory', action: 0, flags: 0x00200010, rawFlags: 0x00200010, gridX: 0, gridY: 0, x: 0, y: 0 } as unknown as ItemData,
  })

const createMapperSetup = () => {
  const world = new ClientWorld()
  world.apply({ type: 'UnitAssign', unit: { unitType: 0, id: 1, classId: 1, name: 'Hero', x: 5000, y: 5000 }, isSelf: true })
  const hudManager = new HudManager()
  Object.assign(hudManager, { hp: 100, maxHp: 100, mana: 50, maxMana: 50 })
  const drinks: { col: number; toMerc: boolean }[] = []
  const used: number[] = []
  const hudModel = { useBeltSlot: (col: number, toMerc: boolean) => drinks.push({ col, toMerc }) > 0, useItem: (itemId: number) => void used.push(itemId) } as unknown as HudModel
  const mapper = new CommandMapper({ world, hudManager, hudModel })
  mapper.autoPotionThresholds = THRESHOLDS
  return { world, hudManager, mapper, drinks, used }
}

describe('auto-potion in the command mapper', () => {
  it('drinks from the belt column holding the chosen potion', () => {
    const { world, hudManager, mapper, drinks } = createMapperSetup()
    putInBelt(world, 41, 'mp3', 0)
    putInBelt(world, 42, 'hp2', 1)
    hudManager.hp = 30
    mapper.drinkPotionsIfLow(1_000)
    expect(drinks).toEqual([{ col: 1, toMerc: false }])
  })

  it('uses an inventory potion ahead of the belt', () => {
    const { world, hudManager, mapper, drinks, used } = createMapperSetup()
    putInBelt(world, 71, 'hp2', 0)
    putInInventory(world, 72, 'hp2')
    hudManager.hp = 30
    mapper.drinkPotionsIfLow(1_000)
    expect([used, drinks]).toEqual([[72], []])
  })

  it('warns when the belt has no healing potions and clears the warning when disabled', () => {
    const { world, hudManager, mapper } = createMapperSetup()
    putInBelt(world, 51, 'mp3', 0)
    mapper.drinkPotionsIfLow(1_000)
    expect(hudManager.potionShortage).toBe('life')
    mapper.autoPotionThresholds = null
    mapper.drinkPotionsIfLow(1_040)
    expect(hudManager.potionShortage).toBeNull()
  })

  it('stays idle in town', () => {
    const { world, hudManager, mapper, drinks } = createMapperSetup()
    world.apply({ type: 'LoadAct', act: 0, areaId: 1, mapSeed: 1 } as never)
    putInBelt(world, 61, 'hp2', 0)
    hudManager.hp = 10
    mapper.drinkPotionsIfLow(1_000)
    expect([drinks, hudManager.potionShortage]).toEqual([[], null])
  })
})
