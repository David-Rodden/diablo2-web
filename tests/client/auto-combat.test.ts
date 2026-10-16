import { describe, expect, it } from 'vitest'
import { CommandMapper, ViewportCamera } from '../../src/client/input/command-mapper.ts'
import { LocalMovementPredictor } from '../../src/client/motion/predictor.ts'
import { HudModel } from '../../src/client/ui-model/hud-model.ts'
import { HudManager } from '../../src/client/ui/hud-manager.ts'
import { ClientWorld } from '../../src/client/world/client-world.ts'
import type { ClientCommand } from '../../src/netproto/index.ts'

const createSetup = (areaId = 2) => {
  const world = new ClientWorld()
  world.apply({ type: 'LoadAct', act: 0, mapSeed: 0x11223344, areaId })
  world.apply({ type: 'UnitAssign', unit: { unitType: 0, id: 1, classId: 1, name: 'Hero', x: 100, y: 100 }, isSelf: true })
  const hudManager = new HudManager()
  hudManager.resize(800, 600)
  const predictor = new LocalMovementPredictor({ initialX: 100, initialY: 100 })
  const camera = new ViewportCamera('800x600')
  camera.snapTo(100, 100)
  const sent: ClientCommand[] = []
  const hudModel = new HudModel({ world, hudManager, predictor, onCommand: (cmd) => sent.push(cmd) })
  const mapper = new CommandMapper({ world, camera, hudManager, hudModel, predictor, sendCommand: (cmd) => sent.push(cmd) })
  mapper.autoCombatKey = 'E'
  const spawn = (id: number, classId: number, x: number, y: number) =>
    world.apply({ type: 'UnitAssign', unit: { unitType: 1, id, classId, name: 'Monster', x, y, lifePct: 128, mode: 1 } })
  const attacked = () => sent.flatMap((c) => (c.type === 'SkillOn' ? [c.target.id] : []))
  const barTarget = () => (hudModel as unknown as { hoveredMonsterId: number | null }).hoveredMonsterId
  const fightFor = (fromMs: number, toMs: number) => {
    for (let t = fromMs; t <= toMs; t += 40) mapper.tickAssists(t)
  }
  return { world, mapper, sent, spawn, attacked, barTarget, fightFor, camera, hud: hudManager }
}

describe('auto-fight toggle', () => {
  it('toggles on with one press, keeps fighting without holding, and toggles off with the next press', () => {
    const s = createSetup()
    s.spawn(901, 19, 103, 100)
    s.fightFor(1000, 1200)
    expect(s.attacked()).toEqual([])
    s.mapper.handleKeyDown({ key: 'e' })
    s.mapper.handleKeyUp({ key: 'e' })
    s.mapper.handleKeyDown({ key: 'e', repeat: true })
    s.fightFor(1240, 1400)
    const whileOn = s.attacked().length
    expect(s.hud.autoCombatBadge).toEqual({ on: true, key: 'E' })
    s.mapper.handleKeyDown({ key: 'e' })
    s.fightFor(1440, 1700)
    expect(whileOn).toBeGreaterThan(0)
    expect(s.attacked().length).toBe(whileOn)
    expect(s.hud.autoCombatBadge).toEqual({ on: false, key: 'E' })
  })

  it('removes the indicator and switches off when the plugin unbinds the key', () => {
    const s = createSetup()
    s.mapper.handleKeyDown({ key: 'e' })
    s.mapper.autoCombatKey = null
    s.spawn(901, 19, 103, 100)
    s.fightFor(1000, 1200)
    expect([s.attacked(), s.hud.autoCombatBadge]).toEqual([[], null])
  })

  it('attacks the nearest on-screen enemy, including ones out of melee range', () => {
    const s = createSetup()
    s.spawn(901, 19, 110, 100)
    s.spawn(902, 19, 106, 101)
    s.mapper.handleKeyDown({ key: 'E' })
    s.fightFor(1000, 1000)
    expect(s.attacked()).toEqual([902])
  })

  it('sticks with its target until it dies, then moves to the next', () => {
    const s = createSetup()
    s.spawn(901, 19, 104, 100)
    s.mapper.handleKeyDown({ key: 'E' })
    s.fightFor(1000, 1000)
    s.spawn(902, 19, 101, 100)
    s.fightFor(1040, 1200)
    expect(new Set(s.attacked())).toEqual(new Set([901]))
    s.world.getUnit('monster', 901)!.lifePct = 0
    s.fightFor(1240, 1300)
    expect(s.attacked().at(-1)).toBe(902)
  })

  it('ignores enemies off screen and town NPCs', () => {
    const s = createSetup(1)
    s.spawn(901, 19, 160, 160)
    s.spawn(148, 148, 102, 100)
    s.mapper.handleKeyDown({ key: 'E' })
    s.fightFor(1000, 1200)
    expect(s.attacked()).toEqual([])
  })

  it('shows the fought monster in the health bar even when the cursor rests elsewhere', () => {
    const s = createSetup()
    s.spawn(901, 19, 103, 100)
    s.mapper.handleKeyDown({ key: 'E' })
    s.fightFor(1000, 1000)
    const ground = s.camera.subtileToScreen(90, 110)
    s.mapper.handlePointerMove(ground.x, ground.y, 1020)
    expect(s.barTarget()).toBe(901)
  })
})

describe('monster health bar while holding the mouse', () => {
  it('follows the monster a drag-attack hits, not the press point', () => {
    const s = createSetup()
    s.mapper.dragInteractMode = true
    s.world.getUnit('player', 1)!.mode = 3
    s.spawn(901, 19, 103, 100)
    const ground = s.camera.subtileToScreen(100, 94)
    s.mapper.handlePointerDown(ground.x, ground.y, 0, 1000)
    const monster = s.camera.subtileToScreen(103, 100)
    s.mapper.handlePointerMove(monster.x, monster.y, 1050)
    s.mapper.tick(1100)
    expect(s.barTarget()).toBe(901)
  })
})

describe('clicking with a side panel open', () => {
  it('hits the monster where it is drawn after the camera shifts for the panel', async () => {
    const { subTileToScreen, computePanelCameraShift } = await import('../../src/client/view/viewport-profile.ts')
    const s = createSetup()
    s.spawn(901, 19, 96, 104)
    for (const [left, right] of [['char', 'none'], ['none', 'inv']] as const) {
      s.hud.leftPanel = left
      s.hud.rightPanel = right
      const drawn = subTileToScreen(96, 104, 100, 100, s.camera.viewportProfile, computePanelCameraShift(left !== 'none', right !== 'none'))
      expect(s.mapper.resolvePointerTarget(drawn.x, drawn.y).hoveredUnit?.id).toBe(901)
    }
  })
})
