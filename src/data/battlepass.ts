// Battle pass: a free track and a premium track (bought for coins), each with its own quests.
// Quest progress is computed from lifetime player stats; premium counts only from the moment it was bought.

export const PREMIUM_PRICE = 3000
export const SEASON_NAME = "Сезон 1 · Брейнрот-лихорадка"

export type StatKey =
  | "cases"
  | "paidCases"
  | "bonusCases"
  | "upgrades"
  | "upgradeWins"
  | "crash"
  | "crashWins"
  | "dice"
  | "diceWins"
  | "spent"
  | "brainrots"
  | "mutations"

export type Stats = Partial<Record<StatKey, number>>

export type BpReward =
  | { kind: "coins"; amount: number }
  | { kind: "case"; caseId: string; amount: number }
  | { kind: "brainrot"; id: string }

export interface BpTier {
  id: string
  stat: StatKey
  target: number
  quest: string
  reward: BpReward
}

export type TrackId = "free" | "premium"

export interface BpState {
  premium: boolean
  /** Stats snapshot taken when premium was bought. */
  premiumBase: Stats
  claimed: Record<TrackId, string[]>
}

export const EMPTY_BP: BpState = { premium: false, premiumBase: {}, claimed: { free: [], premium: [] } }

export const FREE_TRACK: BpTier[] = [
  { id: "f1", stat: "cases", target: 3, quest: "Открой 3 кейса", reward: { kind: "coins", amount: 100 } },
  { id: "f2", stat: "crash", target: 3, quest: "Сыграй 3 раунда в Crash", reward: { kind: "coins", amount: 150 } },
  { id: "f3", stat: "upgrades", target: 2, quest: "Сделай 2 апгрейда", reward: { kind: "case", caseId: "secret", amount: 1 } },
  { id: "f4", stat: "dice", target: 5, quest: "Брось кубик 5 раз", reward: { kind: "coins", amount: 250 } },
  { id: "f5", stat: "brainrots", target: 5, quest: "Выбей 5 брейнротов", reward: { kind: "coins", amount: 300 } },
  { id: "f6", stat: "bonusCases", target: 3, quest: "Открой 3 бонусных кейса", reward: { kind: "case", caseId: "lucky", amount: 1 } },
  { id: "f7", stat: "spent", target: 2000, quest: "Потрать 2 000 монет", reward: { kind: "coins", amount: 400 } },
  { id: "f8", stat: "crashWins", target: 3, quest: "Забери выигрыш в Crash 3 раза", reward: { kind: "coins", amount: 500 } },
  { id: "f9", stat: "cases", target: 15, quest: "Открой 15 кейсов", reward: { kind: "case", caseId: "halloween", amount: 1 } },
  { id: "f10", stat: "mutations", target: 1, quest: "Выбей брейнрота с мутацией", reward: { kind: "brainrot", id: "draculino" } },
]

export const PREMIUM_TRACK: BpTier[] = [
  { id: "p1", stat: "cases", target: 5, quest: "Открой 5 кейсов", reward: { kind: "coins", amount: 500 } },
  { id: "p2", stat: "upgradeWins", target: 3, quest: "Выиграй 3 апгрейда", reward: { kind: "case", caseId: "sea", amount: 2 } },
  { id: "p3", stat: "crash", target: 10, quest: "Сыграй 10 раундов в Crash", reward: { kind: "coins", amount: 800 } },
  { id: "p4", stat: "diceWins", target: 5, quest: "Выиграй 5 раз в Dice", reward: { kind: "brainrot", id: "fragrama-and-chocrama" } },
  { id: "p5", stat: "spent", target: 5000, quest: "Потрать 5 000 монет", reward: { kind: "coins", amount: 1200 } },
  { id: "p6", stat: "paidCases", target: 10, quest: "Открой 10 платных кейсов", reward: { kind: "case", caseId: "crystal", amount: 2 } },
  { id: "p7", stat: "brainrots", target: 15, quest: "Выбей 15 брейнротов", reward: { kind: "coins", amount: 1500 } },
  { id: "p8", stat: "mutations", target: 2, quest: "Выбей 2 мутации", reward: { kind: "brainrot", id: "digi-narwhal" } },
  { id: "p9", stat: "spent", target: 15000, quest: "Потрать 15 000 монет", reward: { kind: "case", caseId: "og", amount: 1 } },
  { id: "p10", stat: "cases", target: 40, quest: "Открой 40 кейсов", reward: { kind: "brainrot", id: "skibidi-toilet" } },
]

export const TRACKS: Record<TrackId, BpTier[]> = { free: FREE_TRACK, premium: PREMIUM_TRACK }

/** Progress of one quest. Premium quests count only what happened after the pass was bought. */
export function tierProgress(track: TrackId, tier: BpTier, stats: Stats, bp: BpState) {
  const total = stats[tier.stat] ?? 0
  const base = track === "premium" ? (bp.premiumBase[tier.stat] ?? 0) : 0
  const value = track === "premium" && !bp.premium ? 0 : Math.max(0, total - base)
  return { value: Math.min(value, tier.target), done: value >= tier.target }
}

export type ClaimCheck = "ok" | "locked" | "not-done" | "claimed" | "unknown"

export function canClaim(track: TrackId, tierId: string, stats: Stats, bp: BpState): ClaimCheck {
  const tier = TRACKS[track].find((t) => t.id === tierId)
  if (!tier) return "unknown"
  if (track === "premium" && !bp.premium) return "locked"
  if (bp.claimed[track].includes(tierId)) return "claimed"
  return tierProgress(track, tier, stats, bp).done ? "ok" : "not-done"
}

export function canBuyPremium(balance: number, bp: BpState) {
  return !bp.premium && balance >= PREMIUM_PRICE
}

export function normalizeBp(raw: unknown): BpState {
  const r = (raw ?? {}) as Partial<BpState>
  return {
    premium: Boolean(r.premium),
    premiumBase: r.premiumBase && typeof r.premiumBase === "object" ? r.premiumBase : {},
    claimed: {
      free: Array.isArray(r.claimed?.free) ? r.claimed.free : [],
      premium: Array.isArray(r.claimed?.premium) ? r.claimed.premium : [],
    },
  }
}
