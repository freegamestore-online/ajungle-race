import { useRef, useState } from "react";
import { GameShell, GameTopbar, GameOverScreen } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useHighScore } from "./hooks/useHighScore";
import type { GamePhase } from "./types";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [health, setHealth] = useState(100);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useHighScore("ajungle-race-highscore");

  const scoreRef = useRef(0);
  const handleScore = (s: number) => { scoreRef.current = s; setScore(s); };

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(120);
    setHealth(100);
    setRound((r) => r + 1);
    setPhase("playing");
  };

  const end = () => {
    setHighScore(scoreRef.current);
    setPhase("over");
  };

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Jungle Race"
          stats={[
            { label: "Score", value: score, accent: true },
            { label: "HP", value: `${health}%` },
            { label: "Time", value: `${timeLeft}s` },
            { label: "Best", value: highScore },
          ]}
        />
      }
    >
      <div className="relative w-full h-full min-h-[400px]">
        {phase !== "menu" && (
          <Game
            key={round}
            onScore={handleScore}
            onTime={setTimeLeft}
            onHealth={setHealth}
            onGameOver={end}
          />
        )}

        {phase === "menu" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 px-6"
            style={{
              background: "linear-gradient(160deg,#0a1a0a 0%,#0d2e10 50%,#1a1200 100%)",
            }}
          >
            {/* Decorative jungle glow */}
            <div style={{
              position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute", top: "20%", left: "10%", width: 300, height: 300,
                borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.12) 0%,transparent 70%)",
              }} />
              <div style={{
                position: "absolute", top: "40%", right: "5%", width: 200, height: 200,
                borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.10) 0%,transparent 70%)",
              }} />
            </div>

            <div style={{ position: "relative" }}>
              <div style={{
                fontSize: "3.5rem", fontFamily: "Fraunces, serif", fontWeight: 900,
                color: "#fbbf24", textShadow: "0 0 40px rgba(251,191,36,0.6), 0 4px 20px rgba(0,0,0,0.8)",
                lineHeight: 1.1, letterSpacing: "-0.02em",
              }}>
                🌿 JUNGLE RACE
              </div>
              <div style={{
                fontSize: "0.9rem", color: "#86efac", marginTop: 6, letterSpacing: "0.15em",
                fontWeight: 600, textTransform: "uppercase",
              }}>
                Off-Road Combat Racing
              </div>
            </div>

            <div style={{
              background: "rgba(0,0,0,0.5)", border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: 16, padding: "20px 28px", maxWidth: 380, backdropFilter: "blur(8px)",
            }}>
              <p style={{ color: "#d1fae5", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>
                🚗 <b>WASD / Arrows</b> — Drive &amp; steer<br />
                🔫 <b>Space</b> — Fire weapon<br />
                ⚡ Collect power-ups: Boost, Shield, Gun, Repair<br />
                💀 Destroy enemy racers for bonus points<br />
                🏛️ Find the golden statue deep in the jungle!
              </p>
            </div>

            <button
              onClick={start}
              style={{
                minHeight: 52, padding: "0 2.5rem", fontSize: "1.1rem", fontWeight: 700,
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00",
                border: "none", borderRadius: 14, cursor: "pointer",
                boxShadow: "0 0 30px rgba(251,191,36,0.4), 0 4px 16px rgba(0,0,0,0.5)",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}
            >
              🏁 START RACE
            </button>

            {highScore > 0 && (
              <p style={{ color: "#fbbf24", fontSize: "0.85rem", opacity: 0.8 }}>
                🏆 Best: {highScore} pts
              </p>
            )}
          </div>
        )}

        {phase === "over" && (
          <GameOverScreen score={score} highScore={highScore} onPlayAgain={start} />
        )}
      </div>
    </GameShell>
  );
}
