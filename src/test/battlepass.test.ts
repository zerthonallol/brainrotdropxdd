import { describe, expect, it } from "vitest"
import { EMPTY_BP, FREE_TRACK, PREMIUM_PRICE, PREMIUM_TRACK, canBuyPremium, canClaim, tierProgress } from "@/data/battlepass"
import { BRAINROT_BY_ID } from "@/data/brainrots"
import { CASES } from "@/data/cases"

describe("battle pass", () => {
  it("premium track costs 3000 coins", () => {
    expect(PREMIUM_PRICE).toBe(3000)
    expect(canBuyPremium(2999, EMPTY_BP)).toBe(false)
    expect(canBuyPremium(3000, EMPTY_BP)).toBe(true)
    expect(canBuyPremium(10_000, { ...EMPTY_BP, premium: true })).toBe(false)
  })

  it("both tracks have quests", () => {
    expect(FREE_TRACK.length).toBeGreaterThan(0)
    expect(PREMIUM_TRACK.length).toBeGreaterThan(0)
  })

  it("premium rewards can't be claimed without buying", () => {
    const stats = { cases: 999 }
    expect(canClaim("premium", "p1", stats, EMPTY_BP)).toBe("locked")
    expect(canClaim("free", "f1", stats, EMPTY_BP)).toBe("ok")
  })

  it("premium quests count only progress made after purchase", () => {
    const bp = { ...EMPTY_BP, premium: true, premiumBase: { cases: 10 } }
    const p1 = PREMIUM_TRACK.find((t) => t.id === "p1")!
    expect(tierProgress("premium", p1, { cases: 12 }, bp).done).toBe(false)
    expect(tierProgress("premium", p1, { cases: 15 }, bp).done).toBe(true)
  })

  it("a reward can be claimed only once", () => {
    const bp = { ...EMPTY_BP, claimed: { free: ["f1"], premium: [] } }
    expect(canClaim("free", "f1", { cases: 5 }, bp)).toBe("claimed")
  })

  it("every reward points at a real case or brainrot", () => {
    const caseIds = new Set(CASES.map((c) => c.id))
    for (const t of [...FREE_TRACK, ...PREMIUM_TRACK]) {
      if (t.reward.kind === "case") expect(caseIds.has(t.reward.caseId)).toBe(true)
      if (t.reward.kind === "brainrot") expect(BRAINROT_BY_ID[t.reward.id]).toBeDefined()
    }
  })
})
