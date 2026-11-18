// Hand-stamped logo mark: a rubber-stamp "PDF" in teal, tilted -2deg.
// Replaces the generic Lucide FileText used in nav/footer/favicon.
export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="PDF Tools Hub logo"
      className={className}
    >
      <g transform="rotate(-2 24 24)">
        <rect x="4" y="4" width="40" height="40" rx="6" fill="none" stroke="#0f766e" strokeWidth="3" />
        <rect x="8.5" y="8.5" width="31" height="31" rx="3" fill="none" stroke="#0f766e" strokeWidth="1.25" />
        <text
          x="24"
          y="29"
          textAnchor="middle"
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
          fontSize="13"
          fontWeight="800"
          letterSpacing="0.5"
          fill="#0f766e"
        >
          PDF
        </text>
        <line x1="14" y1="34" x2="34" y2="34" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
