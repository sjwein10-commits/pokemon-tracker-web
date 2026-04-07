'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface Snapshot {
  id: number
  snapshot_date: string
  avg_price: number
  low_price: number
  high_price: number
  projected_price: number
  projection_notes: string
  cards: {
    name: string
    rarity: string
    is_holographic: boolean
    card_number: string
  }
}

type SellSignal = 'SELL' | 'HOLD' | 'BUY'
type FilterType = 'all' | 'sell' | 'hold' | 'buy'
type SortType = 'price' | 'change' | 'signal'

function getCardImageUrl(cardNumber: string) {
  return `https://images.pokemontcg.io/base1/${cardNumber}.png`
}

function getSellSignal(snap: Snapshot): { signal: SellSignal; confidence: number; pctChange: number } {
  if (!snap.projected_price || !snap.avg_price) return { signal: 'HOLD', confidence: 52, pctChange: 0 }
  const pctChange = ((snap.projected_price - snap.avg_price) / snap.avg_price) * 100
  let signal: SellSignal
  let confidence: number
  if (pctChange >= 8) {
    signal = 'BUY'
    confidence = Math.min(93, 62 + pctChange * 1.4)
  } else if (pctChange <= -5) {
    signal = 'SELL'
    confidence = Math.min(93, 62 + Math.abs(pctChange) * 1.4)
  } else {
    signal = 'HOLD'
    confidence = Math.min(88, 58 + Math.abs(pctChange) * 2.5)
  }
  return { signal, confidence: Math.round(confidence), pctChange: Math.round(pctChange * 10) / 10 }
}

function SignalBadge({ signal, size = 'sm' }: { signal: SellSignal; size?: 'sm' | 'lg' }) {
  const base =
    size === 'lg'
      ? 'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border'
      : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border'
  const dot = size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5'
  if (signal === 'SELL')
    return (
      <span className={`${base} bg-red-500/15 border-red-500/30 text-red-400`}>
        <span className={`${dot} rounded-full bg-red-400`} /> Sell
      </span>
    )
  if (signal === 'BUY')
    return (
      <span className={`${base} bg-emerald-500/15 border-emerald-500/30 text-emerald-400`}>
        <span className={`${dot} rounded-full bg-emerald-400`} /> Buy
      </span>
    )
  return (
    <span className={`${base} bg-amber-500/15 border-amber-500/30 text-amber-400`}>
      <span className={`${dot} rounded-full bg-amber-400`} /> Hold
    </span>
  )
}

function Sparkline({ snap }: { snap: Snapshot }) {
  const { pts, isUp } = useMemo(() => {
    const low = snap.low_price || snap.avg_price * 0.82
    const high = snap.high_price || snap.avg_price * 1.18
    const proj = snap.projected_price || snap.avg_price
    const raw = [low * 1.08, high * 0.94, snap.avg_price * 0.96, low * 1.15, snap.avg_price * 1.03, snap.avg_price * 0.98, proj]
    const yMin = Math.min(...raw)
    const yMax = Math.max(...raw)
    const yRange = yMax - yMin || 1
    return {
      pts: raw.map((y, i) => ({ x: (i / (raw.length - 1)) * 100, y: 40 - ((y - yMin) / yRange) * 36 - 2 })),
      isUp: proj >= snap.avg_price,
    }
  }, [snap])

  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = pts[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `${acc} C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`
  }, '')

  const color = isUp ? '#34d399' : '#f87171'
  const last = pts[pts.length - 1]

  return (
    <svg viewBox="0 0 100 40" className="w-full" preserveAspectRatio="none">
      <path d={`${d} L100,40 L0,40 Z`} fill={color} fillOpacity="0.07" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x} cy={last.y} r="1.8" fill={color} />}
    </svg>
  )
}

export default function Home() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('change')

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('price_snapshots')
        .select('*, cards(name, rarity, is_holographic, card_number)')
        .order('avg_price', { ascending: false })
      if (data) {
        const seen = new Set<string>()
        const deduped = data.filter((s: Snapshot) => {
          if (seen.has(s.cards.name)) return false
          seen.add(s.cards.name)
          return true
        })
        setSnapshots(deduped)
      }
    }
    fetchData()
  }, [])

  const enriched = useMemo(() => snapshots.map((s) => ({ ...s, ...getSellSignal(s) })), [snapshots])

  const filtered = useMemo(() => {
    let arr = filter === 'all' ? enriched : enriched.filter((s) => s.signal.toLowerCase() === filter)
    if (sortBy === 'price') arr = [...arr].sort((a, b) => b.avg_price - a.avg_price)
    else if (sortBy === 'change') arr = [...arr].sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
    else if (sortBy === 'signal') {
      const order = { SELL: 0, HOLD: 1, BUY: 2 } as const
      arr = [...arr].sort((a, b) => order[a.signal] - order[b.signal])
    }
    return arr
  }, [enriched, filter, sortBy])

  const heroSnap = enriched[0]

  const avgChange =
    enriched.length > 0 ? enriched.reduce((sum, s) => sum + s.pctChange, 0) / enriched.length : 0
  const topGainer = enriched.length > 0 ? [...enriched].sort((a, b) => b.pctChange - a.pctChange)[0] : null
  const topLoser = enriched.length > 0 ? [...enriched].sort((a, b) => a.pctChange - b.pctChange)[0] : null
  const bullishCount = enriched.filter((s) => s.signal === 'BUY').length
  const bearishCount = enriched.filter((s) => s.signal === 'SELL').length

  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-40 left-1/3 w-[700px] h-[500px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold px-3.5 py-1.5 rounded-full mb-7 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                AI-Powered Market Intelligence
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-white leading-[1.06] mb-5 tracking-tight">
                Predict the Best Time<br />to Sell Your<br />
                <span className="bg-gradient-to-r from-red-400 via-rose-400 to-red-500 bg-clip-text text-transparent">
                  Pokémon Cards
                </span>
              </h1>

              <p className="text-[15px] text-slate-400 mb-8 max-w-lg leading-relaxed">
                Real market data, historical trends, and AI-powered sell signals to maximize your returns on 1999 Base Set cards.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/active-data"
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-red-500/25 text-sm"
                >
                  View Market Data →
                </Link>
                <Link
                  href="/binder"
                  className="bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] hover:border-white/[0.18] text-white font-medium px-6 py-3 rounded-xl transition text-sm"
                >
                  Track Your Cards
                </Link>
              </div>

              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">102</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider">Cards Tracked</p>
                </div>
                <div className="border-l border-white/[0.08] pl-6">
                  <p className="text-2xl font-bold text-white">PSA 8–10</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider">Grades Covered</p>
                </div>
                <div className="border-l border-white/[0.08] pl-6">
                  <p className="text-2xl font-bold text-white">Daily</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider">Data Updates</p>
                </div>
              </div>
            </div>

            {/* Right: live preview panel */}
            {heroSnap ? (
              <div className="relative">
                {/* Glow behind panel */}
                <div className="absolute inset-0 bg-red-600/4 rounded-3xl blur-2xl" />
                <div className="relative bg-white/[0.04] border border-white/[0.12] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">

                  {/* Panel header */}
                  <div className="border-b border-white/[0.07] px-4 py-3 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        AI
                      </div>
                      <span className="text-[13px] font-semibold text-white">Live Signal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] text-emerald-400 font-medium">Live</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex gap-4 items-start mb-5">
                      {/* Card image */}
                      <Link
                        href={`/binder/base-set/${heroSnap.cards.card_number}`}
                        className="relative w-20 shrink-0 aspect-[2.5/3.5] rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition"
                      >
                        <Image
                          src={getCardImageUrl(heroSnap.cards.card_number)}
                          alt={heroSnap.cards.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">
                          {heroSnap.cards.rarity} · Base Set
                        </p>
                        <h3 className="text-base font-bold text-white mb-2">{heroSnap.cards.name}</h3>

                        <div className="flex items-end gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Avg PSA Price</p>
                            <p className="text-2xl font-bold text-white tabular-nums">
                              ${heroSnap.avg_price.toLocaleString()}
                            </p>
                          </div>
                          <p
                            className={`text-sm font-bold tabular-nums mb-1 ${heroSnap.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {heroSnap.pctChange >= 0 ? '+' : ''}
                            {heroSnap.pctChange}%
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <SignalBadge signal={heroSnap.signal} />
                          <span className="text-[11px] text-slate-500">{heroSnap.confidence}% confidence</span>
                        </div>
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">30-Day Projection</p>
                        <p className="text-[11px] text-slate-400 font-medium tabular-nums">
                          → ${heroSnap.projected_price.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-12">
                        <Sparkline snap={heroSnap} />
                      </div>
                    </div>

                    {/* Recommended action banner */}
                    <div
                      className={`mt-3 rounded-xl px-4 py-3 border text-center ${
                        heroSnap.signal === 'SELL'
                          ? 'bg-red-500/10 border-red-500/25'
                          : heroSnap.signal === 'BUY'
                            ? 'bg-emerald-500/10 border-emerald-500/25'
                            : 'bg-amber-500/10 border-amber-500/25'
                      }`}
                    >
                      <p
                        className={`text-xs font-bold uppercase tracking-widest ${
                          heroSnap.signal === 'SELL'
                            ? 'text-red-400'
                            : heroSnap.signal === 'BUY'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                        }`}
                      >
                        Recommended Action: {heroSnap.signal === 'SELL' ? 'Sell Now' : heroSnap.signal === 'BUY' ? 'Good Time to Buy' : 'Hold Position'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-3/4 mb-4" />
                <div className="h-32 bg-white/5 rounded mb-4" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── MARKET OVERVIEW ────────────────────────────────────────────────── */}
      {enriched.length > 0 && (
        <section className="border-b border-white/[0.06] bg-white/[0.012]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-base">📊</span>
              <h2 className="text-lg font-bold text-white">Market Overview</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Avg movement */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">
                  Avg 30-Day Movement
                </p>
                <p
                  className={`text-3xl font-bold tabular-nums mb-1 ${avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {avgChange >= 0 ? '+' : ''}
                  {avgChange.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mb-4">Across {enriched.length} tracked cards</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-slate-400">{bullishCount} Buy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-[11px] text-slate-400">{bearishCount} Sell</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[11px] text-slate-400">{enriched.length - bullishCount - bearishCount} Hold</span>
                  </div>
                </div>
              </div>

              {/* Top gainer */}
              {topGainer && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                  <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold mb-3">
                    🔥 Top Gainer
                  </p>
                  <div className="flex gap-3 items-center">
                    <Link
                      href={`/binder/base-set/${topGainer.cards.card_number}`}
                      className="relative w-12 shrink-0 aspect-[2.5/3.5] rounded-lg overflow-hidden bg-white/5 hover:opacity-90 transition"
                    >
                      <Image
                        src={getCardImageUrl(topGainer.cards.card_number)}
                        alt={topGainer.cards.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                    <div>
                      <p className="text-sm font-bold text-white">{topGainer.cards.name}</p>
                      <p className="text-[11px] text-slate-500 mb-1">
                        ${topGainer.avg_price.toLocaleString()} avg
                      </p>
                      <p className="text-xl font-bold text-emerald-400 tabular-nums">
                        +{topGainer.pctChange}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top loser */}
              {topLoser && topLoser.id !== topGainer?.id && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                  <p className="text-[10px] text-red-500 uppercase tracking-wider font-semibold mb-3">
                    📉 Biggest Drop
                  </p>
                  <div className="flex gap-3 items-center">
                    <Link
                      href={`/binder/base-set/${topLoser.cards.card_number}`}
                      className="relative w-12 shrink-0 aspect-[2.5/3.5] rounded-lg overflow-hidden bg-white/5 hover:opacity-90 transition"
                    >
                      <Image
                        src={getCardImageUrl(topLoser.cards.card_number)}
                        alt={topLoser.cards.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                    <div>
                      <p className="text-sm font-bold text-white">{topLoser.cards.name}</p>
                      <p className="text-[11px] text-slate-500 mb-1">
                        ${topLoser.avg_price.toLocaleString()} avg
                      </p>
                      <p className="text-xl font-bold text-red-400 tabular-nums">{topLoser.pctChange}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── AI SELL SIGNALS ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                AI
              </div>
              <h2 className="text-xl font-bold text-white">AI Sell Signals</h2>
            </div>
            <p className="text-sm text-slate-500 max-w-md">
              Predictions based on historical sales data, market trends, and contributed data.{' '}
              <span className="text-slate-600">Not financial advice.</span>
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 gap-0.5">
              {(['all', 'sell', 'hold', 'buy'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    filter === f ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'sell' ? '🔴 Sell' : f === 'hold' ? '🟡 Hold' : '🟢 Buy'}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[12px] rounded-xl px-3 py-2 focus:outline-none focus:border-red-500/40 cursor-pointer"
            >
              <option value="change">Sort: % Change</option>
              <option value="price">Sort: Price</option>
              <option value="signal">Sort: Signal</option>
            </select>
          </div>
        </div>

        {enriched.length === 0 ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-16 aspect-[2.5/3.5] rounded-xl bg-white/5" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-2.5 bg-white/5 rounded w-2/3" />
                    <div className="h-3.5 bg-white/5 rounded w-4/5" />
                    <div className="h-5 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-white/5 rounded mb-4" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-white/5 rounded" />
                  <div className="h-8 bg-white/5 rounded" />
                  <div className="h-8 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-sm mb-3">No cards match this filter.</p>
            <button
              onClick={() => setFilter('all')}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((snap) => (
              <Link
                key={snap.id}
                href={`/binder/base-set/${snap.cards.card_number}`}
                className="group bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.05] rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col"
              >
                <div className="p-4 flex-1">
                  {/* Image + signal */}
                  <div className="flex gap-3 mb-4">
                    <div className="relative w-16 shrink-0 aspect-[2.5/3.5] rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/[0.08] group-hover:ring-white/[0.15] transition">
                      <Image
                        src={getCardImageUrl(snap.cards.card_number)}
                        alt={snap.cards.name}
                        fill
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5 font-medium">
                        {snap.cards.rarity}
                      </p>
                      <h3 className="text-sm font-bold text-white truncate mb-2">{snap.cards.name}</h3>
                      <SignalBadge signal={snap.signal} />
                    </div>
                  </div>

                  {/* Sparkline */}
                  <div className="h-10 mb-4">
                    <Sparkline snap={snap} />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wide mb-0.5 font-semibold">Price</p>
                      <p className="text-sm font-bold text-white tabular-nums">
                        ${snap.avg_price.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wide mb-0.5 font-semibold">30d</p>
                      <p
                        className={`text-sm font-bold tabular-nums ${snap.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {snap.pctChange >= 0 ? '+' : ''}
                        {snap.pctChange}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wide mb-0.5 font-semibold">Conf.</p>
                      <p className="text-sm font-bold text-slate-300 tabular-nums">{snap.confidence}%</p>
                    </div>
                  </div>
                </div>

                {/* Signal footer */}
                <div
                  className={`border-t px-4 py-2.5 flex items-center justify-between ${
                    snap.signal === 'SELL'
                      ? 'border-red-500/20 bg-red-500/5'
                      : snap.signal === 'BUY'
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      snap.signal === 'SELL'
                        ? 'text-red-400'
                        : snap.signal === 'BUY'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                    }`}
                  >
                    {snap.signal === 'SELL' ? 'Sell Now' : snap.signal === 'BUY' ? 'Good Time to Buy' : 'Hold Position'}
                  </p>
                  <span className="text-[11px] text-slate-600 group-hover:text-slate-400 transition">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {enriched.length > 0 && (
          <div className="mt-6 text-center">
            <Link
              href="/binder/base-set"
              className="text-sm text-slate-500 hover:text-white transition font-medium"
            >
              View all 102 Base Set cards →
            </Link>
          </div>
        )}
      </section>

      {/* ── DISCLAIMER ──────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-slate-500 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1.5">Data Disclaimer</p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                  Derived estimates are calculated from observed completed sales and contributed data. This is not a guaranteed
                  sale price. Data sources include manual auction entries, user-submitted proof, and dealer inventory exports.
                  AI sell signals are for informational purposes only and do not constitute financial advice.
                </p>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-2.5 font-medium transition"
                >
                  How It Works →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
