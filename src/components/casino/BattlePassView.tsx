import { useState } from "react"
import { Check, Crown, Gift, Lock, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { PREMIUM_PRICE, SEASON_NAME, TRACKS, canBuyPremium, tierProgress, type BpReward, type BpTier, type TrackId } from "@/data/battlepass"
import { BRAINROT_BY_ID } from "@/data/brainrots"
import { CASES } from "@/data/cases"
import { useStore } from "@/lib/store"
import { haptic, notify } from "@/lib/telegram"
import { cn } from "@/lib/utils"
import { BrainrotImg, Coin, formatCoins } from "./ui"

const TRACK_COLOR: Record<TrackId, string> = { free: "#b6ff3b", premium: "#ffc83d" }

function rewardLabel(r: BpReward) {
  if (r.kind === "coins") return `${formatCoins(r.amount)} монет`
  if (r.kind === "case") return `Кейс «${CASES.find((c) => c.id === r.caseId)?.name ?? r.caseId}»${r.amount > 1 ? ` ×${r.amount}` : ""}`
  return BRAINROT_BY_ID[r.id]?.name ?? r.id
}

function RewardIcon({ r }: { r: BpReward }) {
  if (r.kind === "coins") return <Coin size={30} />
  if (r.kind === "case") {
    const c = CASES.find((x) => x.id === r.caseId)
    return c ? <img src={c.cover} alt="" className="bd-sticker size-10 object-contain" loading="lazy" /> : <Gift className="size-6" />
  }
  const b = BRAINROT_BY_ID[r.id]
  return b ? <BrainrotImg b={b} size={44} /> : <Gift className="size-6" />
}

export function BattlePassView() {
  const store = useStore()
  const [track, setTrack] = useState<TrackId>("free")
  const count = (t: TrackId) => TRACKS[t].filter((x) => tierProgress(t, x, store.stats, store.bp).done).length

  const buy = () => {
    haptic("medium")
    if (!canBuyPremium(store.balance, store.bp)) {
      notify("error")
      toast.error(`Нужно ${formatCoins(PREMIUM_PRICE)} монет`)
      return
    }
    if (store.buyPremium()) {
      notify("success")
      toast.success("Премиум батл пасс открыт! Квесты считаются с этого момента")
      setTrack("premium")
    }
  }

  return (
    <div className="space-y-4">
      <div className="bd-bp-hero">
        <span className="bd-rays pointer-events-none absolute -right-20 -top-20 size-64 opacity-30" />
        <div className="relative flex items-center gap-3">
          <img src="/img/battlepass.webp" alt="" className="bd-float size-20 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--bd-gold)]">{SEASON_NAME}</div>
            <h1 className="font-heading text-2xl font-extrabold leading-tight">Батл пасс</h1>
            <p className="mt-1 text-xs text-white/60">Выполняй квесты и забирай награды на двух дорожках.</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          {(["free", "premium"] as const).map((t) => (
            <div key={t} className="rounded-xl bg-black/35 p-2.5">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase" style={{ color: TRACK_COLOR[t] }}>
                {t === "free" ? "Бесплатный" : "Премиум"}
                <span className="text-white/60">
                  {count(t)}/{TRACKS[t].length}
                </span>
              </div>
              <div className="bd-bp-progress mt-1.5" style={{ ["--track" as string]: TRACK_COLOR[t] }}>
                <span style={{ width: `${(count(t) / TRACKS[t].length) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
        {(["free", "premium"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              haptic()
              setTrack(t)
            }}
            className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold transition-colors", track === t ? "bg-white/12 text-white" : "text-white/50")}
          >
            {t === "free" ? <Sparkles className="size-4" style={{ color: TRACK_COLOR.free }} /> : <Crown className="size-4" style={{ color: TRACK_COLOR.premium }} />}
            {t === "free" ? "Бесплатный" : "Премиум"}
            {t === "premium" && !store.bp.premium && <Lock className="size-3 text-white/50" />}
          </button>
        ))}
      </div>

      {track === "premium" && !store.bp.premium && (
        <div className="bd-panel bd-pop space-y-3 border-[var(--bd-gold)]/40 p-4 text-center">
          <div className="font-heading text-lg font-extrabold">Открой премиум дорожку</div>
          <p className="text-xs text-white/60">
            Свои квесты и награды покруче: брейнроты, OG кейс и тысячи монет. Прогресс квестов считается с момента покупки.
          </p>
          <button type="button" className="bd-btn-gold inline-flex w-full items-center justify-center gap-2 py-3 text-sm" onClick={buy}>
            Купить за <Coin size={18} /> {formatCoins(PREMIUM_PRICE)}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {TRACKS[track].map((tier, i) => (
          <TierRow key={tier.id} track={track} tier={tier} level={i + 1} />
        ))}
      </div>
    </div>
  )
}

function TierRow({ track, tier, level }: { track: TrackId; tier: BpTier; level: number }) {
  const store = useStore()
  const { value, done } = tierProgress(track, tier, store.stats, store.bp)
  const claimed = store.bp.claimed[track].includes(tier.id)
  const locked = track === "premium" && !store.bp.premium
  const state = claimed ? "claimed" : done ? "ready" : "progress"

  const claim = () => {
    const r = store.claimBp(track, tier.id)
    if (!r) return
    notify("success")
    toast.success(`Награда получена: ${rewardLabel(r)}`)
  }

  return (
    <div className="bd-bp-tier" data-state={state} style={{ ["--track" as string]: TRACK_COLOR[track] }}>
      <div className="bd-bp-level">{level}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{tier.quest}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="bd-bp-progress flex-1">
            <span style={{ width: `${(value / tier.target) * 100}%` }} />
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-white/55">
            {formatCoins(value)}/{formatCoins(tier.target)}
          </span>
        </div>
        <div className="mt-1 truncate text-[11px] text-white/50">Награда: {rewardLabel(tier.reward)}</div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="bd-bp-reward">
          <RewardIcon r={tier.reward} />
        </div>
        {claimed ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white/60">
            <Check className="size-3" /> Есть
          </span>
        ) : locked ? (
          <Lock className="size-3.5 text-white/40" />
        ) : (
          <button
            type="button"
            disabled={!done}
            onClick={claim}
            className={cn("px-2 py-1 text-[10px]", track === "premium" ? "bd-btn-gold" : "bd-btn")}
          >
            Забрать
          </button>
        )}
      </div>
    </div>
  )
}
