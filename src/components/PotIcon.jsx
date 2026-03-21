// Tulip vase SVG icon — slim neck, belly curves inward, top flares outward like a trumpet.
// Props: size (number, default 24), color (string, default "currentColor")
export default function PotIcon({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={style}
      {...props}
    >
      {/* Body — flared rim → neck curves inward → belly pinches → tapers to slender foot */}
      <path
        d="M 13 8
           C 16 11 18 14 19 18
           C 20 22 19 26 17 30
           C 14 34 12 38 14 42
           C 16 44 20 45 24 45
           C 28 45 32 44 34 42
           C 36 38 34 34 31 30
           C 29 26 28 22 29 18
           C 30 14 32 11 35 8
           C 31 5 17 5 13 8 Z"
        fill={color}
      />
      {/* Rim lip — wide trumpet flare */}
      <path
        d="M 11 8 C 15 3 33 3 37 8"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Foot ring */}
      <ellipse cx="24" cy="45" rx="6" ry="1.5" fill={color} opacity="0.4" />
      {/* Sheen — curved highlight following the belly */}
      <path
        d="M 14 30 C 13 34 13 38 15 42"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
        fill="none"
      />
    </svg>
  );
}
