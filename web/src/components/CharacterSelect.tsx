import { useState } from "react";
import type { Character } from "../types";
import { ALL_CHARACTERS } from "../data/characters";

function Avatar({ char, size = 80 }: { char: Character; size?: number }) {
  const s = size / 80;
  const isGirl = char.gender === "girl";
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 80 104" style={{ display: "block" }}>
      {/* Shadow */}
      <ellipse cx="40" cy="101" rx="18" ry="4" fill="rgba(0,0,0,0.25)" />
      {/* Shoes */}
      <ellipse cx="30" cy="96" rx="9" ry="5" fill={char.shoeColor} />
      <ellipse cx="50" cy="96" rx="9" ry="5" fill={char.shoeColor} />
      {/* Legs */}
      <rect x="25" y="72" width="12" height="26" rx="5" fill={char.pantsColor} />
      <rect x="43" y="72" width="12" height="26" rx="5" fill={char.pantsColor} />
      {/* Skirt for girls */}
      {isGirl && <path d="M20 68 Q40 82 60 68 L58 72 Q40 86 22 72 Z" fill={char.shirtColor} opacity="0.9" />}
      {/* Body / shirt */}
      <rect x="22" y="44" width="36" height="32" rx="8" fill={char.shirtColor} />
      {/* Collar */}
      <path d="M34 44 Q40 50 46 44" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" />
      {/* Arms */}
      <rect x="10" y="46" width="13" height="22" rx="6" fill={char.shirtColor} />
      <rect x="57" y="46" width="13" height="22" rx="6" fill={char.shirtColor} />
      {/* Hands */}
      <ellipse cx="16" cy="69" rx="6" ry="5" fill={char.skinColor} />
      <ellipse cx="64" cy="69" rx="6" ry="5" fill={char.skinColor} />
      {/* Neck */}
      <rect x="34" y="35" width="12" height="12" rx="4" fill={char.skinColor} />
      {/* Head */}
      <ellipse cx="40" cy="24" rx="18" ry="20" fill={char.skinColor} />
      {/* Ears */}
      <ellipse cx="22" cy="24" rx="4" ry="5" fill={char.skinColor} />
      <ellipse cx="58" cy="24" rx="4" ry="5" fill={char.skinColor} />
      {/* Hair */}
      {isGirl ? (
        <>
          <ellipse cx="40" cy="9" rx="18" ry="9" fill={char.hairColor} />
          <ellipse cx="22" cy="20" rx="5" ry="14" fill={char.hairColor} />
          <ellipse cx="58" cy="20" rx="5" ry="14" fill={char.hairColor} />
          <ellipse cx="40" cy="4" rx="14" ry="6" fill={char.hairColor} />
        </>
      ) : (
        <>
          <ellipse cx="40" cy="8" rx="18" ry="8" fill={char.hairColor} />
          <rect x="22" y="8" width="36" height="8" rx="4" fill={char.hairColor} />
        </>
      )}
      {/* Eyes whites */}
      <ellipse cx="32" cy="22" rx="5" ry="5.5" fill="#fff" />
      <ellipse cx="48" cy="22" rx="5" ry="5.5" fill="#fff" />
      {/* Irises */}
      <ellipse cx="33" cy="23" rx="3" ry="3.5" fill="#3d2200" />
      <ellipse cx="49" cy="23" rx="3" ry="3.5" fill="#3d2200" />
      {/* Pupils */}
      <circle cx="33.5" cy="23" r="1.5" fill="#111" />
      <circle cx="49.5" cy="23" r="1.5" fill="#111" />
      {/* Eye shine */}
      <circle cx="34.5" cy="21.5" r="1" fill="#fff" opacity="0.8" />
      <circle cx="50.5" cy="21.5" r="1" fill="#fff" opacity="0.8" />
      {/* Eyebrows */}
      <path d="M28 16 Q32 13 36 15" stroke={char.hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M44 15 Q48 13 52 16" stroke={char.hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <ellipse cx="40" cy="29" rx="2.5" ry="1.5" fill={char.skinColor} opacity="0.6" />
      <circle cx="38.5" cy="30" r="1" fill="rgba(0,0,0,0.15)" />
      <circle cx="41.5" cy="30" r="1" fill="rgba(0,0,0,0.15)" />
      {/* Smile */}
      <path d="M33 35 Q40 41 47 35" stroke="rgba(0,0,0,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <ellipse cx="27" cy="32" rx="5" ry="3" fill="#ffaaaa" opacity="0.35" />
      <ellipse cx="53" cy="32" rx="5" ry="3" fill="#ffaaaa" opacity="0.35" />
      {/* Girl accessory — bow */}
      {isGirl && (
        <g transform={`translate(52,5) scale(${s})`}>
          <path d="M0 4 L-6 0 L-6 8 Z" fill="#ff69b4" opacity="0.9" />
          <path d="M0 4 L6 0 L6 8 Z" fill="#ff69b4" opacity="0.9" />
          <circle cx="0" cy="4" r="2.5" fill="#ff1493" />
        </g>
      )}
    </svg>
  );
}

function CharCard({
  char, locked, selected, onSelect,
}: {
  char: Character; locked: boolean; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={locked ? undefined : onSelect}
      style={{
        position: "relative", width: 120, minHeight: 180,
        borderRadius: 18,
        border: selected ? "3px solid #fbbf24" : locked ? "2px solid rgba(255,255,255,0.08)" : "2px solid rgba(255,255,255,0.2)",
        background: selected ? "rgba(251,191,36,0.15)" : locked ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.38)",
        cursor: locked ? "not-allowed" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, padding: "10px 6px 10px",
        backdropFilter: "blur(8px)",
        opacity: locked ? 0.5 : 1,
        transform: selected ? "scale(1.07)" : "scale(1)",
        transition: "transform 0.15s, border-color 0.15s",
        flexShrink: 0,
      }}
    >
      <Avatar char={char} size={64} />
      <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.85rem", fontFamily: "Manrope, sans-serif", marginTop: 2 }}>
        {char.name}
      </div>
      <div style={{
        fontSize: "0.65rem", fontWeight: 700,
        color: locked ? "#888" : "#fbbf24",
        textAlign: "center", lineHeight: 1.3,
        fontFamily: "Manrope, sans-serif",
      }}>
        {locked ? `🔒 Beat Level ${char.unlockLevel}` : char.special}
      </div>
      {selected && (
        <div style={{
          position: "absolute", top: 7, right: 7,
          background: "#fbbf24", borderRadius: "50%",
          width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", fontWeight: 900, color: "#1a0a00",
        }}>✓</div>
      )}
    </button>
  );
}

export function CharacterSelect({
  unlockedLevel,
  onSelect,
}: {
  unlockedLevel: number;
  onSelect: (char: Character) => void;
}) {
  const [selected, setSelected] = useState<Character>(ALL_CHARACTERS[0]!);
  const [filter, setFilter] = useState<"all" | "girl" | "boy">("all");

  const visible = ALL_CHARACTERS.filter(c => filter === "all" || c.gender === filter);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(160deg,#071a07 0%,#0d2e10 55%,#1a1200 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "18px 14px 14px", overflowY: "auto",
    }}>
      <div style={{
        fontFamily: "Fraunces, serif",
        fontSize: "clamp(1.5rem,5vw,2.2rem)",
        fontWeight: 900, color: "#fbbf24",
        textShadow: "0 0 28px rgba(251,191,36,0.5)",
        marginBottom: 4,
      }}>
        🌿 Choose Your Runner
      </div>
      <div style={{ color: "#86efac", fontSize: "0.78rem", marginBottom: 14, fontFamily: "Manrope, sans-serif" }}>
        Complete levels to unlock more characters!
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "girl", "boy"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 18px", borderRadius: 20, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: "0.82rem", fontFamily: "Manrope, sans-serif",
            background: filter === f ? "#fbbf24" : "rgba(255,255,255,0.12)",
            color: filter === f ? "#1a0a00" : "#fff", minHeight: 36,
          }}>
            {f === "all" ? "All" : f === "girl" ? "👧 Girls" : "👦 Boys"}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10,
        justifyContent: "center", maxWidth: 560, marginBottom: 18,
      }}>
        {visible.map(char => (
          <CharCard
            key={char.id}
            char={char}
            locked={char.unlockLevel > unlockedLevel}
            selected={selected.id === char.id}
            onSelect={() => setSelected(char)}
          />
        ))}
      </div>

      {/* Selected info */}
      <div style={{
        background: "rgba(0,0,0,0.45)", border: "1px solid rgba(251,191,36,0.3)",
        borderRadius: 14, padding: "12px 22px", marginBottom: 18,
        textAlign: "center", backdropFilter: "blur(8px)", maxWidth: 340, width: "100%",
      }}>
        <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: "0.92rem", marginBottom: 4, fontFamily: "Manrope, sans-serif" }}>
          {selected.name} — {selected.special}
        </div>
        <div style={{ color: "#d1fae5", fontSize: "0.78rem", fontFamily: "Manrope, sans-serif" }}>
          {selected.specialDesc}
        </div>
      </div>

      <button
        onClick={() => onSelect(selected)}
        style={{
          minHeight: 52, padding: "0 2.5rem", fontSize: "1.1rem", fontWeight: 800,
          background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00",
          border: "none", borderRadius: 14, cursor: "pointer",
          boxShadow: "0 0 28px rgba(251,191,36,0.4), 0 4px 14px rgba(0,0,0,0.5)",
          letterSpacing: "0.04em", fontFamily: "Manrope, sans-serif",
        }}
      >
        🏃 Run with {selected.name}!
      </button>
    </div>
  );
}
