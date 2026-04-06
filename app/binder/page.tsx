import Link from 'next/link'

const sets = [
  {
    name: 'Base Set',
    year: '1999',
    cards: 102,
    slug: 'base-set',
    available: true,
    description: 'The original 102-card set featuring Charizard, Blastoise, Venusaur, and Mewtwo.',
    accent: 'from-orange-500 to-red-500',
    dot: 'bg-orange-500',
  },
  {
    name: 'Jungle',
    year: '1999',
    cards: 64,
    slug: 'jungle',
    available: false,
    description: 'Features Scyther, Pinsir, and the original Eevee evolution cards.',
    accent: 'from-green-500 to-emerald-600',
    dot: 'bg-green-500',
  },
  {
    name: 'Fossil',
    year: '1999',
    cards: 62,
    slug: 'fossil',
    available: false,
    description: 'Prehistoric Pokémon including Gengar, Lapras, and Aerodactyl.',
    accent: 'from-stone-400 to-slate-500',
    dot: 'bg-stone-400',
  },
  {
    name: 'Base Set 2',
    year: '2000',
    cards: 130,
    slug: 'base-set-2',
    available: false,
    description: 'A reprint combining Base Set and Jungle in one 130-card collection.',
    accent: 'from-blue-500 to-cyan-500',
    dot: 'bg-blue-500',
  },
  {
    name: 'Team Rocket',
    year: '2000',
    cards: 82,
    slug: 'team-rocket',
    available: false,
    description: 'Dark Pokémon make their debut alongside the Team Rocket antagonists.',
    accent: 'from-slate-400 to-slate-600',
    dot: 'bg-slate-400',
  },
  {
    name: 'Gym Heroes',
    year: '2000',
    cards: 132,
    slug: 'gym-heroes',
    available: false,
    description: 'Gym Leader Pokémon from the original Kanto region games.',
    accent: 'from-purple-500 to-violet-600',
    dot: 'bg-purple-500',
  },
]

export default function Binder() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Sets</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Browse every tracked set and explore card prices.</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((set) => (
            <div
              key={set.slug}
              className={`group relative bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden transition-all ${
                set.available
                  ? 'hover:border-white/[0.13] hover:bg-white/[0.05] hover:-translate-y-0.5'
                  : 'opacity-40'
              }`}
            >
              {/* Top accent line */}
              <div className={`h-[2px] bg-gradient-to-r ${set.accent}`} />

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">{set.name}</h2>
                    <p className="text-xs text-slate-600 mt-0.5">{set.year} · {set.cards} cards</p>
                  </div>
                  {set.available ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      Live
                    </span>
                  ) : (
                    <span className="bg-white/5 border border-white/8 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 leading-relaxed mb-5">{set.description}</p>

                {set.available ? (
                  <Link
                    href={`/binder/${set.slug}`}
                    className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${set.accent} text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition`}
                  >
                    Browse Cards →
                  </Link>
                ) : (
                  <p className="text-xs text-slate-700">Data collection pending</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
