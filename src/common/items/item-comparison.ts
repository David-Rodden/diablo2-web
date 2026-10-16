import type { EquipSlotId, UiInventoryItem } from './inventory-model.ts'

export type UpgradeVerdict = 'much-better' | 'better' | 'unsure'

const FOLDED_OR_NOISE_STATS = new Set([16, 17, 18, 21, 22, 23, 24, 31, 70, 72, 73, 75, 91, 92, 159, 160, 194])
const MUCH_BETTER_RATIO = 1.5
const MUCH_BETTER_GAINS = 3
const RANK: Record<UpgradeVerdict, number> = { unsure: 1, better: 2, 'much-better': 3 }

type EquippedSlots = Partial<Record<EquipSlotId, UiInventoryItem | null | undefined>>

const damageOf = (item: UiInventoryItem) => (item.twoHanded ? item.twoHandDamage : item.oneHandDamage ?? item.twoHandDamage)

const isWeapon = (item: UiInventoryItem): boolean => damageOf(item) !== undefined

const primaryOf = (item: UiInventoryItem): number => {
  const damage = damageOf(item)
  return damage ? (damage.min + damage.max) / 2 : item.defense ?? 0
}

interface StatEntry {
  readonly statId: number
  readonly param: number
  readonly value: number
}

const statEntries = (stats: unknown): [string, number][] =>
  Array.isArray(stats)
    ? (stats as StatEntry[]).filter((s) => !FOLDED_OR_NOISE_STATS.has(s.statId)).map((s) => [`${s.statId}:${s.param}`, s.value])
    : Object.entries((stats ?? {}) as Record<string, number>)

const statsOf = (item: UiInventoryItem): Map<string, number> =>
  [item, ...(item.socketedItems ?? [])]
    .flatMap((part) => {
      const raw = part.rawItem as { readonly stats?: unknown; readonly runewordStats?: unknown } | undefined
      return [...statEntries(raw?.stats), ...statEntries(raw?.runewordStats)]
    })
    .reduce((acc, [key, value]) => acc.set(key, (acc.get(key) ?? 0) + value), new Map<string, number>())

export function compareItems(candidate: UiInventoryItem, current: UiInventoryItem | null): UpgradeVerdict | null {
  if (current === null) return 'much-better'
  const [mine, theirs] = [statsOf(candidate), statsOf(current)]
  const [primary, rivalPrimary] = [primaryOf(candidate), primaryOf(current)]
  const diffs = [primary - rivalPrimary, ...[...new Set([...mine.keys(), ...theirs.keys()])].map((key) => (mine.get(key) ?? 0) - (theirs.get(key) ?? 0))]
  const gains = diffs.filter((d) => d > 0).length
  if (gains === 0) return null
  if (diffs.some((d) => d < 0)) return 'unsure'
  const much = rivalPrimary > 0 ? primary >= rivalPrimary * MUCH_BETTER_RATIO : gains >= MUCH_BETTER_GAINS
  return much ? 'much-better' : 'better'
}

export function upgradeVerdict(
  candidate: UiInventoryItem,
  equipped: EquippedSlots,
  { canUse, unidentified }: { readonly canUse: boolean; readonly unidentified: boolean },
): UpgradeVerdict | null {
  const [primarySlot] = candidate.allowedSlots
  if (!canUse || primarySlot === undefined) return null
  if (unidentified) return 'unsure'
  const verdicts = candidate.allowedSlots
    .map((slot) => ({ slot, current: equipped[slot] ?? null }))
    .filter(({ slot, current }) => (current ? current !== candidate && isWeapon(current) === isWeapon(candidate) : slot === primarySlot || slot.startsWith('ring')))
    .map(({ current }) => compareItems(candidate, current))
    .filter((v): v is UpgradeVerdict => v !== null)
  const best = verdicts.sort((a, b) => RANK[b] - RANK[a])[0] ?? null
  return best !== null && candidate.twoHanded && equipped.weapon2 ? 'unsure' : best
}
