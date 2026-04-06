'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { BASE_SET_CARDS, BaseSetCard } from '../../../lib/base-set-cards'

interface PriceSnapshot {
  card_id: number
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

interface CardWithData extends BaseSetCard {
  cardId?: number
  snapshot?: PriceSnapshot
  gradePrices?: GradePrices
}


// ── Filter/sort config ──────────────────────────────────────────────────────

const TYPES = ['All', 'Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Colorless', 'Trainer', 'Energy']
const RARITIES = ['All', 'Holo Rare', 'Rare', 'Uncommon', 'Common', 'Trainer', 'Energy']
type SortKey = 'number' | 'price-desc' | 'price-asc' | 'name'

const TYPE_BORDER: Record<string, string> = {
  Fire:      'group-hover:border-t-orange-500/50',
  Water:     'group-hover:border-t-blue-500/50',
  Grass:     'group-hover:border-t-green-500/50',
  Lightning: 'group-hover:border-t-yellow-400/50',
  Psychic:   'group-hover:border-t-pink-500/50',
  Fighting:  'group-hover:border-t-amber-500/50',
  Colorless: 'group-hover:border-t-slate-400/40',
  Trainer:   'group-hover:border-t-purple-500/50',
  Energy:    'group-hover:border-t-teal-400/50',
}

const RARITY_COLORS: Record<string, string> = {
  'Holo Rare': 'text-rose-400',
  'Rare':      'text-blue-400',
  'Uncommon':  'text-emerald-400',
  'Common':    'text-slate-500',
  'Trainer':   'text-purple-400',
  'Energy':    'text-teal-400',
}

// ── Main component ──────────────────────────────────────────────────────────

export default function BaseSet() {
  const [cards, setCards] = useState<CardWithData[]>([])
  const [loading, setLoading] = useState(true)

  const [typeFilter, setTypeFilter] = useState('All')
  const [rarityFilter, setRarityFilter] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [search, setSearch] = useState('')

  // ── Load all data ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      // Fetch all cards from Supabase to get IDs
      const { data: dbCards } = await supabase
        .from('cards')
        .select('id, name, card_number')

      // Fetch all latest price snapshots
      const { data: snapshots } = await supabase
        .from('price_snapshots')
        .select('card_id, avg_price, low_price, high_price, projection_notes, snapshot_date')
        .order('snapshot_date', { ascending: false })

      // Fetch all PSA 8-10 sales for grade breakdown
      const { data: sales } = await supabase
        .from('sales')
        .select('card_id, sale_price, grade_value')
        .eq('grade_company', 'PSA')
        .in('grade_value', [8, 9, 10])

      // Build lookup maps
      const idByName: Record<string, number> = {}
      if (dbCards) dbCards.forEach((c) => { idByName[c.name] = c.id })

      // Latest snapshot per card
      const snapshotByCardId: Record<number, PriceSnapshot> = {}
      if (snapshots) {
        snapshots.forEach((s) => {
          if (!snapshotByCardId[s.card_id]) snapshotByCardId[s.card_id] = s
        })
      }

      // Grade averages per card
      const gradesByCardId: Record<number, GradePrices> = {}
      if (sales) {
        const byCard: Record<number, typeof sales> = {}
        sales.forEach((s) => {
          if (!byCard[s.card_id]) byCard[s.card_id] = []
          byCard[s.card_id].push(s)
        })
        Object.entries(byCard).forEach(([cid, salesArr]) => {
          const avg = (grade: number) => {
            const prices = salesArr.filter((s) => s.grade_value === grade).map((s) => s.sale_price)
            return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null
          }
          gradesByCardId[Number(cid)] = { psa8: avg(8), psa9: avg(9), psa10: avg(10) }
        })
      }

      // Merge with static card list
      const merged: CardWithData[] = BASE_SET_CARDS.map((card) => {
        const cardId = idByName[card.name]
        const snapshot = cardId ? snapshotByCardId[cardId] : undefined
        const gradePrices = cardId ? gradesByCardId[cardId] : undefined
        return { ...card, cardId, snapshot, gradePrices }
      })

      setCards(merged)
      setLoading(false)
    }
    load()
  }, [])

  // ── Filter + sort ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...cards]

    if (typeFilter !== 'All') list = list.filter((c) => c.type === typeFilter)
    if (rarityFilter !== 'All') list = list.filter((c) => c.rarity === rarityFilter)
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

    const getPrice = (c: CardWithData) => {
      if (c.gradePrices?.psa9) return c.gradePrices.psa9
      if (c.gradePrices?.psa10) return c.gradePrices.psa10
      if (c.snapshot?.avg_price) return c.snapshot.avg_price
      return null
    }

    list.sort((a, b) => {
      if (sortKey === 'number') return parseInt(a.number) - parseInt(b.number)
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      const pa = getPrice(a) ?? -1
      const pb = getPrice(b) ?? -1
      if (sortKey === 'price-desc') return pb - pa
      if (sortKey === 'price-asc') {
        if (pa === -1 && pb === -1) return 0
        if (pa === -1) return 1
        if (pb === -1) return -1
        return pa - pb
      }
      return 0
    })

    return list
  }, [cards, typeFilter, rarityFilter, sortKey, search])

  const hasData = (c: CardWithData) =>
    !!(c.snapshot || c.gradePrices?.psa9 || c.gradePrices?.psa10 || c.gradePrices?.psa8)

  const displayPrice = (c: CardWithData) => {
    if (c.gradePrices?.psa9) return `$${c.gradePrices.psa9}`
    if (c.gradePrices?.psa10) return `$${c.gradePrices.psa10}`
    if (c.snapshot?.avg_price) return `$${c.snapshot.avg_price}`
    return '—'
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-8">
          <Link href="/binder" className="hover:text-slate-400 transition">Sets</Link>
          <span>/</span>
          <span className="text-slate-400 font-medium">Base Set</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Base Set</h1>
            <p className="text-slate-500 mt-1 text-sm">
              1999 · 102 cards · Wizards of the Coast
              {!loading && <span className="text-slate-700"> · {filtered.length} shown</span>}
            </p>
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-white/[0.05] border border-white/[0.08] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-red-500/50 cursor-pointer"
          >
            <option value="number">Sort: Card #</option>
            <option value="price-desc">Sort: Price ↓</option>
            <option value="price-asc">Sort: Price ↑</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2.5 mb-8">
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition w-full sm:w-60"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-600 uppercase tracking-wider mr-1 font-semibold">Type</span>
            {TYPES.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  typeFilter === t ? 'bg-white/10 text-white border-white/20' : 'text-slate-600 border-white/[0.06] hover:text-white hover:border-white/12'
                }`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-600 uppercase tracking-wider mr-1 font-semibold">Rarity</span>
            {RARITIES.map((r) => (
              <button key={r} onClick={() => setRarityFilter(r)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  rarityFilter === r ? 'bg-white/10 text-white border-white/20' : 'text-slate-600 border-white/[0.06] hover:text-white hover:border-white/12'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-slate-500 text-sm">Loading cards...</div>
        ) : (
          <>
            {/* Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((card) => (
                <Link
                  key={card.number}
                  href={`/binder/base-set/${card.number}`}
                  className={`group bg-white/[0.03] border border-white/[0.07] border-t-2 rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20 ${TYPE_BORDER[card.type] || ''}`}
                >
                  <div className="relative w-full aspect-[2.5/3.5] overflow-hidden bg-white/5">
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
                      unoptimized
                    />
                  </div>
                  <div className="p-2.5 pb-3">
                    <p className="font-semibold text-[11px] text-white truncate">{card.name}</p>
                    <p className={`text-[11px] mb-1.5 ${RARITY_COLORS[card.rarity] || 'text-slate-600'}`}>
                      {card.rarity || card.type}
                    </p>
                    <p className={`text-xs font-bold tabular-nums ${hasData(card) ? 'text-red-400' : 'text-slate-700'}`}>
                      {displayPrice(card)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20 text-slate-500 text-sm">No cards match this filter.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
