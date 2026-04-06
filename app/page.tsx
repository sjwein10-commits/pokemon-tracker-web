'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { BASE_SET_CARDS } from '../lib/base-set-cards'

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

function getCardImageUrl(cardNumber: string) {
  return `https://images.pokemontcg.io/base1/${cardNumber}.png`
}

const gradeColors = {
  psa8:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400'   },
  psa9:  { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400'    },
  psa10: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
}

export default function Home() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Snapshot | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [gradePrices, setGradePrices] = useState<{ psa8: number | null; psa9: number | null; psa10: number | null }>({ psa8: null, psa9: null, psa10: null })

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('price_snapshots')
        .select('*, cards(name, rarity, is_holographic, card_number)')
        .order('snapshot_date', { ascending: false })
      if (data) {
        const seen = new Set()
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.toLowerCase()
    const snapshotMatch = snapshots.find((s) => s.cards.name.toLowerCase().includes(q))
    const staticMatch = BASE_SET_CARDS.find((c) => c.name.toLowerCase().includes(q))

    if (!snapshotMatch && !staticMatch) {
      setResult(null); setNotFound(true); return
    }

    if (snapshotMatch) {
      setResult(snapshotMatch)
    } else {
      setResult({
        id: 0, snapshot_date: '', avg_price: 0, low_price: 0, high_price: 0,
        projected_price: 0, projection_notes: '',
        cards: {
          name: staticMatch!.name, rarity: staticMatch!.rarity,
          is_holographic: staticMatch!.isHolographic, card_number: staticMatch!.number,
        },
      })
    }
    setNotFound(false)
    setGradePrices({ psa8: null, psa9: null, psa10: null })

    const cardResult = await supabase.from('cards').select('id').eq('name', snapshotMatch?.cards.name ?? staticMatch!.name).single()
    if (cardResult.data) {
      const { data: sales } = await supabase.from('sales').select('sale_price, grade_value')
        .eq('card_id', cardResult.data.id).eq('grade_company', 'PSA').in('grade_value', [8, 9, 10])
      if (sales && sales.length > 0) {
        const avg = (grade: number) => {
          const prices = sales.filter((s) => s.grade_value === grade).map((s) => s.sale_price)
          return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null
        }
        setGradePrices({ psa8: avg(8), psa9: avg(9), psa10: avg(10) })
      }
    }
  }

  const cardNumber = result?.cards.card_number
  const staticCard = cardNumber ? BASE_SET_CARDS.find((c) => c.number === cardNumber) : null

  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold px-3.5 py-1.5 rounded-full mb-7 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            PSA Graded · Base Set · AI Powered
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.08] mb-4 tracking-tight">
            Track every card.
            <br />
            <span className="bg-gradient-to-r from-red-400 via-rose-400 to-red-500 bg-clip-text text-transparent">
              Know every price.
            </span>
          </h1>

          <p className="text-base text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
            Real eBay listings, PSA graded prices, and Claude AI 30-day projections for every 1999 Base Set card.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (!e.target.value) { setResult(null); setNotFound(false) }
              }}
              placeholder="Search any card — e.g. Charizard"
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.07] transition"
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-red-500/20 shrink-0"
            >
              Search
            </button>
          </form>

          {notFound && (
            <p className="mt-3 text-xs text-red-400/70">No card found for &quot;{query}&quot;</p>
          )}
        </div>
      </section>

      {/* ── Search Result ────────────────────────────────────────────────── */}
      {result && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="flex gap-5 p-5">
              <Link href={`/binder/base-set/${result.cards.card_number}`} className="relative w-28 shrink-0 aspect-[2.5/3.5] rounded-xl overflow-hidden bg-white/5 hover:opacity-90 transition">
                <Image src={getCardImageUrl(result.cards.card_number)} alt={result.cards.name} fill className="object-cover" unoptimized />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-semibold">
                  {result.cards.is_holographic ? 'Holographic · ' : ''}{result.cards.rarity} · Base Set
                </p>
                <h2 className="text-xl font-bold text-white mb-4 truncate">{result.cards.name}</h2>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['psa8', 'psa9', 'psa10'] as const).map((key) => {
                    const label = key === 'psa8' ? 'PSA 8' : key === 'psa9' ? 'PSA 9' : 'PSA 10'
                    const { bg, border, text } = gradeColors[key]
                    return (
                      <div key={key} className={`${bg} border ${border} rounded-xl p-2.5 text-center`}>
                        <p className="text-[11px] text-slate-600 uppercase tracking-wide mb-1">{label}</p>
                        <p className={`text-sm font-bold ${text}`}>
                          {gradePrices[key] != null ? `$${gradePrices[key]}` : '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {result.snapshot_date && (
                  <p className="text-xs text-slate-600">
                    Updated {new Date(result.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {result.projection_notes ? (
              <div className="border-t border-white/[0.06] p-5 bg-gradient-to-br from-red-950/30 to-transparent">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">AI</div>
                  <p className="text-xs font-semibold text-white">30-Day Price Projection</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{result.projection_notes}</p>
              </div>
            ) : (
              <div className="border-t border-white/[0.06] p-5 flex items-center justify-between">
                <p className="text-xs text-slate-600">No price data yet — check back soon.</p>
                <Link href={`/binder/base-set/${result.cards.card_number}`} className="text-xs text-red-400 hover:text-red-300 font-medium">
                  View full page →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Top Cards ────────────────────────────────────────────────────── */}
      {!result && snapshots.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Top Tracked Cards</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sorted by average PSA listing price</p>
            </div>
            <Link href="/binder/base-set" className="text-[13px] text-slate-500 hover:text-white transition font-medium">
              View all 102 →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {snapshots.slice(0, 5).map((snap) => (
              <Link
                key={snap.id}
                href={`/binder/base-set/${snap.cards.card_number}`}
                className="group bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-red-500/25 hover:-translate-y-0.5 hover:bg-white/[0.05] transition-all"
              >
                <div className="relative w-full aspect-[2.5/3.5] overflow-hidden bg-white/5">
                  <Image
                    src={getCardImageUrl(snap.cards.card_number)}
                    alt={snap.cards.name}
                    fill
                    className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-white truncate mb-0.5">{snap.cards.name}</p>
                  <p className="text-[11px] text-slate-600 mb-2">{snap.cards.rarity}</p>
                  <p className="text-sm font-bold text-red-400">${snap.avg_price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {!result && (
        <div className="border-t border-white/[0.06] bg-white/[0.015]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-3 divide-x divide-white/[0.06] text-center">
            <div className="px-4">
              <p className="text-xl font-bold text-white">102</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Cards Tracked</p>
            </div>
            <div className="px-4">
              <p className="text-xl font-bold text-white">PSA 8–10</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Grades Covered</p>
            </div>
            <div className="px-4">
              <p className="text-xl font-bold text-white">Daily</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Data Updates</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
