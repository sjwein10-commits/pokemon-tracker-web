export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card shape background */}
      <rect x="2" y="5" width="20" height="26" rx="3" fill="url(#cardGrad)" />

      {/* Second card (behind, offset) */}
      <rect x="8" y="2" width="20" height="26" rx="3" fill="url(#cardGrad2)" opacity="0.5" />

      {/* Front card */}
      <rect x="4" y="7" width="20" height="26" rx="3" fill="url(#cardGradMain)" />

      {/* Dollar sign on card */}
      <text
        x="14"
        y="24"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill="white"
        opacity="0.95"
      >
        $
      </text>

      {/* Trend line (top right) */}
      <polyline
        points="22,28 26,22 29,24 33,16"
        stroke="url(#trendGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Trend dot */}
      <circle cx="33" cy="16" r="2" fill="#34d399" />

      <defs>
        <linearGradient id="cardGrad" x1="2" y1="5" x2="22" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="cardGrad2" x1="8" y1="2" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="cardGradMain" x1="4" y1="7" x2="24" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id="trendGrad" x1="22" y1="28" x2="33" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  )
}
