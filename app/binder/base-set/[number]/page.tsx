'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { BASE_SET_CARDS, BaseSetCard } from '../../../../lib/base-set-cards'

interface Sale {
  id: number
  sale_price: number
  sale_date: string
  grade_value: number
  source: string
}

interface Snapshot {
  avg_price: number
  low_price: number
  high_price: number
  projection_notes: string
  snapshot_date: string
}

interface GradePrices {
  psa8: number | null
  psa9: number | null
  psa10: number | null
}

// ── Design tokens ──────────────────────────────────────────────────────────

const TYPE_GLOW: Record<string, string> = {
  Fire:      'rgba(249,115,22,0.10)',
  Water:     'rgba(59,130,246,0.10)',
  Grass:     'rgba(34,197,94,0.10)',
  Lightning: 'rgba(234,179,8,0.10)',
  Psychic:   'rgba(236,72,153,0.10)',
  Fighting:  'rgba(217,119,6,0.10)',
  Colorless: 'rgba(148,163,184,0.06)',
  Trainer:   'rgba(168,85,247,0.08)',
  Energy:    'rgba(20,184,166,0.08)',
}

const TYPE_ACCENT: Record<string, string> = {
  Fire:      'from-orange-500 to-red-500',
  Water:     'from-blue-500 to-cyan-500',
  Grass:     'from-green-500 to-emerald-500',
  Lightning: 'from-yellow-400 to-amber-500',
  Psychic:   'from-pink-500 to-purple-500',
  Fighting:  'from-amber-600 to-orange-700',
  Colorless: 'from-slate-400 to-slate-500',
  Trainer:   'from-purple-500 to-violet-600',
  Energy:    'from-teal-400 to-cyan-500',
}

const TYPE_TEXT: Record<string, string> = {
  Fire:      'text-orange-400',
  Water:     'text-blue-400',
  Grass:     'text-green-400',
  Lightning: 'text-yellow-400',
  Psychic:   'text-pink-400',
  Fighting:  'text-amber-500',
  Colorless: 'text-slate-400',
  Trainer:   'text-purple-400',
  Energy:    'text-teal-400',
}

const TYPE_BG: Record<string, string> = {
  Fire:      'bg-orange-500/10 border-orange-500/20',
  Water:     'bg-blue-500/10 border-blue-500/20',
  Grass:     'bg-green-500/10 border-green-500/20',
  Lightning: 'bg-yellow-400/10 border-yellow-400/20',
  Psychic:   'bg-pink-500/10 border-pink-500/20',
  Fighting:  'bg-amber-600/10 border-amber-600/20',
  Colorless: 'bg-slate-500/10 border-slate-500/20',
  Trainer:   'bg-purple-500/10 border-purple-500/20',
  Energy:    'bg-teal-400/10 border-teal-400/20',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | null) {
  if (n == null) return '—'
  return `$${n.toLocaleString()}`
}

function gradeBadge(grade: number) {
  if (grade === 10) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  if (grade === 9)  return 'bg-blue-500/15 text-blue-400 border-blue-500/25'
  return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
}

// ── Prev / Next navigation ──────────────────────────────────────────────────

function getAdjacentCards(number: string) {
  const idx = BASE_SET_CARDS.findIndex((c) => c.number === number)
  return {
    prev: idx > 0 ? BASE_SET_CARDS[idx - 1] : null,
    next: idx < BASE_SET_CARDS.length - 1 ? BASE_SET_CARDS[idx + 1] : null,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function CardDetail() {
  const { number } = useParams<{ number: string }>()
  const card: BaseSetCard | undefined = BASE_SET_CARDS.find((c) => c.number === number)

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [gradePrices, setGradePrices] = useState<GradePrices>({ psa8: null, psa9: null, psa10: null })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [projection, setProjection] = useState<string | null>(null)
  const [projectionLoading, setProjectionLoading] = useState(false)

  useEffect(() => {
    if (!card) { setLoading(false); return }
    setSnapshot(null); setGradePrices({ psa8: null, psa9: null, psa10: null })
    setRecentSales([]); setProjection(null); setLoading(true)

    async function load() {
      const { data: dbCard } = await supabase.from('cards').select('id').eq('name', card!.name).single()
      if (!dbCard) { setLoading(false); return }

      const [snapRes, salesRes] = await Promise.all([
        supabase.from('price_snapshots')
          .select('avg_price, low_price, high_price, projection_notes, snapshot_date')
          .eq('card_id', dbCard.id).order('snapshot_date', { ascending: false }).limit(1).single(),
        supabase.from('sales')
          .select('id, sale_price, sale_date, grade_value, source')
          .eq('card_id', dbCard.id).eq('grade_company', 'PSA').in('grade_value', [8, 9, 10])
          .order('sale_date', { ascending: false }).limit(20),
      ])

      if (snapRes.data) setSnapshot(snapRes.data)
      const sales = salesRes.data || []
      setRecentSales(sales)

      const avg = (grade: number) => {
        const prices = sales.filter((s) => s.grade_value === grade).map((s) => s.sale_price)
        return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null
      }
      setGradePrices({ psa8: avg(8), psa9: avg(9), psa10: avg(10) })
      setLoading(false)

      const existingProjection = snapRes.data?.projection_notes
      if (existingProjection) {
        setProjection(existingProjection)
      } else {
        setProjectionLoading(true)
        fetch('/api/projection', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cardName: card!.name, cardNumber: card!.number, type: card!.type, rarity: card!.rarity }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.projection) setProjection(d.projection) })
          .finally(() => setProjectionLoading(false))
      }
    }
    load()
  }, [card])

  if (!card) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-2">Card not found</p>
          <Link href="/binder/base-set" className="text-red-400 text-sm hover:underline">← Back to Base Set</Link>
        </div>
      </div>
    )
  }

  const glow    = TYPE_GLOW[card.type]   || TYPE_GLOW.Colorless
  const accent  = TYPE_ACCENT[card.type] || TYPE_ACCENT.Colorless
  const typeText = TYPE_TEXT[card.type]  || 'text-slate-400'
  const typeBg   = TYPE_BG[card.type]   || TYPE_BG.Colorless
  const hasData  = !!(snapshot || gradePrices.psa9 || gradePrices.psa10 || gradePrices.psa8)
  const { prev, next } = getAdjacentCards(number)

  const low  = snapshot?.low_price  ?? null
  const high = snapshot?.high_price ?? null
  const avg  = snapshot?.avg_price  ?? null
  const rangePct = (v: number) =>
    low != null && high != null && high !== low
      ? Math.max(2, Math.min(98, Math.round(((v - low) / (high - low)) * 100)))
      : 50

  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* Type glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background: glow }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb + nav */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Link href="/binder" className="hover:text-slate-400 transition">Sets</Link>
            <span>/</span>
            <Link href="/binder/base-set" className="hover:text-slate-400 transition">Base Set</Link>
            <span>/</span>
            <span className="text-slate-400">{card.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {prev && (
              <Link href={`/binder/base-set/${prev.number}`}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5 border border-white/[0.06] transition">
                ← {prev.name}
              </Link>
            )}
            {next && (
              <Link href={`/binder/base-set/${next.number}`}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5 border border-white/[0.06] transition">
                {next.name} →
              </Link>
            )}
          </div>
        </div>

        {/* ── Main layout ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 mb-8">

          {/* Left: Card image (sticky on desktop) */}
          <div className="lg:self-start lg:sticky lg:top-20">
            <div
              className="relative w-56 sm:w-64 lg:w-full aspect-[2.5/3.5] rounded-2xl overflow-hidden mx-auto"
              style={{ boxShadow: `0 32px 80px ${glow}, 0 0 0 1px rgba(255,255,255,0.05)` }}
            >
              <Image src={card.imageUrl} alt={card.name} fill className="object-cover" unoptimized priority />
            </div>

            {/* Card meta below image */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Card Number</span>
                <span className="text-slate-300 font-medium">#{card.number} / 102</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Set</span>
                <span className="text-slate-300 font-medium">Base Set 1999</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Rarity</span>
                <span className="text-slate-300 font-medium">{card.rarity || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Type</span>
                <span className={`font-medium ${typeText}`}>{card.type}</span>
              </div>
              {card.isHolographic && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Foil</span>
                  <span className="text-rose-400 font-medium">Holographic</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Data panel */}
          <div className="space-y-5">

            {/* Name + badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${typeBg} ${typeText}`}>
                  {card.type}
                </span>
                {card.isHolographic && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    Holographic
                  </span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-500">
                  {card.rarity}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">{card.name}</h1>
              <p className="text-slate-500 text-sm mt-1">Base Set · 1999 · Wizards of the Coast</p>
            </div>

            {/* PSA Grade Prices */}
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {[8, 9, 10].map((g) => (
                  <div key={g} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 h-24 animate-pulse" />
                ))}
              </div>
            ) : hasData ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'PSA 8',  value: gradePrices.psa8,  bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   text: 'text-amber-400',   note: 'text-amber-700'   },
                  { label: 'PSA 9',  value: gradePrices.psa9,  bg: 'bg-blue-500/8',    border: 'border-blue-500/20',    text: 'text-blue-400',    note: 'text-blue-700'    },
                  { label: 'PSA 10', value: gradePrices.psa10, bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', text: 'text-emerald-400', note: 'text-emerald-700' },
                ].map(({ label, value, bg, border, text, note }) => (
                  <div key={label} className={`${bg} border ${border} rounded-2xl p-4 sm:p-5`}>
                    <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${note}`}>{label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${text}`}>{fmt(value)}</p>
                    {value != null && <p className="text-[11px] text-slate-600 mt-1">avg listing</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-sm text-slate-400 font-medium">No price data yet</p>
                <p className="text-xs text-slate-600 mt-1">eBay listings are collected daily. Check back soon.</p>
              </div>
            )}

            {/* Price Range */}
            {hasData && low != null && high != null && avg != null && low !== high && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Price Range</p>

                {/* Bar */}
                <div className="relative mx-4 mb-10">
                  <div className="h-1.5 rounded-full bg-white/[0.07]">
                    <div className={`h-full rounded-full bg-gradient-to-r ${accent} opacity-70`} style={{ width: '100%' }} />
                  </div>
                  {[
                    { label: 'Low',  value: low,  pct: 0 },
                    { label: 'Avg',  value: avg,  pct: rangePct(avg) },
                    { label: 'High', value: high, pct: 100 },
                  ].map(({ label, value, pct }) => (
                    <div key={label} className="absolute top-0 flex flex-col items-center"
                      style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-[#09090b] -mt-[3px]" />
                      <p className="text-[11px] text-slate-600 mt-2.5 whitespace-nowrap">{label}</p>
                      <p className="text-[11px] font-bold text-white whitespace-nowrap">${value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 divide-x divide-white/[0.06] text-center mt-2">
                  <div className="px-3">
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Lowest</p>
                    <p className="text-base font-bold text-emerald-400 tabular-nums">${low.toLocaleString()}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Average</p>
                    <p className="text-base font-bold text-white tabular-nums">${avg.toLocaleString()}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Highest</p>
                    <p className="text-base font-bold text-red-400 tabular-nums">${high.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Projection */}
            <div className="relative bg-gradient-to-br from-red-950/40 via-rose-950/20 to-transparent border border-red-500/15 rounded-2xl p-6 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-red-500/25 shrink-0">
                      AI
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">30-Day Price Projection</p>
                      <p className="text-[11px] text-red-400/50">Powered by Claude AI</p>
                    </div>
                  </div>
                  {snapshot?.snapshot_date && (
                    <span className="text-xs text-slate-600 shrink-0">
                      {new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>

                {projectionLoading ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <p className="text-xs text-red-400/50">Generating projection...</p>
                  </div>
                ) : projection ? (
                  <p className="text-sm text-slate-300 leading-relaxed">{projection}</p>
                ) : (
                  <p className="text-xs text-slate-600">Unable to generate projection at this time.</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Recent Listings ───────────────────────────────────────────── */}
        {recentSales.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Recent eBay Listings</h2>
                <p className="text-xs text-slate-600 mt-0.5">PSA graded · {recentSales.length} listings</p>
              </div>
              <span className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Base Set</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Grade', 'Price', 'Source', 'Date'].map((h, i) => (
                      <th key={h} className={`text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 ${i === 1 ? 'text-right px-6' : 'text-left px-6'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${gradeBadge(sale.grade_value)}`}>
                          PSA {sale.grade_value}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-white tabular-nums">
                        ${sale.sale_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">{sale.source}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs tabular-nums">
                        {new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
