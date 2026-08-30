import type { Character } from "../types";

interface AvatarProps {
  char: Character;
  size?: number;
  animate?: boolean;
  running?: boolean;
}

export function Avatar({ char, size = 80, animate = false, running = false }: AvatarProps) {
  const w = size;
  const h = size * 1.35;
  const isGirl = char.gender === "girl";
  const sc = char.skinColor;
  const hc = char.hairColor;
  const sh = char.shirtColor;
  const pa = char.pantsColor;
  const sk = char.shoeColor;

  // Running animation offset (simple CSS-based bob)
  const style = animate && running
    ? { animation: "runBob 0.35s ease-in-out infinite alternate" }
    : {};

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 60 81"
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Shadow ── */}
      <ellipse cx="30" cy="79" rx="14" ry="3" fill="rgba(0,0,0,0.25)" />

      {/* ── Legs ── */}
      {isGirl ? (
        <>
          {/* Skirt */}
          <path d="M18 52 Q22 68 30 70 Q38 68 42 52 Z" fill={sh} opacity="0.9" />
          {/* Bare legs */}
          <rect x="22" y="65" width="6" height="10" rx="3" fill={sc} />
          <rect x="32" y="65" width="6" height="10" rx="3" fill={sc} />
          {/* Shoes */}
          <ellipse cx="25" cy="76" rx="5" ry="2.5" fill={sk} />
          <ellipse cx="35" cy="76" rx="5" ry="2.5" fill={sk} />
        </>
      ) : (
        <>
          {/* Pants */}
          <rect x="21" y="52" width="8" height="14" rx="4" fill={pa} />
          <rect x="31" y="52" width="8" height="14" rx="4" fill={pa} />
          {/* Shoes */}
          <ellipse cx="25" cy="67" rx="5.5" ry="2.8" fill={sk} />
          <ellipse cx="35" cy="67" rx="5.5" ry="2.8" fill={sk} />
        </>
      )}

      {/* ── Body / shirt ── */}
      <path
        d="M16 38 Q14 56 18 62 L42 62 Q46 56 44 38 Q37 34 30 34 Q23 34 16 38 Z"
        fill={sh}
      />

      {/* ── Belt (boys) ── */}
      {!isGirl && (
        <rect x="17" y="52" width="26" height="3" rx="1.5" fill="#333" />
      )}

      {/* ── Arms ── */}
      {/* Left arm */}
      <path d="M16 40 Q8 46 9 56" stroke={sh} strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="9" cy="57" rx="4" ry="4" fill={sc} />
      {/* Right arm */}
      <path d="M44 40 Q52 46 51 56" stroke={sh} strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="51" cy="57" rx="4" ry="4" fill={sc} />

      {/* ── Neck ── */}
      <rect x="26" y="30" width="8" height="7" rx="4" fill={sc} />

      {/* ── Head ── */}
      <ellipse cx="30" cy="22" rx="15" ry="17" fill={sc} />

      {/* ── Ears ── */}
      <ellipse cx="15" cy="22" rx="3" ry="4" fill={sc} />
      <ellipse cx="45" cy="22" rx="3" ry="4" fill={sc} />

      {/* ── Hair ── */}
      {isGirl ? (
        <>
          {/* Top hair */}
          <ellipse cx="30" cy="9" rx="15" ry="8" fill={hc} />
          {/* Side hair long */}
          <ellipse cx="14" cy="24" rx="4" ry="13" fill={hc} />
          <ellipse cx="46" cy="24" rx="4" ry="13" fill={hc} />
          {/* Hair band */}
          <ellipse cx="30" cy="7" rx="9" ry="3" fill={sh} opacity="0.7" />
        </>
      ) : (
        <>
          {/* Short hair top */}
          <ellipse cx="30" cy="8" rx="15" ry="7" fill={hc} />
          {/* Side fade */}
          <rect x="15" y="12" width="4" height="8" rx="2" fill={hc} />
          <rect x="41" y="12" width="4" height="8" rx="2" fill={hc} />
        </>
      )}

      {/* ── Eyes ── */}
      {/* Whites */}
      <ellipse cx="23" cy="21" rx="4" ry="4.5" fill="white" />
      <ellipse cx="37" cy="21" rx="4" ry="4.5" fill="white" />
      {/* Irises */}
      <circle cx="23.5" cy="22" r="2.5" fill="#3a2000" />
      <circle cx="37.5" cy="22" r="2.5" fill="#3a2000" />
      {/* Pupils */}
      <circle cx="24" cy="22" r="1.2" fill="#000" />
      <circle cx="38" cy="22" r="1.2" fill="#000" />
      {/* Eye shine */}
      <circle cx="24.8" cy="21" r="0.6" fill="white" />
      <circle cx="38.8" cy="21" r="0.6" fill="white" />
      {/* Eyelashes (girl) */}
      {isGirl && (
        <>
          <path d="M19 18 L18 16" stroke={hc} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M22 17 L21.5 15" stroke={hc} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M25 18 L25.5 16" stroke={hc} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M33 18 L32 16" stroke={hc} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M36 17 L35.5 15" stroke={hc} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M39 18 L39.5 16" stroke={hc} strokeWidth="0.8" strokeLinecap="round" />
        </>
      )}
      {/* Eyebrows */}
      <path d="M19.5 16.5 Q23 15 26.5 16.5" stroke={hc} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M33.5 16.5 Q37 15 40.5 16.5" stroke={hc} strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Nose ── */}
      <path d="M28 25 Q30 28 32 25" stroke={sc === "#fde8d8" || sc === "#f5d5b0" || sc === "#ffe0bd" || sc === "#eac086" ? "#c8a080" : "#2a1400"} strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* ── Mouth ── */}
      <path d="M24 30 Q30 35 36 30" stroke="#c0392b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Teeth */}
      <path d="M26 30.5 Q30 33 34 30.5" fill="white" opacity="0.7" />

      {/* ── Shirt details ── */}
      {/* Collar */}
      <path d="M24 35 L30 38 L36 35" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" />
      {/* Pocket (boy) */}
      {!isGirl && (
        <rect x="33" y="42" width="6" height="5" rx="1" fill="rgba(0,0,0,0.15)" />
      )}
      {/* Bow (girl) */}
      {isGirl && (
        <>
          <path d="M27 37 L30 40 L33 37 L30 38 Z" fill="rgba(255,255,255,0.5)" />
        </>
      )}
    </svg>
  );
}
