import { useRef, useState } from "react";
import { GameShell, GameTopbar, GameOverScreen } from "@freegamestore/games";
import { Game } from "./components/Game";
import { CharacterSelect } from "./components/CharacterSelect";
import { ALL_CHARACTERS } from "./data/characters";
import { useHighScore } from "./hooks/useHighScore";
import type { GamePhase, Character } from "./types";

function getUnlockedLevel(): number {
  try { return parseInt(localStorage.getItem("ajungle-unlocked") ?? "0", 10) || 0; }
  catch { return 0; }
}
function saveUnlockedLevel(lvl: number) {
  try { localStorage.setItem("ajungle-unlocked", String(lvl)); } catch { /* ignore */ }
}

function UnlockToast({ char, onDone }: { char: Character; onDone: () => void }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.82)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
    }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: "2rem", color: "#fbbf24", textAlign: "center" }}>
        🎉 New Character Unlocked!
      </div>
      {/* Avatar */}
      <svg width="100" height="130" viewBox="0 0 60 80">
        <ellipse cx="30" cy="62" rx="16" ry="14" fill={char.shirtColor} />
        <ellipse cx="12" cy="60" rx="5" ry="10" fill={char.shirtColor} />
        <ellipse cx="48" cy="60" rx="5" ry="10" fill={char.shirtColor} />
        <circle cx="12" cy="70" r="4" fill={char.skinColor} />
        <circle cx="48" cy="70" r="4" fill={char.skinColor} />
        <rect x="25" y="36" width="10" height="8" rx="3" fill={char.skinColor} />
        <ellipse cx="30" cy="28" rx="16" ry="18" fill={char.skinColor} />
        {char.gender === "girl" ? (
          <>
            <ellipse cx="30" cy="14" rx="16" ry="8" fill={char.hairColor} />
            <ellipse cx="14" cy="30" rx="4" ry="14" fill={char.hairColor} />
            <ellipse cx="46" cy="30" rx="4" ry="14" fill={char.hairColor} />
          </>
        ) : (
          <ellipse cx="30" cy="14" rx="16" ry="7" fill={char.hairColor} />
        )}
        <circle cx="23" cy="27" r="3" fill="#fff" />
        <circle cx="37" cy="27" r="3" fill="#fff" />
        <circle cx="24" cy="28" r="1.5" fill="#1a1a1a" />
        <circle cx="38" cy="28" r="1.5" fill="#1a1a1a" />
        <path d="M24 36 Q30 41 36 36" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {char.gender === "girl" && (
          <path d="M14 70 Q20 82 30 82 Q40 82 46 70 Z" fill={char.shirtColor} opacity="0.9" />
        )}
        {char.gender === "boy" && (
          <>
            <rect x="20" y="72" width="8" height="10" rx="3" fill="#2d3748" />
            <rect x="32" y="72" width="8" height="10" rx="3" fill="#2d3748" />
          </>
        )}
      </svg>
      <div style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700 }}>{char.name}</div>
      <div style={{ color: "#fbbf24", fontSize: "0.9rem" }}>{char.special}</div>
      <button
        onClick={onDone}
        style={{
          padding: "12px 32px", borderRadius: 12, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00",
          fontWeight: 700, fontSize: "1rem", fontFamily: "Manrope, sans-serif",
        }}
      >
        Awesome! 🏁
      </button>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("charselect");
  const [character, setCharacter] = useState<Character>(ALL_CHARACTERS[0]!);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [level, setLevel] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(getUnlockedLevel);
  const [newUnlock, setNewUnlock] = useState<Character | null>(null);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useHighScore("ajungle-race-hs");
  const scoreRef = useRef(0);

  const handleScore = (s: number) => { scoreRef.current = s; setScore(s); };

  const handleLevelComplete = (s: number) => {
    setHighScore(s);
    const nextLevel = level + 1;
    // Check if completing this level unlocks new characters
    const justUnlocked = ALL_CHARACTERS.find(c => c.unlockLevel === nextLevel);
    if (justUnlocked && nextLevel > unlockedLevel) {
      const newLvl = nextLevel;
      setUnlockedLevel(newLvl);
      saveUnlockedLevel(newLvl);
      setNewUnlock(justUnlocked);
    }
    setLevel(nextLevel);
    setPhase("over");
  };

  const handleGameOver = (s: number) => {
    setHighScore(s);
    setPhase("over");
  };

  const startGame = (char: Character) => {
    setCharacter(char);
    scoreRef.current = 0;
    setScore(0);
    setHealth(100);
    setRound(r => r + 1);
    setPhase("playing");
  };

  const goCharSelect = () => {
    setNewUnlock(null);
    setPhase("charselect");
  };

  const won = phase === "over" && score > 0 && level > 0;

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Jungle Race"
          stats={[
            { label: "Score", value: score, accent: true },
            { label: "HP",    value: `${health}%` },
            { label: "Lvl",   value: level + 1 },
            { label: "Best",  value: highScore },
          ]}
        />
      }
    >
      <div className="relative w-full h-full min-h-[400px]">
        {/* Character select */}
        {phase === "charselect" && (
          <CharacterSelect
            unlockedLevel={unlockedLevel}
            onSelect={startGame}
          />
        )}

        {/* Game */}
        {phase === "playing" && (
          <Game
            key={round}
            character={character}
            level={level}
            onScore={handleScore}
            onHealth={setHealth}
            onLevelComplete={handleLevelComplete}
            onGameOver={handleGameOver}
          />
        )}

        {/* Unlock toast (shown on top of over screen) */}
        {newUnlock && (
          <UnlockToast char={newUnlock} onDone={() => setNewUnlock(null)} />
        )}

        {/* Game over / level complete */}
        {phase === "over" && !newUnlock && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg,#0a1a0a 0%,#0d2e10 50%,#1a1200 100%)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 18, padding: 24,
          }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(1.8rem,6vw,2.8rem)", fontWeight: 900, color: won ? "#fbbf24" : "#f87171", textAlign: "center", textShadow: "0 0 30px rgba(251,191,36,0.4)" }}>
              {won ? "🏛️ Statue Reached!" : "💀 Wiped Out!"}
            </div>
            <div style={{ color: "#d1fae5", fontSize: "1.1rem", fontWeight: 700 }}>
              Score: <span style={{ color: "#fbbf24" }}>{score}</span>
            </div>
            {highScore > 0 && (
              <div style={{ color: "#86efac", fontSize: "0.85rem" }}>
                🏆 Best: {highScore}
              </div>
            )}
            {won && (
              <div style={{ color: "#86efac", fontSize: "0.85rem", textAlign: "center" }}>
                Level {level} complete! {unlockedLevel >= level ? "New character unlocked! 🎉" : ""}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {won && (
                <button
                  onClick={() => { setRound(r => r + 1); setScore(0); setHealth(100); setPhase("playing"); }}
                  style={{
                    padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00",
                    fontWeight: 700, fontSize: "1rem", fontFamily: "Manrope, sans-serif", minHeight: 48,
                  }}
                >
                  ▶ Next Level
                </button>
              )}
              <button
                onClick={goCharSelect}
                style={{
                  padding: "12px 28px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer",
                  background: "rgba(0,0,0,0.4)", color: "#fff",
                  fontWeight: 700, fontSize: "1rem", fontFamily: "Manrope, sans-serif", minHeight: 48,
                }}
              >
                👤 Change Character
              </button>
              <button
                onClick={() => { setLevel(0); setRound(r => r + 1); setScore(0); setHealth(100); setPhase("playing"); }}
                style={{
                  padding: "12px 28px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer",
                  background: "rgba(0,0,0,0.4)", color: "#fff",
                  fontWeight: 700, fontSize: "1rem", fontFamily: "Manrope, sans-serif", minHeight: 48,
                }}
              >
                🔄 Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
