import { useRef, useState } from "react";
import { GameShell, GameTopbar, GameOverScreen } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useHighScore } from "./hooks/useHighScore";
import { ROUND_SECONDS } from "./lib/logic";
import type { GamePhase } from "./types";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useHighScore("ajungle-race-highscore");

  const scoreRef = useRef(0);
  const handleScore = (s: number) => { scoreRef.current = s; setScore(s); };

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
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
            { label: "Time", value: `${timeLeft}s` },
            { label: "Best", value: highScore },
          ]}
        />
      }
    >
      <div className="relative w-full h-full min-h-[400px]">
        {phase !== "menu" && (
          <Game key={round} onScore={handleScore} onTime={setTimeLeft} onGameOver={end} />
        )}

        {phase === "menu" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 px-6"
            style={{ background: "linear-gradient(160deg, #0a1a0a 0%, #1a3a0a 50%, #0a1a0a 100%)" }}
          >
            {/* Animated glow orb */}
            <div style={{
              position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
              width: 220, height: 220, borderRadius: "50%",
              background: "radial-gradient(circle, #FFD70022 0%, transparent 70%)",
              animation: "pulse 3s ease-in-out infinite",
            }} />

            <div style={{ position: "relative" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.25rem" }}>🏁</div>
              <h1
                className="font-bold"
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "clamp(2rem, 6vw, 3.5rem)",
                  color: "#FFD700",
                  textShadow: "0 0 30px #FFD70066, 0 2px 8px #00000088",
                  letterSpacing: "0.02em",
                  lineHeight: 1.1,
                }}
              >
                Jungle Race
              </h1>
              <p style={{ color: "#88cc88", fontSize: "1rem", marginTop: "0.25rem", fontStyle: "italic" }}>
                Off-road chaos in the ancient jungle
              </p>
            </div>

            {/* Controls */}
            <div
              className="flex flex-col gap-2 text-sm"
              style={{
                background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,215,0,0.2)", borderRadius: 14,
                padding: "1rem 1.5rem", maxWidth: 340, color: "#aaddaa",
              }}
            >
              <div className="flex justify-between gap-4">
                <span>🚗 Drive</span><span style={{ color: "#FFD700" }}>WASD / Arrow Keys</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>🔫 Shoot</span><span style={{ color: "#FFD700" }}>SPACE / F</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>⚡ Boost pickup</span><span style={{ color: "#ff9800" }}>Orange gem</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>🛡 Shield pickup</span><span style={{ color: "#00bfff" }}>Blue gem</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>🔫 Gun pickup</span><span style={{ color: "#e74c3c" }}>Red gem</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>❤️ Repair pickup</span><span style={{ color: "#2ecc71" }}>Green gem</span>
              </div>
              <hr style={{ borderColor: "rgba(255,215,0,0.15)", margin: "0.25rem 0" }} />
              <div style={{ color: "#88cc88", fontSize: "0.82rem", textAlign: "center" }}>
                Destroy enemy cars (+50 pts) · Survive 2 minutes
              </div>
            </div>

            <button
              onClick={start}
              style={{
                minHeight: 52, padding: "0 2.5rem",
                background: "linear-gradient(135deg, #FFD700, #ff9800)",
                color: "#1a0a00", border: "none", cursor: "pointer",
                fontSize: "1.15rem", fontWeight: 700, borderRadius: 14,
                boxShadow: "0 0 24px #FFD70055",
                fontFamily: "Fraunces, serif",
                letterSpacing: "0.05em",
              }}
            >
              🏁 Race!
            </button>

            {highScore > 0 && (
              <p style={{ color: "#FFD700", fontSize: "0.9rem", opacity: 0.8 }}>
                🏆 Best: {highScore} pts
              </p>
            )}

            <style>{`@keyframes pulse { 0%,100%{opacity:0.5;transform:translateX(-50%) scale(1)} 50%{opacity:1;transform:translateX(-50%) scale(1.15)} }`}</style>
          </div>
        )}

        {phase === "over" && (
          <GameOverScreen score={score} highScore={highScore} onPlayAgain={start} />
        )}
      </div>
    </GameShell>
  );
}
