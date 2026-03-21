// Hand-drawn style pottery pot SVG icon.
// Props: size (number, default 24), color (string, default "currentColor")
export default function PotIcon({ size = 24, color = "currentColor", style, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
      {...props}
    >
      {/* Rim */}
      <path
        d="M15 11 C15 9 17 8 24 8 C31 8 33 9 33 11 L33 14 C33 15.1 32.1 16 31 16 L17 16 C15.9 16 15 15.1 15 14 Z"
        fill={color}
        opacity="0.9"
      />
      {/* Handles */}
      <path
        d="M15 17 C12 17 10 19 10 21 C10 23 12 24 14 24"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M33 17 C36 17 38 19 38 21 C38 23 36 24 34 24"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Body */}
      <path
        d="M16 16 C13 20 11 26 12 32 C13 37 17 40 24 40 C31 40 35 37 36 32 C37 26 35 20 32 16 Z"
        fill={color}
      />
      {/* Sheen highlight */}
      <path
        d="M19 21 C18 24 18 28 19 31"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.25"
        fill="none"
      />
    </svg>
  );
}
