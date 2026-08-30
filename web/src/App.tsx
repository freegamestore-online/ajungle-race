import { useRef, useState } from "react";
import { GameShell, GameTopbar } from "@freegamestore/games";
import { Game } from "./components/Game";
import { Instructions } from "./components/Instructions";
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

// ── Unlock toast ──────────────────────────────────────────────────────────────
function UnlockToast({ char, onDone }: { char: Character; onDone: () => void }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.88)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      padding: 24,
    }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(1.6rem,6vw,2.4rem)", color: "#fbbf24", textAlign: "center" }}>
        🎉 New Character Unlocked!
      </div>
      {/* Mini avatar SVG */}
      <svg width="90" height="118" viewBox="0 0 60 79">
        <ellipse cx="30" cy="76" rx="13" ry="3" fill="rgba(0,0,0,0.25)" />
        {char.gender === "boy" ? (
          <>
            <rect x="22" y="52" width="7" height="13" rx="3.5" fill={char.pantsColor} />
            <rect x="31" y="52" width="7" height="13" rx="3.5" fill={char.pantsColor} />
            <ellipse cx="25" cy="66" rx="5" ry="2.5" fill={char.shoeColor} />
            <ellipse cx="35" cy="66" rx="5" ry="2.5" fill={char.shoeColor} />
          </>
        ) : (
          <>
            <path d="M18 50 Q30 62 42 50 L40 54 Q30 66 20 54 Z" fill={char.shirtColor} opacity="0.9" />
            <rect x="23" y="62" width="6" height="9" rx="3" fill={char.skinColor} />
            <rect x="31" y="62" width="6" height="9" rx="3" fill={char.skinColor} />
            <ellipse cx="26" cy="72" rx="5" ry="2.5" fill={char.shoeColor} />
            <ellipse cx="34" cy="72" rx="5" ry="2.5" fill={char.shoeColor} />
          </>
        )}
        <path d="M15 37 Q13 54 17 60 L43 60 Q47 54 45 37 Q38 33 30 33 Q22 33 15 37 Z" fill={char.shirtColor} />
        <path d="M15 40 Q7 46 8 55" stroke={char.shirtColor} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M45 40 Q53 46 52 55" stroke={char.shirtColor} strokeWidth="6" fill="none" strokeLinecap="round" />
        <ellipse cx="8" cy="56" rx="4" ry="4" fill={char.skinColor} />
        <ellipse cx="52" cy="56" rx="4" ry="4" fill={char.skinColor} />
        <rect x="26" y="29" width="8" height="7" rx="3.5" fill={char.skinColor} />
        <ellipse cx="30" cy="21" rx="14" ry="16" fill={char.skinColor} />
        {char.gender === "girl" ? (
          <>
            <ellipse cx="30" cy="8" rx="14" ry="7.5" fill={char.hairColor} />
            <ellipse cx="15" cy="23" rx="3.5" ry="12" fill={char.hairColor} />
            <ellipse cx="45" cy="23" rx="3.5" ry="12" fill={char.hairColor} />
          </>
        ) : (
          <>
            <ellipse cx="30" cy="8" rx="14" ry="6.5" fill={char.hairColor} />
            <rect x="16" y="10" width="4" height="8" rx="2" fill={char.hairColor} />
            <rect x="40" y="10" width="4" height="8" rx="2" fill={char.hairColor} />
          </>
        )}
        <ellipse cx="22" cy="20" rx="4" ry="4.5" fill="white" />
        <ellipse cx="38" cy="20" rx="4" ry="4.5" fill="white" />
        <circle cx="23" cy="21" r="2.5" fill="#3a2000" />
        <circle cx="39" cy="21" r="2.5" fill="#3a2000" />
        <path d="M23 28 Q30 33 37 28" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 800, fontFamily: "Manrope, sans-serif" }}>{char.name}</div>
      <div style={{ color: "#fbbf24", fontSize: "0.9rem", fontFamily: "Manrope, sans-serif" }}>{char.special} — {char.specialDesc}</div>
      <button
        onClick={onDone}
        style={{
          marginTop: 8, padding: "13px 36px", borderRadius: 14, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00",
          fontWeight: 800, fontSize: "1.05rem", fontFamily: "Manrope, sans-serif", minHeight: 52,
        }}
      >
        Awesome! 🏁
      </button>
    </div>
  );
}

// ── Game-over / level-complete screen ─────────────────────────────────────────
function ResultScreen({
  won, score, highScore, level, unlockedLevel,
  onNextLevel, onCharSelect, onRestart,
}: {
  won: boolean; score: number; highScore: number; level: number; unlockedLevel: number;
  onNextLevel: () => void; onCharSelect: () => void; onRestart: () => void;
}) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(160deg,#0a1a0a 0%,#0d2e10 50%,#1a1200 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 16, padding: 28,
    }}>
      <div style={{
        fontFamily: "Fraunces, serif",
        fontSize: "clamp(1.8rem,6vw,2.8rem)",
        fontWeight: 900,
        color: won ? "#fbbf24" : "#f87171",
        textAlign: "center",
        textShadow: `0 0 32px ${won ? "rgba(251,191,36,0.5)" : "rgba(248,113,113,0.5)"}`,
      }}>
        {won ? "🏛️ You Reached the Statue!" : "💀 Wiped Out!"}
      </div>

      <div style={{ color: "#d1fae5", fontSize: "1.15rem", fontWeight: 700, fontFamily: "Manrope, sans-serif" }}>
        Score: <span style={{ color: "#fbbf24" }}>{score}</span>
      </div>

      {highScore > 0 && (
        <div style={{ color: "#86efac", fontSize: "0.85rem", fontFamily: "Manrope, sans-serif" }}>
          🏆 Best ever: {highScore}
        </div>
      )}

      {won && (
        <div style={{ color: "#86efac", fontSize: "0.85rem", textAlign: "center", fontFamily: "Manrope, sans-serif" }}>
          Level {level} complete!{unlockedLevel >= level ? " New character unlocked! 🎉" : ""}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
        {won && (
          <button onClick={onNextLevel} style={btnStyle("#fbbf24", "#f59e0b", "#1a0a00")}>
            ▶ Next Level
          </button>
        )}
        <button onClick={onRestart} style={btnStyle("transparent", "transparent", "#fff", "rgba(255,255,255,0.25)")}>
          🔄 Try Again
        </button>
        <button onClick={onCharSelect} style={btnStyle("transparent", "transparent", "#fff", "rgba(255,255,255,0.25)")}>
          👤 Characters
        </button>
      </div>
    </div>
  );
}

function btnStyle(c1: string, c2: string, color: string, border = "none"): React.CSSProperties {
  return {
    padding: "13px 26px", borderRadius: 13,
    border: border === "none" ? "none" : `2px solid ${border}`,
    cursor: "pointer",
    background: c1 === "transparent" ? "rgba(0,0,0,0.35)" : `linear-gradient(135deg,${c1},${c2})`,
    color, fontWeight: 700, fontSize: "0.98rem",
    fontFamily: "Manrope, sans-serif", minHeight: 50,
  };
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]           = useState<GamePhase>("instructions");
  const [character, setCharacter]   = useState<Character>(ALL_CHARACTERS[0]!);
  const [score, setScore]           = useState(0);
  const [health, setHealth]         = useState(100);
  const [level, setLevel]           = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(getUnlockedLevel);
  const [newUnlock, setNewUnlock]   = useState<Character | null>(null);
  const [round, setRound]           = useState(0);
  const [won, setWon]               = useState(false);
  const [highScore, setHighScore]   = useHighScore("ajungle-race-hs");
  const scoreRef = useRef(0);

  const handleScore = (s: number) => { scoreRef.current = s; setScore(s); };

  const handleLevelComplete = (s: number) => {
    setHighScore(s);
    setWon(true);
    const nextLevel = level + 1;
    const justUnlocked = ALL_CHARACTERS.find(c => c.unlockLevel === nextLevel);
    if (justUnlocked && nextLevel > unlockedLevel) {
      setUnlockedLevel(nextLevel);
      saveUnlockedLevel(nextLevel);
      setNewUnlock(justUnlocked);
    }
    setLevel(nextLevel);
    setPhase("over");
  };

  const handleGameOver = (s: number) => {
    setHighScore(s);
    setWon(false);
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

  const goCharSelect = () => { setNewUnlock(null); setPhase("charselect"); };

  const goNextLevel = () => {
    scoreRef.current = 0;
    setScore(0);
    setHealth(100);
    setRound(r => r + 1);
    setPhase("playing");
  };

  const goRestart = () => {
    setLevel(0);
    scoreRef.current = 0;
    setScore(0);
    setHealth(100);
    setRound(r => r + 1);
    setPhase("playing");
  };

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
      <div className="relative w-full h-full">

        {phase === "instructions" && (
          <Instructions onDone={() => setPhase("charselect")} />
        )}

        {phase === "charselect" && (
          <CharacterSelect
            unlockedLevel={unlockedLevel}
            onSelect={startGame}
          />
        )}

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

        {/* Unlock toast — shown above result screen */}
        {newUnlock && (
          <UnlockToast char={newUnlock} onDone={() => setNewUnlock(null)} />
        )}

        {phase === "over" && !newUnlock && (
          <ResultScreen
            won={won}
            score={score}
            highScore={highScore}
            level={level}
            unlockedLevel={unlockedLevel}
            onNextLevel={goNextLevel}
            onCharSelect={goCharSelect}
            onRestart={goRestart}
          />
        )}
      </div>
    </GameShell>
  );
}
