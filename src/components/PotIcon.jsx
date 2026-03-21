// Hand-drawn style pottery pot SVG icon.
// Shape: globular thrown-pot silhouette — wide round belly, constricted neck,
// flared lip. All cubic bezier curves, no straight sides.
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
      {/* Body — traces left rim → neck constriction → wide belly → foot → mirror right */}
      <path
        d="M 14 11
           C 15 13 16 15 16 18
           C 10 21 4 26 4 32
           C 4 38 10 43 18 43
           L 30 43
           C 38 43 44 38 44 32
           C 44 26 38 21 32 18
           C 32 15 33 13 34 11
           C 29 8 19 8 14 11 Z"
        fill={color}
      />
      {/* Rim lip — flares slightly wider than the neck, like a thrown edge */}
      <path
        d="M 11 11 C 16 7 32 7 37 11"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Sheen — subtle curved highlight on the left belly */}
      <path
        d="M 9 25 C 8 29 8 34 11 39"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
        fill="none"
      />
    </svg>
  );
}
