import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

async function generateProjection(cardName: string, type: string, rarity: string, gradePrices: { psa8: number | null; psa9: number | null; psa10: number | null }) {
  const gradeLines = [
    gradePrices.psa8  != null ? `- PSA 8: $${gradePrices.psa8}`  : null,
    gradePrices.psa9  != null ? `- PSA 9: $${gradePrices.psa9}`  : null,
    gradePrices.psa10 != null ? `- PSA 10: $${gradePrices.psa10}` : null,
  ].filter(Boolean).join('\n')

  const hasData = gradeLines.length > 0

  const prompt = hasData
    ? `You are a Pokemon card market analyst. Based on recent eBay listings for ${cardName} (Base Set, ${rarity}, ${type} type) — PSA graded copies only:\n\n${gradeLines}\n\nGive a short 2-3 sentence 30-day price projection. Reference the PSA grades specifically. Be concrete about direction (up/down/stable) and expected price range per grade.`
    : `You are a Pokemon card market analyst. Give a short 2-3 sentence general 30-day price outlook for ${cardName} from the 1999 Pokemon Base Set (${rarity}, ${type} type). Base your analysis on typical market trends for Base Set cards of this rarity. Note that live pricing data is being collected and will be available soon.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text as string
}

export async function POST(req: NextRequest) {
  try {
    const { cardName, cardNumber, type, rarity } = await req.json()

    // 1. Get card ID
    const { data: dbCard } = await supabase
      .from('cards')
      .select('id')
      .eq('name', cardName)
      .single()

    const cardId = dbCard?.id ?? null

    // 2. Check for existing projection
    if (cardId) {
      const { data: existing } = await supabase
        .from('price_snapshots')
        .select('avg_price, low_price, high_price, projection_notes, snapshot_date')
        .eq('card_id', cardId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      if (existing?.projection_notes) {
        return NextResponse.json({ projection: existing.projection_notes, cached: true })
      }
    }

    // 3. Fetch grade prices if we have a card ID
    let gradePrices = { psa8: null as number | null, psa9: null as number | null, psa10: null as number | null }

    if (cardId) {
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_price, grade_value')
        .eq('card_id', cardId)
        .eq('grade_company', 'PSA')
        .in('grade_value', [8, 9, 10])

      if (sales && sales.length > 0) {
        const avg = (grade: number) => {
          const prices = sales.filter((s) => s.grade_value === grade).map((s) => s.sale_price)
          return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null
        }
        gradePrices = { psa8: avg(8), psa9: avg(9), psa10: avg(10) }
      }
    }

    // 4. Generate projection with Claude
    const projection = await generateProjection(cardName, type, rarity, gradePrices)

    // 5. Save to DB if we have a card ID
    if (cardId) {
      const avgPrice = gradePrices.psa9 ?? gradePrices.psa10 ?? gradePrices.psa8 ?? 0
      await supabase.from('price_snapshots').insert({
        card_id: cardId,
        snapshot_date: new Date().toISOString().split('T')[0],
        avg_price: avgPrice,
        low_price: avgPrice,
        high_price: avgPrice,
        projected_price: avgPrice,
        projection_notes: projection,
      })
    }

    return NextResponse.json({ projection, cached: false })
  } catch (err) {
    console.error('Projection error:', err)
    return NextResponse.json({ error: 'Failed to generate projection' }, { status: 500 })
  }
}
