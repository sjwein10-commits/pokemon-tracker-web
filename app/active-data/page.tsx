'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

interface Sale {
  id: number
  sale_price: number
  sale_date: string
  grade_value: number
  grade_company: string
  source: string
  cards: {
    name: string
    rarity: string
    card_number: string
  }
}

type SortField = 'name' | 'grade' | 'price' | 'date'
type SortDir   = 'asc' | 'desc'

const gradeBadge = (g: number) =>
  g === 10 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
  : g === 9 ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
  : 'bg-amber-500/15 text-amber-400 border-amber-500/20'

export default function ActiveData() {
  const [sales, setSales]           = useState<Sale[]>([])
  const [loading, setLoading]       = useState(true)
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [sortField, setSortField]   = useState<SortField>('date')
  const [sortDir, setSortDir]       = useState<SortDir>('desc')

  useEffect(() => {
    supabase
      .from('sales')
      .select('id, sale_price, sale_date, grade_value, grade_company, source, cards(name, rarity, card_number)')
      .eq('grade_company', 'PSA')
      .in('grade_value', [8, 9, 10])
      .order('sale_date', { ascending: false })
      .limit(400)
      .then(({ data }) => {
        if (data) setSales(data as Sale[])
        setLoading(false)
      })
  }, [])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    let list = sales.filter((s) => {
      const gradeMatch = gradeFilter === 'all' || s.grade_value === gradeFilter
      const nameMatch  = !search || s.cards.name.toLowerCase().includes(search.toLowerCase())
      return gradeMatch && nameMatch
    })

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name')  cmp = a.cards.name.localeCompare(b.cards.name)
      if (sortField === 'grade') cmp = a.grade_value - b.grade_value
      if (sortField === 'price') cmp = a.sale_price - b.sale_price
      if (sortField === 'date')  cmp = new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [sales, gradeFilter, search, sortField, sortDir])

  // Summary stats
  const avgPrice = sorted.length ? (sorted.reduce((s, x) => s + x.sale_price, 0) / sorted.length).toFixed(0) : '—'
  const maxPrice = sorted.length ? Math.max(...sorted.map(s => s.sale_price)).toFixed(0) : '—'

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-slate-700 ml-1">↕</span>
    return <span className="text-red-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Active Data</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Live eBay listings · PSA graded · Base Set</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md">
          {[
            { label: 'Listings',   value: sorted.length.toString() },
            { label: 'Avg Price',  value: sorted.length ? `$${avgPrice}` : '—' },
            { label: 'Highest',    value: sorted.length ? `$${maxPrice}` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">{label}</p>
              <p className="text-xl font-bold text-white tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search card name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition w-56"
          />
          <div className="flex gap-2">
            {(['all', 8, 9, 10] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  gradeFilter === g
                    ? 'bg-white/10 text-white border-white/20'
                    : 'text-slate-600 border-white/[0.07] hover:text-white hover:border-white/15'
                }`}
              >
                {g === 'all' ? 'All Grades' : `PSA ${g}`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-24 text-slate-600 text-sm">Loading listings...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24 text-slate-600 text-sm">No listings found</div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                    {[
                      { label: 'Card',    field: 'name'  as SortField },
                      { label: 'Set',     field: null },
                      { label: 'Grade',   field: 'grade' as SortField },
                      { label: 'Price',   field: 'price' as SortField },
                      { label: 'Source',  field: null },
                      { label: 'Date',    field: 'date'  as SortField },
                    ].map(({ label, field }) => (
                      <th
                        key={label}
                        onClick={() => field && toggleSort(field)}
                        className={`text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-5 py-3.5 whitespace-nowrap ${field ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`}
                      >
                        {label}{field && <SortIcon field={field} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sorted.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-5 py-3.5 font-medium text-white">{sale.cards.name}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">Base Set</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${gradeBadge(sale.grade_value)}`}>
                          PSA {sale.grade_value}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-white tabular-nums">
                        ${sale.sale_price.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{sale.source}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs tabular-nums">
                        {new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-white/[0.05] text-[11px] text-slate-600">
              {sorted.length} listing{sorted.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
