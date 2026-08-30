import { useState } from "react";
import type { Character } from "../types";
import { ALL_CHARACTERS } from "../data/characters";

interface Props {
  unlockedLevel: number;
  onSelect: (char: Character) => void;
}

function CharacterCard({
  char,
  locked,
  selected,
  onSelect,
}: {
  char: Character;
  locked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const isGirl = char.gender === "girl";

  return (
    <button
      onClick={locked ? undefined : onSelect}
      style={{
        position: "relative",
        width: 110,
        minHeight: 150,
        borderRadius: 16,
        border: selected
          ? "3px solid #fbbf24"
          : locked
          ? "2px solid rgba(255,255,255,0.1)"
          : "2px solid rgba(255,255,255,0.25)",
        background: selected
          ? "rgba(251,191,36,0.18)"
          : locked
          ? "rgba(0,0,0,0.45)"
          : "rgba(0,0,0,0.35)",
        cursor: locked ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 8px 10px",
        backdropFilter: "blur(6px)",
        opacity: locked ? 0.55 : 1,
        transition: "transform 0.15s, border-color 0.15s",
        transform: selected ? "scale(1.06)" : "scale(1)",
        flexShrink: 0,
      }}
    >
      {/* Character SVG avatar */}
      <svg width="60" height="80" viewBox="0 0 60 80">
        {/* Body / shirt */}
        <ellipse cx="30" cy="62" rx="16" ry="14" fill={char.shirtColor} />
        {/* Arms */}
        <ellipse cx="12" cy="60" rx="5" ry="10" fill={char.shirtColor} />
        <ellipse cx="48" cy="60" rx="5" ry="10" fill={char.shirtColor} />
        {/* Hands */}
        <circle cx="12" cy="70" r="4" fill={char.skinColor} />
        <circle cx="48" cy="70" r="4" fill={char.skinColor} />
        {/* Neck */}
        <rect x="25" y="36" width="10" height="8" rx="3" fill={char.skinColor} />
        {/* Head */}
        <ellipse cx="30" cy="28" rx="16" ry="18" fill={char.skinColor} />
        {/* Hair */}
        {isGirl ? (
          <>
            <ellipse cx="30" cy="14" rx="16" ry="8" fill={char.hairColor} />
            <ellipse cx="14" cy="30" rx="4" ry="14" fill={char.hairColor} />
            <ellipse cx="46" cy="30" rx="4" ry="14" fill={char.hairColor} />
          </>
        ) : (
          <ellipse cx="30" cy="14" rx="16" ry="7" fill={char.hairColor} />
        )}
        {/* Eyes */}
        <circle cx="23" cy="27" r="3" fill="#fff" />
        <circle cx="37" cy="27" r="3" fill="#fff" />
        <circle cx="24" cy="28" r="1.5" fill="#1a1a1a" />
        <circle cx="38" cy="28" r="1.5" fill="#1a1a1a" />
        {/* Smile */}
        <path d="M24 36 Q30 41 36 36" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Girl skirt */}
        {isGirl && (
          <path d="M14 70 Q20 82 30 82 Q40 82 46 70 Z" fill={char.shirtColor} opacity="0.9" />
        )}
        {/* Legs */}
        {!isGirl && (
          <>
            <rect x="20" y="72" width="8" height="10" rx="3" fill="#2d3748" />
            <rect x="32" y="72" width="8" height="10" rx="3" fill="#2d3748" />
          </>
        )}
      </svg>

      <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem", fontFamily: "Manrope, sans-serif" }}>
        {char.name}
      </div>
      <div style={{ fontSize: "0.65rem", color: char.unlockLevel === 0 ? "#86efac" : "#fbbf24", fontWeight: 600 }}>
        {locked ? `🔒 Lvl ${char.unlockLevel}` : char.special}
      </div>

      {selected && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          background: "#fbbf24", borderRadius: "50%",
          width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.65rem",
        }}>✓</div>
      )}
    </button>
  );
}

export function CharacterSelect({ unlockedLevel, onSelect }: Props) {
  const [selected, setSelected] = useState<Character>(ALL_CHARACTERS[0]!);
  const [filter, setFilter] = useState<"all" | "girl" | "boy">("all");

  const visible = ALL_CHARACTERS.filter(
    (c) => filter === "all" || c.gender === filter
  );

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(160deg,#0a1a0a 0%,#0d2e10 50%,#1a1200 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start", padding: "20px 16px 16px",
      overflowY: "auto",
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "Fraunces, serif", fontSize: "clamp(1.6rem,5vw,2.4rem)",
        fontWeight: 900, color: "#fbbf24",
        textShadow: "0 0 30px rgba(251,191,36,0.5)",
        marginBottom: 4,
      }}>
        🌿 Choose Your Racer
      </div>
      <div style={{ color: "#86efac", fontSize: "0.8rem", marginBottom: 16, letterSpacing: "0.1em" }}>
        Complete levels to unlock more characters!
      </div>

      {/* Gender filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["all", "girl", "boy"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 18px", borderRadius: 20, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "0.82rem", fontFamily: "Manrope, sans-serif",
              background: filter === f ? "#fbbf24" : "rgba(255,255,255,0.12)",
              color: filter === f ? "#1a0a00" : "#fff",
              minHeight: 36,
            }}
          >
            {f === "all" ? "All" : f === "girl" ? "👧 Girls" : "👦 Boys"}
          </button>
        ))}
      </div>

      {/* Character grid */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10,
        justifyContent: "center", maxWidth: 600, marginBottom: 20,
      }}>
        {visible.map((char) => {
          const locked = char.unlockLevel > unlockedLevel;
          return (
            <CharacterCard
              key={char.id}
              char={char}
              locked={locked}
              selected={selected.id === char.id}
              onSelect={() => setSelected(char)}
            />
          );
        })}
      </div>

      {/* Selected preview */}
      <div style={{
        background: "rgba(0,0,0,0.4)", border: "1px solid rgba(251,191,36,0.3)",
        borderRadius: 14, padding: "12px 24px", marginBottom: 20,
        textAlign: "center", backdropFilter: "blur(8px)",
      }}>
        <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>
          {selected.name} — {selected.special}
        </div>
        <div style={{ color: "#d1fae5", fontSize: "0.78rem" }}>
          {selected.gender === "girl" ? "👧" : "👦"} &nbsp;
          Car colour: <span style={{ color: selected.carColor, fontWeight: 700 }}>■</span> &nbsp;
          Skin: {selected.skin}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onSelect(selected)}
        style={{
          minHeight: 52, padding: "0 2.5rem", fontSize: "1.1rem", fontWeight: 700,
          background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00",
          border: "none", borderRadius: 14, cursor: "pointer",
          boxShadow: "0 0 30px rgba(251,191,36,0.4), 0 4px 16px rgba(0,0,0,0.5)",
          letterSpacing: "0.05em", textTransform: "uppercase",
          fontFamily: "Manrope, sans-serif",
        }}
      >
        🏁 Race with {selected.name}!
      </button>
    </div>
  );
}
