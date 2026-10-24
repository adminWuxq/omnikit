export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ borderRadius: '22%', boxShadow: '0 6px 18px rgba(99,102,241,.45)', flexShrink: 0 }}>
      <defs>
        <linearGradient id="lg-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#lg-g)" />
      <path d="M35 8 L17 36 h11 l-4 20 L47 27 h-11 z" fill="#ffffff" fillOpacity="0.96" />
    </svg>
  );
}
