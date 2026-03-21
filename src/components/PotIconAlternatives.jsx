// Nine alternative pot icon designs — all share a tall slender base with a curvy middle.
// Props: size (number, default 24), color (string, default "currentColor")
import PotIcon from "./PotIcon";

// 1: Classic Amphora — wide dramatic belly at mid-height, pinched neck, flared rim
export function PotIcon1({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 16 8
           C 14 8 18 12 18 16
           C 18 20 8 24 8 30
           C 8 36 14 42 20 44
           L 28 44
           C 34 42 40 36 40 30
           C 40 24 30 20 30 16
           C 30 12 34 8 32 8
           C 29 5 19 5 16 8 Z"
        fill={color}
      />
      <path d="M 13 8 C 17 4 31 4 35 8" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="44" rx="6" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 8 27 C 7 31 7 36 9 40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 2: Tulip Vase — same as the main PotIcon (selected design)
export { default as PotIcon2 } from "./PotIcon";

// 3: Bottle Vase — very long narrow neck, round compact belly below
export function PotIcon3({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 21 5
           L 21 18
           C 19 22 9 26 9 33
           C 9 39 14 44 24 44
           C 34 44 39 39 39 33
           C 39 26 29 22 27 18
           L 27 5
           C 26 3 22 3 21 5 Z"
        fill={color}
      />
      <ellipse cx="24" cy="5" rx="3" ry="1.5" fill={color} />
      <ellipse cx="24" cy="44" rx="7" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 9 30 C 8 34 9 39 11 42" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 4: Exaggerated S-Curve — more dramatic waist pinch and hip flare than the original
export function PotIcon4({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 15 7
           C 15 4 33 4 33 7
           C 33 10 30 13 29 17
           C 28 20 27 21 27 24
           C 27 30 44 30 44 37
           C 44 42 36 46 24 46
           C 12 46 4 42 4 37
           C 4 30 21 30 21 24
           C 21 21 20 20 19 17
           C 18 13 15 10 15 7 Z"
        fill={color}
      />
      <path d="M 11 7 C 16 3 32 3 37 7" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="46" rx="8" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 5 32 C 4 36 5 41 7 44" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 5: Double Gourd — two bulges separated by a tight pinch, like a gourd or calabash
export function PotIcon5({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 20 6
           C 17 6 13 9 13 14
           C 13 19 17 22 17 25
           C 17 27 17 27 16 28
           C 12 30 9 33 9 38
           C 9 42 14 46 24 46
           C 34 46 39 42 39 38
           C 39 33 36 30 32 28
           C 31 27 31 27 31 25
           C 31 22 35 19 35 14
           C 35 9 31 6 28 6
           C 26 4 22 4 20 6 Z"
        fill={color}
      />
      <path d="M 18 6 C 20 3 28 3 30 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="46" rx="7" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 9 35 C 8 38 9 42 11 45" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 6: Low Belly Vase — very long elegant neck, compact belly near the base
export function PotIcon6({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 20 5
           C 19 5 18 7 18 9
           L 18 28
           C 15 30 9 33 9 38
           C 9 42 14 45 24 45
           C 34 45 39 42 39 38
           C 39 33 33 30 30 28
           L 30 9
           C 30 7 29 5 28 5
           C 26 3 22 3 20 5 Z"
        fill={color}
      />
      <ellipse cx="24" cy="5" rx="4" ry="2" fill={color} />
      <ellipse cx="24" cy="45" rx="7" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 9 35 C 8 38 9 42 11 44" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 7: Pear / Teardrop — widest just above center, tapers sharply to very slender foot
export function PotIcon7({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 19 8
           C 15 8 9 14 8 21
           C 7 27 9 32 16 38
           C 18 41 20 44 24 44
           C 28 44 30 41 32 38
           C 39 32 41 27 40 21
           C 39 14 33 8 29 8
           C 27 6 21 6 19 8 Z"
        fill={color}
      />
      <path d="M 17 8 C 19 5 29 5 31 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="44" rx="5" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 8 22 C 7 27 8 32 11 37" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 8: Elegant Ewer — subtle shoulder flare, medium neck, graceful overall proportions
export function PotIcon8({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 20 6
           C 18 6 17 8 17 11
           C 16 15 14 18 13 23
           C 11 27 10 31 10 36
           C 10 41 15 45 24 45
           C 33 45 38 41 38 36
           C 38 31 37 27 35 23
           C 34 18 32 15 31 11
           C 31 8 30 6 28 6
           C 26 4 22 4 20 6 Z"
        fill={color}
      />
      <path d="M 17 6 C 19 3 29 3 31 6" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="45" rx="7" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 10 30 C 9 34 9 39 11 43" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}

// 9: Urn / Trophy — narrow foot column, then shoulders flare wide at the top
export function PotIcon9({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={style} {...props}>
      <path
        d="M 21 8
           C 19 8 18 10 18 14
           C 17 18 16 20 15 24
           C 12 28 10 32 10 37
           C 10 41 14 44 21 44
           L 27 44
           C 34 44 38 41 38 37
           C 38 32 36 28 33 24
           C 32 20 31 18 30 14
           C 30 10 29 8 27 8
           C 25 6 23 6 21 8 Z"
        fill={color}
      />
      <path d="M 18 8 C 20 5 28 5 30 8" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="44" rx="6" ry="1.5" fill={color} opacity="0.4" />
      <path d="M 10 32 C 9 36 10 40 12 43" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.22" fill="none" />
    </svg>
  );
}
