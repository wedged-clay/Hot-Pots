// Three alternative pot icon designs.
// Props: size (number, default 24), color (string, default "currentColor")

// Option A: Classic Round Crock — squat, symmetrical, wide belly with short neck
export function PotIconA({ size = 24, color = "currentColor", style, ...props }) {
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
      {/* Round body — wide belly tapering to a short neck and stable base */}
      <path
        d="M 19 9
           C 16 9 10 13 9 20
           C 7 26 7 32 9 37
           C 11 42 16 44 24 44
           C 32 44 37 42 39 37
           C 41 32 41 26 39 20
           C 38 13 32 9 29 9
           C 27 7 21 7 19 9 Z"
        fill={color}
      />
      {/* Rim lip */}
      <path
        d="M 16 9 C 19 6 29 6 32 9"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Foot shadow */}
      <ellipse cx="24" cy="44" rx="8" ry="1.5" fill={color} opacity="0.4" />
      {/* Sheen */}
      <path
        d="M 9 26 C 8 30 8 35 10 39"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
        fill="none"
      />
    </svg>
  );
}

// Option B: Pot with Loop Handles — round body with two side handles, like a stock pot
export function PotIconB({ size = 24, color = "currentColor", style, ...props }) {
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
      {/* Round body */}
      <path
        d="M 16 12
           C 12 12 9 17 9 24
           C 9 32 14 40 24 40
           C 34 40 39 32 39 24
           C 39 17 36 12 32 12
           C 29 9 19 9 16 12 Z"
        fill={color}
      />
      {/* Left loop handle */}
      <path
        d="M 9 22 C 3 21 2 31 9 32"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right loop handle */}
      <path
        d="M 39 22 C 45 21 46 31 39 32"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Rim */}
      <ellipse cx="24" cy="12" rx="8" ry="2.5" fill={color} />
      {/* Base foot shadow */}
      <ellipse cx="24" cy="40" rx="8" ry="1.5" fill={color} opacity="0.4" />
    </svg>
  );
}

// Option C: Wide Shallow Planter — low-profile bowl, like a bonsai pot or ikebana vessel
export function PotIconC({ size = 24, color = "currentColor", style, ...props }) {
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
      {/* Wide shallow body */}
      <path
        d="M 5 24
           C 5 21 12 18 24 18
           C 36 18 43 21 43 24
           L 40 40
           C 39 43 33 46 24 46
           C 15 46 9 43 8 40
           Z"
        fill={color}
      />
      {/* Wide rim ellipse */}
      <ellipse cx="24" cy="22" rx="19" ry="4.5" fill={color} />
      {/* Base foot shadow */}
      <ellipse cx="24" cy="45" rx="10" ry="1.8" fill={color} opacity="0.4" />
      {/* Sheen */}
      <path
        d="M 7 28 C 6 32 6 37 8 40"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
        fill="none"
      />
    </svg>
  );
}
