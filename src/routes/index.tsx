import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Box, ChevronRight, Crown, Dices, Ellipsis, EyeOff, Megaphone, Plus, Rocket, Settings, Ticket, TrendingUp, User, X } from 'lucide-react'
import { OwnerView } from '@/components/casino/OwnerView'
import { isOwner } from '@/lib/tg-auth'
import { setStreamer, useLive } from '@/lib/live'
import { BRAINROT_BY_ID, TIER_META } from '@/data/brainrots'
import { getLiveDrops } from '@/lib/player.functions'
import { getMaintenance } from '@/lib/owner.functions'
import { Wrench } from 'lucide-react'

type FeedItem = { key: string; user: string; brainrotId: string; source: string }
import { StoreProvider, useStore } from '@/lib/store'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/utils'
import { CasesView } from '@/components/casino/CasesView'
import { UpgraderView } from '@/components/casino/UpgraderView'
import { DiceView } from '@/components/casino/DiceView'
import { CrashView } from '@/components/casino/CrashView'
import { ProfileView } from '@/components/casino/ProfileView'
import { BattlePassView } from '@/components/casino/BattlePassView'
import { itemValue } from '@/lib/store'
import { TRACKS, tierProgress } from '@/data/battlepass'
import { BrainrotImg, Coin, CoinAmount, IncomeTag, cdnImage } from '@/components/casino/ui'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'BrainrotDrop — кейсы с брейнротами' },
      { name: 'description', content: 'Telegram Mini App: открывай тематические кейсы и выбивай брейнротов из Steal a Brainrot' },
      { property: 'og:title', content: 'BrainrotDrop — кейсы с брейнротами' },
      { property: 'og:description', content: 'Хеллуин, Кристальный, Морская братва и другие кейсы с брейнротами из Steal a Brainrot' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: App,
})

type TabId = 'cases' | 'battlepass' | 'upgrade' | 'dice' | 'crash' | 'profile' | 'owner'

const TABS: { id: TabId; label: string; icon: typeof Box }[] = [
  { id: 'cases', label: 'Кейсы', icon: Box },
  { id: 'battlepass', label: 'Батл пасс', icon: Ticket },
  { id: 'upgrade', label: 'Апгрейд', icon: TrendingUp },
  { id: 'crash', label: 'Crash', icon: Rocket },
  { id: 'dice', label: 'Dice', icon: Dices },
  { id: 'profile', label: 'Профиль', icon: User },
]

function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

function Shell() {
  const { user } = useStore()
  const owner = isOwner(user.id)
  const [maint, setMaint] = useState<{ on: boolean; text: string | null }>({ on: false, text: null })
  useEffect(() => {
    let stop = false
    const pull = () => getMaintenance().then((m) => !stop && setMaint(m)).catch(() => {})
    pull()
    const t = setInterval(pull, 15_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [])
  const tabs = owner ? [...TABS, { id: 'owner' as TabId, label: 'Разраб', icon: Crown }] : TABS
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('cases')
  // Game views stay mounted so a running Crash round or upgrade isn't lost on tab switch.
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set(['cases']))
  const go = (id: TabId) => {
    haptic()
    setMenuOpen(false)
    setTab(id)
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)))
    window.scrollTo({ top: 0 })
  }

  if (maint.on && !owner) return <MaintenanceScreen text={maint.text} />

  return (
    <div className="bd-bg min-h-dvh pb-10">
      {maint.on && owner && (
        <div className="bg-[var(--bd-gold)] px-4 py-1.5 text-center text-[11px] font-extrabold text-black">Тех. перерыв включён — сайт видишь только ты</div>
      )}
      <Header onDeposit={() => go('profile')} onMenu={() => { haptic(); setMenuOpen(true) }} />
      <UpdateBanner />
      <LiveFeed />
      <main className="mx-auto max-w-xl px-4 pt-4">
        {tab === 'cases' && <Hero onPlay={() => go('upgrade')} />}
        {tab === 'cases' && <BattlePassPromo onOpen={() => go('battlepass')} />}
        {tabs.map(({ id }) =>
          visited.has(id) ? (
            <section key={id} hidden={tab !== id} className={cn(tab === 'cases' && id === 'cases' && 'mt-6')}>
              {id === 'cases' && <CasesView />}
              {id === 'battlepass' && <BattlePassView />}
              {id === 'upgrade' && <UpgraderView />}
              {id === 'crash' && <CrashView />}
              {id === 'dice' && <DiceView />}
              {id === 'profile' && <ProfileView />}
              {id === 'owner' && owner && <OwnerView />}
            </section>
          ) : null,
        )}
        <Footer />
      </main>
      {menuOpen && (
        <CornerMenu
          tabs={tabs}
          tab={tab}
          onChange={go}
          onClose={() => setMenuOpen(false)}
          onSettings={() => {
            setMenuOpen(false)
            setSettingsOpen(true)
          }}
        />
      )}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function MaintenanceScreen({ text }: { text: string | null }) {
  return (
    <div className="bd-bg grid min-h-dvh place-items-center px-6 text-center">
      <div className="bd-pop max-w-sm">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--bd-gold)]/15 text-[var(--bd-gold)]">
          <Wrench className="size-8" />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-extrabold">Технический перерыв</h1>
        <p className="mt-2 text-sm text-white/60">{text || 'Мы обновляем BrainrotDrop. Скоро вернёмся — твой баланс и инвентарь в сохранности.'}</p>
      </div>
    </div>
  )
}

function UpdateBanner() {
  const { announcement, user } = useStore()
  const [hidden, setHidden] = useState<string | null>(null)
  useEffect(() => {
    try {
      setHidden(localStorage.getItem('brainrotdrop:banner-hidden'))
    } catch {
      /* ignore */
    }
  }, [])
  // Shown to everyone except the owner who posted it.
  if (!announcement || announcement.by === user.id || hidden === announcement.id) return null
  return (
    <div className="mx-auto mt-3 max-w-xl px-4">
      <div className="bd-pop flex items-start gap-3 rounded-2xl border border-[var(--bd-lime)]/40 bg-[var(--bd-lime)]/10 p-3">
        <Megaphone className="mt-0.5 size-4 shrink-0 text-[var(--bd-lime)]" />
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-extrabold uppercase tracking-wider text-[var(--bd-lime)]">Обновление</div>
          <div className="mt-0.5 text-white/85">{announcement.text}</div>
        </div>
        <button
          type="button"
          aria-label="Скрыть"
          className="text-white/50"
          onClick={() => {
            setHidden(announcement.id)
            try {
              localStorage.setItem('brainrotdrop:banner-hidden', announcement.id)
            } catch {
              /* ignore */
            }
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { streamer } = useLive()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bd-pop bd-panel w-full max-w-xl rounded-b-none p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-heading text-lg font-extrabold">Настройки</div>
          <button type="button" onClick={onClose} className="bd-btn-ghost grid size-9 place-items-center" aria-label="Закрыть">
            <X className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic()
            setStreamer(!streamer)
          }}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-black/30 p-4 text-left"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--bd-pink)]/15 text-[var(--bd-pink)]">
            <EyeOff className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-bold">Режим стримера</span>
            <span className="block text-xs text-white/50">Скрывает баланс, стоимость инвентаря, кейсов и брейнротов</span>
          </span>
          <span className={cn('relative h-6 w-11 rounded-full transition-colors', streamer ? 'bg-[var(--bd-lime)]' : 'bg-white/15')}>
            <span className={cn('absolute top-0.5 size-5 rounded-full bg-white transition-all', streamer ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>
      </div>
    </div>
  )
}

function Header({ onDeposit, onMenu }: { onDeposit: () => void; onMenu: () => void }) {
  const { balance } = useStore()
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-[#0b0716]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onMenu} className="bd-dots" aria-label="Открыть меню">
            <Ellipsis className="size-6" strokeWidth={3.5} />
          </button>
          <div className="font-heading text-[16px] font-extrabold leading-none tracking-tight">
            Brainrot<span className="text-[var(--bd-lime)]">Drop</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-black/35 p-1 pl-3">
          <CoinAmount value={balance} size={18} className="text-[15px]" />
          <button type="button" onClick={onDeposit} className="bd-btn grid size-8 place-items-center !rounded-lg !shadow-none" aria-label="Пополнить">
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

function CornerMenu({
  tabs,
  tab,
  onChange,
  onClose,
  onSettings,
}: {
  tabs: typeof TABS
  tab: TabId
  onChange: (t: TabId) => void
  onClose: () => void
  onSettings: () => void
}) {
  const { user, balance, inventory } = useStore()
  const invValue = inventory.reduce((s, i) => s + itemValue(i), 0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="bd-menu" role="dialog" aria-label="Меню">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={onClose} className="bd-dots !size-9" aria-label="Закрыть меню">
            <X className="size-5" strokeWidth={3} />
          </button>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Меню</span>
        </div>
        <button type="button" className="bd-profile-banner" onClick={() => onChange('profile')}>
          {user.photoUrl ? (
            <img src={user.photoUrl} alt="" className="size-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/30" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-700 font-heading text-xl font-extrabold ring-2 ring-white/30">
              {user.firstName.slice(0, 1)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading text-base font-extrabold">
              {user.firstName} {user.lastName}
            </span>
            <span className="block truncate text-[11px] text-white/60">{user.username ? `@${user.username}` : `ID ${user.id}`}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <CoinAmount value={balance} size={13} className="text-xs" />
              <span className="text-[10px] text-white/45">инв.</span>
              <CoinAmount value={invValue} size={13} className="text-xs" />
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-extrabold uppercase text-[var(--bd-lime)]">
            Профиль <ChevronRight className="size-4" />
          </span>
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="bd-menu-item" data-active={tab === id} onClick={() => onChange(id)}>
              <Icon className="size-5" />
              {label}
            </button>
          ))}
          <button type="button" className="bd-menu-item" onClick={onSettings}>
            <Settings className="size-5" />
            Настройки
          </button>
        </div>
      </div>
    </>
  )
}

function BattlePassPromo({ onOpen }: { onOpen: () => void }) {
  const { stats, bp } = useStore()
  const ready = (['free', 'premium'] as const).reduce(
    (n, t) => n + TRACKS[t].filter((x) => !bp.claimed[t].includes(x.id) && tierProgress(t, x, stats, bp).done && (t === 'free' || bp.premium)).length,
    0,
  )
  return (
    <button type="button" onClick={onOpen} className="bd-bp-hero mt-4 flex w-full items-center gap-3 !p-3 text-left">
      <img src="/img/battlepass.webp" alt="" className="size-14 shrink-0 object-contain" loading="lazy" />
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-sm font-extrabold">Батл пасс</span>
        <span className="block text-[11px] text-white/60">Бесплатная и премиум дорожки с квестами</span>
      </span>
      {ready > 0 ? (
        <span className="shrink-0 rounded-lg bg-[var(--bd-gold)] px-2 py-1 text-[10px] font-extrabold text-black">Забрать: {ready}</span>
      ) : (
        <ChevronRight className="size-5 shrink-0 text-white/50" />
      )}
    </button>
  )
}

// Real drops from real players, stored server-side and polled.
function LiveFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null)
  useEffect(() => {
    let stop = false
    const pull = () =>
      getLiveDrops()
        .then((d) => !stop && setItems(d.filter((f) => BRAINROT_BY_ID[f.brainrotId])))
        .catch(() => !stop && setItems((x) => x ?? []))
    pull()
    const t = setInterval(pull, 5000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [])
  if (items === null) return <div className="h-[58px]" />
  if (items.length === 0)
    return (
      <div className="flex h-[58px] items-center justify-center border-b border-white/6 bg-black/20 text-[11px] text-white/45">
        Лайв-дропы появятся, когда игроки начнут открывать кейсы
      </div>
    )
  const loop = items.length >= 6 ? [...items, ...items] : items
  return (
    <div className="overflow-hidden border-b border-white/6 bg-black/20">
      <div className="bd-ticker flex w-max gap-2 px-2 py-2">
        {loop.map((f, i) => {
          const b = BRAINROT_BY_ID[f.brainrotId]
          return (
            <div
              key={f.key + i}
              className="flex h-[42px] w-[150px] shrink-0 items-center gap-2 rounded-xl border border-white/6 px-2"
              style={{ background: `linear-gradient(90deg, ${TIER_META[b.tier].glow}, transparent)` }}
            >
              <BrainrotImg b={b} size={34} />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[11px] font-bold">{b.name}</div>
                <div className="truncate text-[9px] text-white/45">
                  {f.user} · {f.source}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Hero({ onPlay }: { onPlay: () => void }) {
  const hero = BRAINROT_BY_ID['strawberry-elephant']
  const side = BRAINROT_BY_ID['la-supreme-combinasion']
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 p-5" style={{ background: 'linear-gradient(135deg,#3b0f5c 0%,#1a0b33 55%,#0f2a0a 130%)' }}>
      <div className="bd-rays pointer-events-none absolute -right-24 -top-24 size-80 opacity-40" />
      <div className="relative z-10 max-w-[58%]">
        <div className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--bd-lime)]">
          Steal a Brainrot · Telegram
        </div>
        <h1 className="mt-3 font-heading text-[26px] font-extrabold leading-[1.05]">
          Выбивай <span className="text-[#ff7ad9]">OG</span> брейнротов
        </h1>
        <p className="mt-2 text-xs text-white/65">Кейсы, апгрейдер, Crash и Dice. Депозит и вывод прямо в Roblox через админа.</p>
        <button type="button" onClick={onPlay} className="bd-btn mt-4 px-5 py-2.5 text-sm">
          Апгрейднуть
        </button>
      </div>
      <div className="pointer-events-none absolute -right-2 bottom-2 flex flex-col items-end">
        <img
          src={cdnImage(hero.image, 360)}
          alt={hero.name}
          fetchPriority="high"
          className="bd-float size-40 object-contain drop-shadow-[0_12px_30px_rgba(255,79,216,.55)]"
        />
        <div className="mr-3 -mt-2 flex items-center gap-1">
          <IncomeTag perSec={hero.incomePerSec} />
        </div>
      </div>
      <img src={cdnImage(side.image, 140)} alt="" className="pointer-events-none absolute bottom-3 right-36 size-14 rotate-[-8deg] object-contain opacity-90" />
      <Coin size={30} className="bd-float absolute right-6 top-6" />
      <Coin size={18} className="absolute right-44 top-10 opacity-80" />
    </div>
  )
}

function Footer() {
  return (
    <p className="mt-10 text-center text-[10px] leading-relaxed text-white/30">
      BrainrotDrop — фан-проект, не связан с Roblox Corporation. Монеты — внутриигровая валюта сайта и не выводятся в деньги.
      Данные и изображения персонажей — Steal a Brainrot Wiki (Fandom). 18+
    </p>
  )
}
