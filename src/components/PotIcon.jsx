// Tall vase SVG icon — narrow foot, dramatic hip flare, pinched waist, graceful neck.
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
      {/* Body — traces rim → neck → waist pinch → dramatic hip flare → narrow foot */}
      <path
        d="M 14 8
           C 14 5 34 5 34 8
           C 34 11 31 14 31 17
           C 30 20 29 21 29 23
           C 29 29 43 30 43 36
           C 43 41 37 44 30 45
           L 18 45
           C 11 44 5 41 5 36
           C 5 30 19 29 19 23
           C 19 21 18 20 17 17
           C 17 14 14 11 14 8 Z"
        fill={color}
      />
      {/* Rim lip — flares slightly wider than the neck */}
      <path
        d="M 11 8 C 17 4 31 4 37 8"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Foot ring */}
      <ellipse cx="24" cy="45" rx="7" ry="1.5" fill={color} opacity="0.45" />
      {/* Sheen — curved highlight following the hip */}
      <path
        d="M 7 29 C 6 33 6 37 8 41"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
        fill="none"
      />
    </svg>
  );
}
