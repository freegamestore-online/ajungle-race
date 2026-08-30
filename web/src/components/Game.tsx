import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Character, PowerUp, Obstacle, Bullet, Enemy } from "../types";
import {
  TRACK_HALF_W,
  PLAYER_MAX_SPEED,
  PLAYER_ACCEL,
  PLAYER_BRAKE,
  PLAYER_TURN,
  BULLET_SPEED,
  BULLET_LIFE,
  ENEMY_BASE_SPEED,
  clamp,
  dist2,
  lerpAngle,
  scoreForKill,
  scoreForPickup,
} from "../lib/logic";

export interface GameProps {
  character: Character;
  level: number;
  onScore: (s: number) => void;
  onHealth: (hp: number) => void;
  onLevelComplete: (score: number) => void;
  onGameOver: (score: number) => void;
}

// ── seeded RNG ────────────────────────────────────────────────────────────────
function mkRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Zone definitions ──────────────────────────────────────────────────────────
const ZONES = [
  { z: 65,  label: "🌊 River Crossing", color: "#60a5fa" },
  { z: 35,  label: "🪨 Boulder Field",  color: "#a78bfa" },
  { z: 0,   label: "🌿 Vine Maze",      color: "#4ade80" },
  { z: -35, label: "💀 Enemy Camp",     color: "#f87171" },
  { z: -65, label: "🏛️ Temple Gates",   color: "#fbbf24" },
];

// ── Ground + track ────────────────────────────────────────────────────────────
function Ground() {
  const strips = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => 90 - i * 5), []);
  return (
    <group>
      {/* Jungle floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#1e3a10" roughness={1} />
      </mesh>
      {/* Dirt track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[TRACK_HALF_W * 2, 220]} />
        <meshStandardMaterial color="#6b4c28" roughness={1} />
      </mesh>
      {/* Edge lines */}
      {([-TRACK_HALF_W + 0.4, TRACK_HALF_W - 0.4] as number[]).map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[x, 0.02, 0]}>
          <planeGeometry args={[0.4, 220]} />
          <meshStandardMaterial color="#e8c060" roughness={0.8} />
        </mesh>
      ))}
      {/* Centre dashes */}
      {strips.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.02, z]}>
          <planeGeometry args={[0.25, 2.5]} />
          <meshStandardMaterial color="#e8e8a0" roughness={0.8} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// ── Jungle tree sides ─────────────────────────────────────────────────────────
function JungleSides() {
  const trees = useMemo(() => {
    const rand = mkRand(77);
    return Array.from({ length: 130 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return {
        x: side * (TRACK_HALF_W + 2 + rand() * 30),
        z: -105 + rand() * 210,
        s: 0.55 + rand() * 1.5,
        rot: rand() * Math.PI * 2,
      };
    });
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]} scale={[t.s, t.s, t.s]}>
          {/* trunk */}
          <mesh castShadow position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.3, 0.55, 5, 7]} />
            <meshStandardMaterial color="#3d2008" roughness={0.95} />
          </mesh>
          {/* canopy layers */}
          {([5.5, 7.5, 9.2] as number[]).map((y, li) => (
            <mesh key={li} castShadow position={[0, y, 0]}>
              <coneGeometry args={[3.5 - li * 0.7, 4.5 - li * 0.5, 8]} />
              <meshStandardMaterial color={["#1a4a0a", "#1e5c0e", "#22660f"][li]!} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ── Zone arch markers ─────────────────────────────────────────────────────────
function ZoneMarkers() {
  return (
    <group>
      {ZONES.map((zone, i) => (
        <group key={i} position={[0, 0, zone.z]}>
          {([-1, 1] as number[]).map((side, si) => (
            <mesh key={si} castShadow position={[side * (TRACK_HALF_W + 1), 3, 0]}>
              <cylinderGeometry args={[0.28, 0.28, 6, 8]} />
              <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.45} />
            </mesh>
          ))}
          <mesh position={[0, 6.5, 0]}>
            <boxGeometry args={[TRACK_HALF_W * 2 + 2.2, 0.7, 0.18]} />
            <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.3} />
          </mesh>
          <pointLight position={[0, 5, 0]} intensity={2.5} distance={16} color={zone.color} />
        </group>
      ))}
    </group>
  );
}

// ── Golden Statue (goal) ──────────────────────────────────────────────────────
function GoldenStatue() {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (spinRef.current) spinRef.current.rotation.y = state.clock.elapsedTime * 0.6;
  });
  return (
    <group position={[0, 0, -92]}>
      {/* Base steps */}
      {([0, 1, 2] as number[]).map((s) => (
        <mesh key={s} castShadow position={[0, s * 0.65, 0]}>
          <cylinderGeometry args={[7 - s * 1.6, 7 - s * 1.6, 0.65, 12]} />
          <meshStandardMaterial color="#a07800" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      {/* Pedestal */}
      <mesh castShadow position={[0, 3, 0]}>
        <cylinderGeometry args={[3.2, 4, 4.2, 10]} />
        <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Spinning idol */}
      <group ref={spinRef} position={[0, 5.5, 0]}>
        <mesh castShadow position={[0, 2.5, 0]}>
          <cylinderGeometry args={[1.1, 1.4, 5, 10]} />
          <meshStandardMaterial color="#ffd700" roughness={0.12} metalness={0.95} emissive="#ffa500" emissiveIntensity={0.25} />
        </mesh>
        <mesh castShadow position={[0, 6, 0]}>
          <sphereGeometry args={[1.4, 14, 10]} />
          <meshStandardMaterial color="#ffd700" roughness={0.12} metalness={0.95} emissive="#ffaa00" emissiveIntensity={0.3} />
        </mesh>
        {Array.from({ length: 6 }, (_, k) => (
          <mesh key={k} castShadow position={[
            Math.sin((k / 6) * Math.PI * 2) * 1.25, 7.8,
            Math.cos((k / 6) * Math.PI * 2) * 1.25,
          ]}>
            <coneGeometry args={[0.2, 1.1, 5]} />
            <meshStandardMaterial color="#ffe066" roughness={0.1} metalness={1} emissive="#ffcc00" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 9, 0]} intensity={8} distance={50} color="#ffd700" />
      <pointLight position={[0, 9, 0]} intensity={4} distance={28} color="#ff8800" />
    </group>
  );
}

// ── Obstacle meshes ───────────────────────────────────────────────────────────
function ObstacleMesh({ obs }: { obs: Obstacle }) {
  if (obs.type === "rock") {
    return (
      <mesh castShadow receiveShadow position={[obs.x, obs.radius * 0.7, obs.z]}>
        <dodecahedronGeometry args={[obs.radius, 0]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.95} metalness={0.1} />
      </mesh>
    );
  }
  if (obs.type === "mud") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[obs.x, 0.06, obs.z]}>
        <circleGeometry args={[obs.radius, 14]} />
        <meshStandardMaterial color="#1a0c00" roughness={1} transparent opacity={0.9} />
      </mesh>
    );
  }
  if (obs.type === "vine") {
    return (
      <group position={[obs.x, 0, obs.z]}>
        {([
          [0, 3, 0, 0.15, 0.2, 6],
          [0.7, 2, 0, 0.12, 0.17, 4],
          [-0.6, 2.5, 0, 0.1, 0.14, 5],
        ] as [number, number, number, number, number, number][]).map(([vx, vy, vz, r1, r2, h], vi) => (
          <mesh key={vi} castShadow position={[vx, vy, vz]}>
            <cylinderGeometry args={[r1, r2, h, 6]} />
            <meshStandardMaterial color="#2d6b10" roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }
  // ruin
  return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh castShadow receiveShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[obs.radius * 2, 2.8, obs.radius * 1.5]} />
        <meshStandardMaterial color="#4a4030" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[obs.radius * 2.2, 0.3, obs.radius * 1.6]} />
        <meshStandardMaterial color="#2d5a1a" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Power-up meshes ───────────────────────────────────────────────────────────
const PU_COLOR: Record<PowerUp["type"], string> = {
  boost: "#22d3ee", shield: "#60a5fa", gun: "#f87171", repair: "#4ade80",
};
const PU_EMOJI: Record<PowerUp["type"], string> = {
  boost: "💨", shield: "🛡️", gun: "🔫", repair: "💚",
};

function PowerUpMesh({ pu }: { pu: PowerUp }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 2.5;
    ref.current.position.y = 1.1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
  });
  const col = PU_COLOR[pu.type];
  return (
    <group position={[pu.x, 0, pu.z]}>
      <mesh ref={ref} castShadow>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.7} roughness={0.2} metalness={0.5} />
      </mesh>
      <pointLight position={[0, 1.1, 0]} intensity={2} distance={6} color={col} />
    </group>
  );
}

// ── Bullet mesh ───────────────────────────────────────────────────────────────
function BulletMesh({ b }: { b: Bullet }) {
  return (
    <group position={[b.x, 1.0, b.z]}>
      <mesh>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2200" emissiveIntensity={2.5} />
      </mesh>
      <pointLight intensity={3} distance={5} color="#ff4400" />
    </group>
  );
}

// ── Enemy (jungle guardian) ───────────────────────────────────────────────────
function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const grp = useRef<THREE.Group>(null!);
  const eRef = useRef(enemy);
  eRef.current = enemy;

  useFrame(() => {
    if (grp.current) {
      grp.current.position.set(eRef.current.x, 0, eRef.current.z);
      grp.current.rotation.y = eRef.current.angle;
    }
  });

  const stunned = enemy.stunTimer > 0;
  const sc = stunned ? "#888" : "#c0392b";
  const dc = stunned ? "#666" : "#8b2500";

  return (
    <group ref={grp}>
      {/* legs */}
      <mesh castShadow position={[-0.35, 0.7, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.4, 7]} />
        <meshStandardMaterial color={dc} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.35, 0.7, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.4, 7]} />
        <meshStandardMaterial color={dc} roughness={0.8} />
      </mesh>
      {/* body */}
      <mesh castShadow position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.6, 0.5, 1.2, 8]} />
        <meshStandardMaterial color={sc} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* arms */}
      <mesh castShadow position={[-0.85, 1.8, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.15, 0.15, 1.0, 6]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.85, 1.8, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.15, 0.15, 1.0, 6]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 2.65, 0]}>
        <sphereGeometry args={[0.55, 10, 8]} />
        <meshStandardMaterial color="#8d5524" roughness={0.6} />
      </mesh>
      {/* eyes (red) */}
      <mesh position={[-0.22, 2.72, 0.48]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.22, 2.72, 0.48]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      {/* spear */}
      <mesh castShadow position={[1.2, 1.8, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.06, 0.06, 2.8, 6]} />
        <meshStandardMaterial color="#5a3000" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[1.5, 3.0, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.15, 0.5, 6]} />
        <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.8} />
      </mesh>
      {stunned && <pointLight position={[0, 2, 0]} intensity={3} distance={5} color="#ffff00" />}
    </group>
  );
}

// ── 3-D player character ──────────────────────────────────────────────────────
function PlayerMesh({
  posRef, angleRef, speedRef, shieldActive, boostActive, char,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  angleRef: React.RefObject<number>;
  speedRef: React.RefObject<number>;
  shieldActive: boolean;
  boostActive: boolean;
  char: Character;
}) {
  const grp   = useRef<THREE.Group>(null!);
  const legL  = useRef<THREE.Mesh>(null!);
  const legR  = useRef<THREE.Mesh>(null!);
  const armL  = useRef<THREE.Mesh>(null!);
  const armR  = useRef<THREE.Mesh>(null!);
  const bobT  = useRef(0);

  useFrame((_, dt) => {
    if (!grp.current) return;
    grp.current.position.set(posRef.current.x, 0, posRef.current.z);
    grp.current.rotation.y = angleRef.current;

    const spd = Math.abs(speedRef.current);
    if (spd > 0.5) {
      bobT.current += dt * (spd / 4) * 6;
      const swing = Math.sin(bobT.current) * 0.55;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
      if (armL.current) armL.current.rotation.x = -swing * 0.6;
      if (armR.current) armR.current.rotation.x = swing * 0.6;
      grp.current.position.y = Math.abs(Math.sin(bobT.current)) * 0.12;
    } else {
      if (legL.current) legL.current.rotation.x = 0;
      if (legR.current) legR.current.rotation.x = 0;
      if (armL.current) armL.current.rotation.x = 0;
      if (armR.current) armR.current.rotation.x = 0;
      grp.current.position.y = 0;
    }
  });

  const sc = char.skinColor;
  const hc = char.hairColor;
  const sh = char.shirtColor;
  const pa = char.pantsColor;
  const sk = char.shoeColor;

  return (
    <group ref={grp}>
      {/* Shield bubble */}
      {shieldActive && (
        <mesh>
          <sphereGeometry args={[2.8, 16, 12]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.18} roughness={0.05} wireframe />
        </mesh>
      )}

      {/* Left shoe */}
      <mesh castShadow position={[-0.32, 0.18, 0.1]}>
        <boxGeometry args={[0.38, 0.22, 0.65]} />
        <meshStandardMaterial color={sk} roughness={0.9} />
      </mesh>
      {/* Right shoe */}
      <mesh castShadow position={[0.32, 0.18, 0.1]}>
        <boxGeometry args={[0.38, 0.22, 0.65]} />
        <meshStandardMaterial color={sk} roughness={0.9} />
      </mesh>

      {/* Left leg */}
      <mesh ref={legL} castShadow position={[-0.32, 0.82, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.2, 8]} />
        <meshStandardMaterial color={pa} roughness={0.8} />
      </mesh>
      {/* Right leg */}
      <mesh ref={legR} castShadow position={[0.32, 0.82, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.2, 8]} />
        <meshStandardMaterial color={pa} roughness={0.8} />
      </mesh>

      {/* Body */}
      <mesh castShadow position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.5, 0.42, 1.1, 10]} />
        <meshStandardMaterial color={boostActive ? "#22d3ee" : sh} roughness={0.5} metalness={0.1} emissive={boostActive ? "#0891b2" : "#000"} emissiveIntensity={boostActive ? 0.4 : 0} />
      </mesh>

      {/* Left arm */}
      <mesh ref={armL} castShadow position={[-0.72, 1.72, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.16, 0.16, 0.9, 7]} />
        <meshStandardMaterial color={sh} roughness={0.6} />
      </mesh>
      {/* Right arm */}
      <mesh ref={armR} castShadow position={[0.72, 1.72, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.16, 0.16, 0.9, 7]} />
        <meshStandardMaterial color={sh} roughness={0.6} />
      </mesh>

      {/* Left hand */}
      <mesh castShadow position={[-0.82, 1.24, 0]}>
        <sphereGeometry args={[0.18, 7, 7]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      {/* Right hand */}
      <mesh castShadow position={[0.82, 1.24, 0]}>
        <sphereGeometry args={[0.18, 7, 7]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>

      {/* Neck */}
      <mesh castShadow position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.35, 8]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 2.88, 0]}>
        <sphereGeometry args={[0.52, 14, 12]} />
        <meshStandardMaterial color={sc} roughness={0.55} />
      </mesh>

      {/* Hair */}
      <mesh castShadow position={[0, 3.22, 0]}>
        <sphereGeometry args={[0.54, 12, 10]} />
        <meshStandardMaterial color={hc} roughness={0.8} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.2, 2.94, 0.46]}>
        <sphereGeometry args={[0.1, 7, 7]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.2, 2.94, 0.46]}>
        <sphereGeometry args={[0.1, 7, 7]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.2, 2.94, 0.52]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.2, 2.94, 0.52]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Girl hair sides */}
      {char.gender === "girl" && (
        <>
          <mesh castShadow position={[-0.52, 2.75, 0]}>
            <sphereGeometry args={[0.28, 8, 8]} />
            <meshStandardMaterial color={hc} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0.52, 2.75, 0]}>
            <sphereGeometry args={[0.28, 8, 8]} />
            <meshStandardMaterial color={hc} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Boost trail light */}
      {boostActive && (
        <pointLight position={[0, 1, 0.8]} intensity={5} distance={7} color="#ff6600" />
      )}
    </group>
  );
}

// ── Follow camera ─────────────────────────────────────────────────────────────
function FollowCamera({
  posRef, angleRef,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  angleRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 10, 20));

  useFrame((_, dt) => {
    const p = posRef.current;
    const a = angleRef.current;
    const lp = 1 - Math.pow(0.01, dt);
    const tx = p.x + Math.sin(a) * 14;
    const tz = p.z + Math.cos(a) * 14;
    camPos.current.x += (tx - camPos.current.x) * lp;
    camPos.current.y += (9 - camPos.current.y) * lp;
    camPos.current.z += (tz - camPos.current.z) * lp;
    camera.position.copy(camPos.current);
    camera.lookAt(p.x, 1.5, p.z);
  });

  return null;
}

// ── HUD overlay ───────────────────────────────────────────────────────────────
interface HudState {
  health: number;
  score: number;
  ammo: number;
  hasGun: boolean;
  boostActive: boolean;
  shieldActive: boolean;
  zone: number;
  distPct: number;
}

function HudOverlay({ hud, onShoot }: { hud: HudState; onShoot: () => void }) {
  const zoneName = ZONES[hud.zone]?.label ?? "";
  const zoneColor = ZONES[hud.zone]?.color ?? "#fff";
  const hpColor = hud.health > 60 ? "#4ade80" : hud.health > 30 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: "Manrope, sans-serif" }}>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 10, left: 10, right: 10,
        display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
      }}>
        {/* HP bar */}
        <div style={{
          background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "5px 10px",
          display: "flex", alignItems: "center", gap: 7, minWidth: 130,
        }}>
          <span style={{ color: hpColor, fontSize: "0.8rem", fontWeight: 700 }}>❤️ HP</span>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, minWidth: 70 }}>
            <div style={{ width: `${hud.health}%`, height: "100%", background: hpColor, borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>{hud.health}</span>
        </div>
        {/* Score */}
        <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "5px 12px", color: "#fbbf24", fontWeight: 800, fontSize: "0.85rem" }}>
          ⭐ {hud.score}
        </div>
        {/* Power-up badges */}
        {hud.boostActive && (
          <div style={{ background: "rgba(34,211,238,0.85)", borderRadius: 10, padding: "5px 10px", color: "#0a1a2a", fontWeight: 800, fontSize: "0.8rem" }}>
            💨 BOOST
          </div>
        )}
        {hud.shieldActive && (
          <div style={{ background: "rgba(96,165,250,0.85)", borderRadius: 10, padding: "5px 10px", color: "#0a1a2a", fontWeight: 800, fontSize: "0.8rem" }}>
            🛡️ SHIELD
          </div>
        )}
        {hud.hasGun && (
          <div style={{ background: "rgba(248,113,113,0.85)", borderRadius: 10, padding: "5px 10px", color: "#1a0000", fontWeight: 800, fontSize: "0.8rem" }}>
            🔫 ×{hud.ammo}
          </div>
        )}
      </div>

      {/* Zone label */}
      <div style={{
        position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.55)", borderRadius: 10, padding: "4px 16px",
        color: zoneColor, fontWeight: 700, fontSize: "0.8rem",
        border: `1px solid ${zoneColor}55`,
        whiteSpace: "nowrap",
      }}>
        {zoneName}
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)",
        width: "min(280px, 80vw)",
      }}>
        <div style={{ color: "#fff", fontSize: "0.7rem", textAlign: "center", marginBottom: 3, textShadow: "0 1px 4px #000" }}>
          🏛️ Temple {Math.round(hud.distPct)}% away
        </div>
        <div style={{ height: 7, background: "rgba(255,255,255,0.2)", borderRadius: 4 }}>
          <div style={{ width: `${100 - hud.distPct}%`, height: "100%", background: "linear-gradient(90deg,#4ade80,#fbbf24)", borderRadius: 4, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Mobile controls */}
      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 16px", pointerEvents: "auto" }}>
        {/* D-pad */}
        <div style={{ display: "grid", gridTemplateColumns: "44px 44px 44px", gridTemplateRows: "44px 44px", gap: 4 }}>
          {/* Up */}
          <div />
          <MobileBtn label="▲" keyName="ArrowUp" style={{ gridColumn: 2, gridRow: 1 }} />
          <div />
          {/* Left / Down / Right */}
          <MobileBtn label="◄" keyName="ArrowLeft" style={{ gridColumn: 1, gridRow: 2 }} />
          <MobileBtn label="▼" keyName="ArrowDown" style={{ gridColumn: 2, gridRow: 2 }} />
          <MobileBtn label="►" keyName="ArrowRight" style={{ gridColumn: 3, gridRow: 2 }} />
        </div>

        {/* Shoot */}
        {hud.hasGun && (
          <button
            onPointerDown={(e) => { e.preventDefault(); onShoot(); }}
            style={{
              width: 64, height: 64, borderRadius: "50%", border: "3px solid #f87171",
              background: "rgba(248,113,113,0.3)", color: "#fff",
              fontSize: "1.5rem", cursor: "pointer", fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            🔫
          </button>
        )}
      </div>
    </div>
  );
}

// tiny helper for mobile d-pad buttons
const mobileKeys = new Set<string>();

function MobileBtn({ label, keyName, style }: { label: string; keyName: string; style?: React.CSSProperties }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); mobileKeys.add(keyName); }}
      onPointerUp={(e) => { e.preventDefault(); mobileKeys.delete(keyName); }}
      onPointerLeave={(e) => { e.preventDefault(); mobileKeys.delete(keyName); }}
      style={{
        ...style,
        width: 44, height: 44, borderRadius: 10, border: "2px solid rgba(255,255,255,0.35)",
        background: "rgba(0,0,0,0.5)", color: "#fff",
        fontSize: "1.1rem", cursor: "pointer", fontWeight: 900,
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

// ── Scene (game logic + rendering) ───────────────────────────────────────────
interface SceneProps extends GameProps {
  keysRef: React.RefObject<Set<string>>;
  mobileTapShoot: React.RefObject<boolean>;
  onHud: (h: HudState) => void;
}

function Scene({
  character, level,
  onScore, onHealth, onLevelComplete, onGameOver,
  keysRef, mobileTapShoot, onHud,
}: SceneProps) {
  // player state refs (mutated in useFrame, never trigger re-renders)
  const posRef    = useRef(new THREE.Vector3(0, 0, 88));
  const angleRef  = useRef(Math.PI); // facing -Z (toward statue)
  const speedRef  = useRef(0);

  const healthRef      = useRef(100);
  const ammoRef        = useRef(0);
  const hasGunRef      = useRef(false);
  const boostTimerRef  = useRef(0);
  const shieldTimerRef = useRef(0);
  const fireTimerRef   = useRef(0);
  const scoreRef       = useRef(0);
  const overRef        = useRef(false);
  const hurtCoolRef    = useRef(0);

  // live callbacks via ref so useFrame closure never goes stale
  const cbs = useRef({ onScore, onHealth, onLevelComplete, onGameOver, onHud });
  cbs.current = { onScore, onHealth, onLevelComplete, onGameOver, onHud };

  // ── static obstacles (memoised per level) ──
  const obstacles = useMemo<Obstacle[]>(() => {
    const rand = mkRand(100 + level * 7);
    const types: Obstacle["type"][] = ["rock", "mud", "vine", "ruin"];
    const list: Obstacle[] = [];
    const count = 18 + level * 4;
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(rand() * types.length)]!;
      const x = (rand() * 2 - 1) * (TRACK_HALF_W - 1.8);
      const z = -80 + rand() * 160;
      if (z > 80 || z < -80) continue;
      if (ZONES.some(zo => Math.abs(z - zo.z) < 7 && Math.abs(x) < 9)) continue;
      const radius = type === "mud" ? 2.2 + rand() * 1.4 : 1.0 + rand() * 0.7;
      list.push({ id: i, type, x, z, radius });
    }
    return list;
  }, [level]);

  // ── dynamic entities (in refs, synced to state for rendering) ──
  const enemiesRef  = useRef<Enemy[]>([]);
  const bulletsRef  = useRef<Bullet[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const nextId      = useRef(1000);

  const [renderEnemies,  setRenderEnemies]  = useState<Enemy[]>([]);
  const [renderBullets,  setRenderBullets]  = useState<Bullet[]>([]);
  const [renderPowerUps, setRenderPowerUps] = useState<PowerUp[]>([]);

  // ── HUD state (low-freq updates) ──
  const [hudState, setHudState] = useState<HudState>({
    health: 100, score: 0, ammo: 0, hasGun: false,
    boostActive: false, shieldActive: false, zone: 0, distPct: 100,
  });

  // spawn enemies + power-ups when level changes
  useEffect(() => {
    const rand = mkRand(200 + level * 13);
    const enemyCount = 2 + level * 2;
    enemiesRef.current = Array.from({ length: enemyCount }, () => {
      const z = -70 + rand() * 140;
      const x = (rand() * 2 - 1) * (TRACK_HALF_W - 2);
      return {
        id: nextId.current++,
        x, z,
        angle: rand() * Math.PI * 2,
        speed: ENEMY_BASE_SPEED + level * 1.2 + rand() * 2,
        health: 1 + level,
        stunTimer: 0,
      };
    });
    const puTypes: PowerUp["type"][] = ["boost", "shield", "gun", "repair"];
    powerUpsRef.current = Array.from({ length: 8 + level * 2 }, (_, i) => ({
      id: nextId.current++,
      type: puTypes[i % puTypes.length]!,
      x: (rand() * 2 - 1) * (TRACK_HALF_W - 2),
      z: -78 + rand() * 156,
      collected: false,
    }));
    setRenderEnemies([...enemiesRef.current]);
    setRenderPowerUps([...powerUpsRef.current]);
    // reset player
    posRef.current.set(0, 0, 88);
    angleRef.current = Math.PI;
    speedRef.current = 0;
    healthRef.current = 100;
    ammoRef.current = 0;
    hasGunRef.current = false;
    boostTimerRef.current = 0;
    shieldTimerRef.current = 0;
    scoreRef.current = 0;
    overRef.current = false;
    hurtCoolRef.current = 0;
  }, [level]);

  const frameCount = useRef(0);

  useFrame((_, delta) => {
    if (overRef.current) return;
    const dt = Math.min(delta, 0.05);
    const keys = keysRef.current;

    // ── input ──
    const fwd   = keys.has("ArrowUp")    || keys.has("w") || keys.has("W") || mobileKeys.has("ArrowUp");
    const back  = keys.has("ArrowDown")  || keys.has("s") || keys.has("S") || mobileKeys.has("ArrowDown");
    const left  = keys.has("ArrowLeft")  || keys.has("a") || keys.has("A") || mobileKeys.has("ArrowLeft");
    const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D") || mobileKeys.has("ArrowRight");
    const fire  = keys.has(" ") || mobileTapShoot.current;
    mobileTapShoot.current = false;

    const boosting = boostTimerRef.current > 0;
    const maxSpd = PLAYER_MAX_SPEED * character.speedBonus * (boosting ? 1.7 : 1.0);

    if (fwd)  speedRef.current = Math.min(speedRef.current + PLAYER_ACCEL * dt, maxSpd);
    else if (back) speedRef.current = Math.max(speedRef.current - PLAYER_BRAKE * dt, -maxSpd * 0.4);
    else {
      const friction = 16;
      if (speedRef.current > 0) speedRef.current = Math.max(0, speedRef.current - friction * dt);
      else speedRef.current = Math.min(0, speedRef.current + friction * dt);
    }

    if (Math.abs(speedRef.current) > 0.3) {
      const dir = speedRef.current > 0 ? 1 : -1;
      if (left)  angleRef.current += PLAYER_TURN * dt * dir;
      if (right) angleRef.current -= PLAYER_TURN * dt * dir;
    }

    const p = posRef.current;
    p.x -= Math.sin(angleRef.current) * speedRef.current * dt;
    p.z -= Math.cos(angleRef.current) * speedRef.current * dt;
    p.x = clamp(p.x, -TRACK_HALF_W + 1, TRACK_HALF_W - 1);
    p.z = clamp(p.z, -95, 93);

    // ── timers ──
    if (boostTimerRef.current  > 0) boostTimerRef.current  -= dt;
    if (shieldTimerRef.current > 0) shieldTimerRef.current -= dt;
    if (fireTimerRef.current   > 0) fireTimerRef.current   -= dt;
    if (hurtCoolRef.current    > 0) hurtCoolRef.current    -= dt;

    // ── shoot ──
    if (fire && hasGunRef.current && ammoRef.current > 0 && fireTimerRef.current <= 0) {
      fireTimerRef.current = 0.25;
      ammoRef.current -= 1;
      if (ammoRef.current <= 0) hasGunRef.current = false;
      bulletsRef.current.push({
        id: nextId.current++,
        x: p.x - Math.sin(angleRef.current) * 2,
        z: p.z - Math.cos(angleRef.current) * 2,
        vx: -Math.sin(angleRef.current) * BULLET_SPEED,
        vz: -Math.cos(angleRef.current) * BULLET_SPEED,
        life: BULLET_LIFE,
      });
    }

    // ── update bullets ──
    bulletsRef.current = bulletsRef.current
      .map(b => ({ ...b, x: b.x + b.vx * dt, z: b.z + b.vz * dt, life: b.life - dt }))
      .filter(b => b.life > 0);

    // ── bullet vs enemy ──
    bulletsRef.current = bulletsRef.current.filter(b => {
      let hit = false;
      enemiesRef.current = enemiesRef.current.map(e => {
        if (hit) return e;
        if (dist2(b.x, b.z, e.x, e.z) < 4) {
          hit = true;
          const nh = e.health - 1;
          if (nh <= 0) {
            scoreRef.current += scoreForKill();
            return { ...e, health: 0 };
          }
          return { ...e, health: nh, stunTimer: 1.8 };
        }
        return e;
      });
      return !hit;
    });
    enemiesRef.current = enemiesRef.current.filter(e => e.health > 0);

    // ── enemy AI ──
    enemiesRef.current = enemiesRef.current.map(e => {
      if (e.stunTimer > 0) return { ...e, stunTimer: e.stunTimer - dt };
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const targetAngle = Math.atan2(dx, dz);
      const newAngle = lerpAngle(e.angle, targetAngle, dt * 2.5);
      const nx = e.x + Math.sin(newAngle) * e.speed * dt;
      const nz = e.z + Math.cos(newAngle) * e.speed * dt;
      return { ...e, x: clamp(nx, -TRACK_HALF_W + 1, TRACK_HALF_W - 1), z: nz, angle: newAngle };
    });

    // ── player vs enemy collision ──
    if (hurtCoolRef.current <= 0) {
      for (const e of enemiesRef.current) {
        if (dist2(p.x, p.z, e.x, e.z) < 3.5) {
          const dmg = shieldTimerRef.current > 0
            ? Math.round(5 * (2 - character.shieldBonus))
            : Math.round(15 * (2 - character.shieldBonus));
          healthRef.current = Math.max(0, healthRef.current - dmg);
          hurtCoolRef.current = 0.7;
          cbs.current.onHealth(healthRef.current);
          if (healthRef.current <= 0) {
            overRef.current = true;
            cbs.current.onGameOver(scoreRef.current);
            return;
          }
          break;
        }
      }
    }

    // ── player vs obstacle ──
    if (hurtCoolRef.current <= 0) {
      for (const obs of obstacles) {
        const hitR = obs.type === "mud" ? obs.radius * 0.85 : obs.radius;
        if (dist2(p.x, p.z, obs.x, obs.z) < hitR * hitR) {
          if (obs.type === "mud") {
            speedRef.current *= 0.88;
          } else {
            const dmg = shieldTimerRef.current > 0 ? 0 : 8;
            healthRef.current = Math.max(0, healthRef.current - dmg);
            hurtCoolRef.current = 0.5;
            speedRef.current *= -0.3;
            cbs.current.onHealth(healthRef.current);
            if (healthRef.current <= 0) {
              overRef.current = true;
              cbs.current.onGameOver(scoreRef.current);
              return;
            }
          }
          break;
        }
      }
    }

    // ── power-up collection ──
    let puChanged = false;
    powerUpsRef.current = powerUpsRef.current.map(pu => {
      if (pu.collected) return pu;
      if (dist2(p.x, p.z, pu.x, pu.z) < 4) {
        puChanged = true;
        scoreRef.current += scoreForPickup(pu.type);
        if (pu.type === "boost")  boostTimerRef.current  = 4 + (character.speedBonus - 1) * 10;
        if (pu.type === "shield") shieldTimerRef.current = 5 * character.shieldBonus;
        if (pu.type === "repair") healthRef.current = Math.min(100, healthRef.current + 30);
        if (pu.type === "gun") {
          hasGunRef.current = true;
          ammoRef.current += character.id === "leon" ? 10 : 6;
        }
        cbs.current.onHealth(healthRef.current);
        return { ...pu, collected: true };
      }
      return pu;
    });

    // ── win condition ──
    if (p.z <= -90) {
      overRef.current = true;
      scoreRef.current += 200 + level * 50;
      cbs.current.onScore(scoreRef.current);
      cbs.current.onLevelComplete(scoreRef.current);
      return;
    }

    // ── HUD update (every 6 frames) ──
    frameCount.current++;
    const needRenderUpdate = frameCount.current % 3 === 0;
    if (frameCount.current % 6 === 0) {
      const distPct = Math.max(0, Math.round(((p.z + 90) / 180) * 100));
      const zoneIdx = ZONES.findIndex(z => p.z > z.z - 20) ?? 0;
      setHudState({
        health: healthRef.current,
        score: scoreRef.current,
        ammo: ammoRef.current,
        hasGun: hasGunRef.current,
        boostActive: boostTimerRef.current > 0,
        shieldActive: shieldTimerRef.current > 0,
        zone: Math.max(0, zoneIdx),
        distPct,
      });
      cbs.current.onScore(scoreRef.current);
    }

    // ── sync render state ──
    if (needRenderUpdate) {
      setRenderEnemies([...enemiesRef.current]);
      setRenderBullets([...bulletsRef.current]);
      if (puChanged) setRenderPowerUps([...powerUpsRef.current]);
    }
  });

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.65} />
      <directionalLight
        castShadow position={[12, 22, 18]}
        intensity={1.8}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={220}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <hemisphereLight args={["#c8f0a0", "#2a1800", 0.5]} />
      <fog attach="fog" args={["#1a3a0a", 60, 180]} />

      {/* World */}
      <Ground />
      <JungleSides />
      <ZoneMarkers />
      <GoldenStatue />

      {/* Obstacles */}
      {obstacles.map(obs => <ObstacleMesh key={obs.id} obs={obs} />)}

      {/* Power-ups */}
      {renderPowerUps.filter(p => !p.collected).map(pu => <PowerUpMesh key={pu.id} pu={pu} />)}

      {/* Bullets */}
      {renderBullets.map(b => <BulletMesh key={b.id} b={b} />)}

      {/* Enemies */}
      {renderEnemies.map(e => <EnemyMesh key={e.id} enemy={e} />)}

      {/* Player */}
      <PlayerMesh
        posRef={posRef}
        angleRef={angleRef}
        speedRef={speedRef}
        shieldActive={hudState.shieldActive}
        boostActive={hudState.boostActive}
        char={character}
      />

      {/* Camera */}
      <FollowCamera posRef={posRef} angleRef={angleRef} />
    </>
  );
}

// ── Top-level Game component ──────────────────────────────────────────────────
export function Game({
  character, level, onScore, onHealth, onLevelComplete, onGameOver,
}: GameProps) {
  const keysRef = useRef<Set<string>>(new Set());
  const mobileTapShoot = useRef(false);
  const [hud, setHud] = useState<HudState>({
    health: 100, score: 0, ammo: 0, hasGun: false,
    boostActive: false, shieldActive: false, zone: 0, distPct: 100,
  });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " ") e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const handleShoot = () => { mobileTapShoot.current = true; };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.5, far: 220, position: [0, 10, 20] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene
          character={character}
          level={level}
          onScore={onScore}
          onHealth={onHealth}
          onLevelComplete={onLevelComplete}
          onGameOver={onGameOver}
          keysRef={keysRef}
          mobileTapShoot={mobileTapShoot}
          onHud={setHud}
        />
      </Canvas>
      <HudOverlay hud={hud} onShoot={handleShoot} />
    </div>
  );
}
