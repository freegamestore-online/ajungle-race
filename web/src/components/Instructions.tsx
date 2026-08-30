import { useState, useEffect } from "react";

const STEPS = [
  {
    emoji: "🏃",
    title: "Run Through the Jungle!",
    body: "You're on foot — no cars! Use arrow keys or WASD to move your character forward, backward, and steer left/right through the jungle path.",
    color: "#4ade80",
  },
  {
    emoji: "🪨",
    title: "Dodge Obstacles",
    body: "Rocks, mud, vines, and ruins block your path. Run into them and you lose health. Steer around them to stay safe!",
    color: "#f87171",
  },
  {
    emoji: "✨",
    title: "Grab Power-Ups",
    body: "Glowing gems scattered on the path give you: 💨 Speed Boost · 🛡️ Shield · 🔫 Blowgun · 💚 Health Repair. Run over them to collect!",
    color: "#fbbf24",
  },
  {
    emoji: "👹",
    title: "Avoid Enemies",
    body: "Jungle guardians patrol the path. They'll drain your health on contact. Collect a 🔫 Blowgun then press SPACE to shoot them!",
    color: "#a78bfa",
  },
  {
    emoji: "🏛️",
    title: "Reach the Golden Statue!",
    body: "Run all the way to the end of the jungle path to find the shining Golden Statue. Reach it to win the level and unlock a new character!",
    color: "#ffd700",
  },
];

interface Props {
  onDone: () => void;
}

export function Instructions({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [animIn, setAnimIn] = useState(true);

  const goTo = (next: number) => {
    setAnimIn(false);
    setTimeout(() => { setStep(next); setAnimIn(true); }, 180);
  };

  // Auto-advance on touch devices after 3s if user doesn't tap
  useEffect(() => {
    const t = setTimeout(() => {
      if (step < STEPS.length - 1) goTo(step + 1);
    }, 4500);
    return () => clearTimeout(t);
  }, [step]);

  const cur = STEPS[step]!;

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(160deg,#071a07 0%,#0d2e10 60%,#1a1200 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px", gap: 0,
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "Fraunces, serif",
        fontSize: "clamp(1.4rem,5vw,2rem)",
        fontWeight: 900, color: "#fbbf24",
        textShadow: "0 0 24px rgba(251,191,36,0.5)",
        marginBottom: 24, letterSpacing: "-0.02em",
      }}>
        🌿 How to Play
      </div>

      {/* Step dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === step ? 28 : 10, height: 10,
              borderRadius: 6, border: "none", cursor: "pointer",
              background: i === step ? cur.color : "rgba(255,255,255,0.25)",
              transition: "all 0.3s", padding: 0,
            }}
          />
        ))}
      </div>

      {/* Step card */}
      <div style={{
        background: "rgba(0,0,0,0.5)",
        border: `2px solid ${cur.color}44`,
        borderRadius: 20,
        padding: "28px 28px 24px",
        maxWidth: 420, width: "100%",
        textAlign: "center",
        backdropFilter: "blur(10px)",
        boxShadow: `0 0 40px ${cur.color}22`,
        opacity: animIn ? 1 : 0,
        transform: animIn ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.18s, transform 0.18s",
      }}>
        <div style={{ fontSize: "clamp(3rem,10vw,4.5rem)", marginBottom: 12, lineHeight: 1 }}>
          {cur.emoji}
        </div>
        <div style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(1.1rem,4vw,1.5rem)",
          fontWeight: 800, color: cur.color,
          marginBottom: 12,
        }}>
          {cur.title}
        </div>
        <div style={{
          color: "#d1fae5", fontSize: "clamp(0.85rem,3vw,1rem)",
          lineHeight: 1.65, fontFamily: "Manrope, sans-serif",
        }}>
          {cur.body}
        </div>
      </div>

      {/* Controls hint */}
      <div style={{
        marginTop: 20,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12, padding: "10px 20px",
        display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
        maxWidth: 420,
      }}>
        {[
          { k: "↑ ↓ ← →", label: "Move" },
          { k: "W A S D", label: "Also Move" },
          { k: "SPACE", label: "Shoot" },
        ].map(c => (
          <div key={c.k} style={{ textAlign: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: "3px 8px", color: "#fff", fontSize: "0.72rem", fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 3 }}>
              {c.k}
            </div>
            <div style={{ color: "#86efac", fontSize: "0.65rem" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {step > 0 && (
          <button
            onClick={() => goTo(step - 1)}
            style={{
              minHeight: 48, padding: "0 24px", fontSize: "0.95rem", fontWeight: 700,
              background: "rgba(255,255,255,0.12)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, cursor: "pointer",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => goTo(step + 1)}
            style={{
              minHeight: 48, padding: "0 32px", fontSize: "1rem", fontWeight: 700,
              background: `linear-gradient(135deg,${cur.color},${cur.color}bb)`,
              color: "#0a1a0a", border: "none", borderRadius: 12, cursor: "pointer",
              fontFamily: "Manrope, sans-serif",
              boxShadow: `0 4px 20px ${cur.color}44`,
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onDone}
            style={{
              minHeight: 52, padding: "0 36px", fontSize: "1.1rem", fontWeight: 800,
              background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
              color: "#1a0a00", border: "none", borderRadius: 14, cursor: "pointer",
              fontFamily: "Manrope, sans-serif",
              boxShadow: "0 4px 24px rgba(251,191,36,0.5)",
              letterSpacing: "0.03em",
            }}
          >
            🏃 Pick My Character!
          </button>
        )}
      </div>

      {/* Skip */}
      <button
        onClick={onDone}
        style={{
          marginTop: 14, background: "none", border: "none",
          color: "rgba(255,255,255,0.35)", fontSize: "0.78rem",
          cursor: "pointer", fontFamily: "Manrope, sans-serif",
          minHeight: 36,
        }}
      >
        Skip tutorial →
      </button>
    </div>
  );
}
