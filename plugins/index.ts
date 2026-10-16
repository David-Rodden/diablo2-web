/**
 * Built-in plugins registry (`plugins/index.ts`).
 */

import type { D2WebPlugin } from '../src/client/plugin-host/api.ts'
import { autoCombatPlugin } from './auto-combat/index.ts'
import { autoGoldPickupPlugin } from './auto-gold-pickup/index.ts'
import { automapRevealPlugin } from './automap-reveal/index.ts'
import { dragInteractPlugin } from './drag-interact/index.ts'
import { dropTrackerPlugin } from './drop-tracker/index.ts'
import { experienceBarPlugin } from './experience-bar/index.ts'
import { extendedViewportsPlugin } from './extended-viewports/index.ts'
import { groundItemBeamPlugin } from './ground-item-beam/index.ts'
import { hudEnhancementsPlugin } from './hud-enhancements/index.ts'
import { killStatsPlugin } from './kill-stats/index.ts'
import { quickCastPlugin } from './quick-cast/index.ts'
import { smoothTextPlugin } from './smooth-text/index.ts'
import { stashDepositAllPlugin } from './stash-deposit-all/index.ts'

export const BUILTIN_PLUGINS: readonly D2WebPlugin[] = [
  killStatsPlugin,
  dropTrackerPlugin,
  automapRevealPlugin,
  extendedViewportsPlugin,
  hudEnhancementsPlugin,
  groundItemBeamPlugin,
  quickCastPlugin,
  dragInteractPlugin,
  smoothTextPlugin,
  stashDepositAllPlugin,
  experienceBarPlugin,
  autoGoldPickupPlugin,
  autoCombatPlugin,
]
