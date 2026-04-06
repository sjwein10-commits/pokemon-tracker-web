import Link from 'next/link'

export default function About() {
  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* Subtle background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* ── Section 1: Title + Mission ─────────────────────────────────── */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold px-3.5 py-1.5 rounded-full mb-6 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            About
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-5 leading-[1.08]">
            About Card Pulse
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Card Pulse helps Pokemon card collectors make smarter selling decisions
            using real sales data and AI — so you spend less time guessing and more
            time acting with confidence.
          </p>
        </div>

        <div className="space-y-12">

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* ── Section 2: What the Platform Does ──────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-3">What It Does</p>
            <h2 className="text-xl font-bold text-white mb-4">Built to help you understand your cards' value</h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              Card Pulse tracks real eBay listings and completed sales across the 1999
              Pokemon Base Set, analyzing prices by PSA grade — 8, 9, and 10 — to give
              you an accurate picture of what the market actually looks like right now.
            </p>
            <p className="text-slate-400 leading-relaxed">
              The goal is simple: help you understand what your cards are worth and
              when it might be the right time to sell. No noise, no guessing — just
              clean data presented clearly.
            </p>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* ── Section 3: How It Works ─────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-xl font-bold text-white mb-6">Three steps from raw data to clear insight</h2>
            <div className="space-y-5">
              {[
                {
                  step: '01',
                  title: 'Data collection',
                  body: 'Active PSA-graded listings are pulled from eBay daily, filtered to grades 8 through 10 for every card in the Base Set.',
                },
                {
                  step: '02',
                  title: 'AI analysis',
                  body: 'Claude AI reviews recent price movements, grade-by-grade trends, and historical patterns to produce a 30-day price projection for each card.',
                },
                {
                  step: '03',
                  title: 'Clear estimates',
                  body: 'You see a straightforward breakdown — low, average, and high prices per grade — alongside an AI projection written in plain language.',
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex gap-5">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[11px] font-bold text-red-400">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* ── Section 4: Why It Matters ───────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-3">Why It Matters</p>
            <h2 className="text-xl font-bold text-white mb-4">Card prices move. Most sellers don't have the data to keep up.</h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              Pokemon card values — especially graded copies — can shift significantly
              week to week. A PSA 10 Charizard that sells for one price today might be
              worth meaningfully more or less in a month. Without data, most collectors
              rely on gut feel or a quick search, which rarely tells the full story.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Card Pulse exists to close that gap. By combining real listing data with
              AI-generated trend analysis, the platform gives collectors a clearer view
              of where prices are heading — reducing guesswork and helping you decide
              when to hold and when to sell.
            </p>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* ── Section 5: Disclaimer ───────────────────────────────────────── */}
          <section>
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-3">Disclaimer</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-3">
                All price estimates and AI projections on Card Pulse are based on
                publicly available listing data and are provided for informational
                purposes only. They do not represent guaranteed sale prices.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                This platform is a guidance tool, not financial advice. Market
                conditions change, and past pricing trends do not guarantee future
                results. Always do your own research before making any buying or
                selling decisions.
              </p>
            </div>
          </section>

        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="mt-16 flex flex-wrap gap-3">
          <Link
            href="/binder/base-set"
            className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-red-500/20"
          >
            Browse Base Set
          </Link>
          <Link
            href="/active-data"
            className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white text-sm font-semibold px-6 py-3 rounded-xl transition"
          >
            View Active Listings
          </Link>
        </div>

      </div>
    </div>
  )
}
