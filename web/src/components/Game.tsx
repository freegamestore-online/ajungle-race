import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGameSounds } from "@freegamestore/games";
import * as THREE from "three";
import type { PowerUp, Obstacle, Bullet, Enemy } from "../types";
import {
  TRACK_HALF,
  PLAYER_SPEED,
  PLAYER_TURN_SPEED,
  ROUND_SECONDS,
  BULLET_SPEED,
  BULLET_LIFE,
  ENEMY_SPEED_BASE,
  dist2,
  collides,
  clampToTrack,
  randomPosition,
  lerpAngle,
  scoreForKill,
  scoreForPickup,
} from "../lib/logic";

export interface GameProps {
  onScore: (score: number) => void;
  onTime: (secondsLeft: number) => void;
  onHealth: (hp: number) => void;
  onGameOver: () => void;
}

// ─── HUD state passed from Scene up to Game ──────────────────────────────────
interface HudState {
  health: number;
  ammo: number;
  hasGun: boolean;
  boostActive: boolean;
  shieldActive: boolean;
}

// ─── Seeded RNG ──────────────────────────────────────────────────────────────
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Jungle Floor ────────────────────────────────────────────────────────────
function JungleFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[TRACK_HALF * 2, TRACK_HALF * 2]} />
        <meshStandardMaterial color="#2d4a1e" roughness={0.95} metalness={0} />
      </mesh>
      {([[-15, -20], [10, 15], [-30, 10], [25, -35], [5, -5]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[x, 0.01, z]}>
          <circleGeometry args={[4 + i * 0.8, 16]} />
          <meshStandardMaterial color="#1a0f00" roughness={1} metalness={0} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.02, 0]}>
        <planeGeometry args={[12, TRACK_HALF * 2]} />
        <meshStandardMaterial color="#3d5c1a" roughness={0.9} metalness={0} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ─── Trees ───────────────────────────────────────────────────────────────────
function JungleTrees() {
  const trees = useMemo(() => {
    const rand = seededRand(42);
    const arr: { x: number; z: number; scale: number; rot: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const x = (rand() * 2 - 1) * TRACK_HALF * 0.95;
      const z = (rand() * 2 - 1) * TRACK_HALF * 0.95;
      if (Math.abs(x) < 7 && Math.abs(z) < 50) continue;
      arr.push({ x, z, scale: 0.7 + rand() * 1.2, rot: rand() * Math.PI * 2 });
    }
    return arr;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]} scale={[t.scale, t.scale, t.scale]}>
          <mesh castShadow position={[0, 3, 0]}>
            <cylinderGeometry args={[0.35, 0.55, 6, 7]} />
            <meshStandardMaterial color="#3d2008" roughness={0.95} />
          </mesh>
          <mesh castShadow position={[0, 7.5, 0]}>
            <coneGeometry args={[3.5, 5, 7]} />
            <meshStandardMaterial color="#1a4a0a" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 9.5, 0]}>
            <coneGeometry args={[2.5, 4, 6]} />
            <meshStandardMaterial color="#1e5c0e" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 11.5, 0]}>
            <coneGeometry args={[1.5, 3, 6]} />
            <meshStandardMaterial color="#22660f" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Ground Cover ─────────────────────────────────────────────────────────────
function GroundCover() {
  const ferns = useMemo(() => {
    const rand = seededRand(99);
    const arr: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 100; i++) {
      const x = (rand() * 2 - 1) * TRACK_HALF * 0.9;
      const z = (rand() * 2 - 1) * TRACK_HALF * 0.9;
      if (Math.abs(x) < 9 && Math.abs(z) < 55) continue;
      arr.push({ x, z, s: 0.4 + rand() * 0.8 });
    }
    return arr;
  }, []);

  return (
    <group>
      {ferns.map((f, i) => (
        <mesh key={i} position={[f.x, 0.3, f.z]} castShadow>
          <sphereGeometry args={[f.s, 6, 4]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#1a5c0a" : i % 3 === 1 ? "#2d7a12" : "#145208"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Waterfall ────────────────────────────────────────────────────────────────
function Waterfall({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
    }
  });
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 6, 0]}>
        <boxGeometry args={[8, 12, 4]} />
        <meshStandardMaterial color="#2a3a1a" roughness={0.95} />
      </mesh>
      <mesh ref={meshRef} position={[0, 2, 2.1]}>
        <planeGeometry args={[4, 12]} />
        <meshStandardMaterial color="#60c8ff" transparent opacity={0.6} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 4]}>
        <circleGeometry args={[4, 16]} />
        <meshStandardMaterial color="#8dd8ff" transparent opacity={0.4} roughness={0.05} />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[Math.sin(k * 1.3) * 2, 0.3 + k * 0.2, 4 + k * 0.5]}>
          <sphereGeometry args={[0.25 + k * 0.05, 6, 6]} />
          <meshStandardMaterial color="#c0eeff" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Golden Statue ────────────────────────────────────────────────────────────
function GoldenStatue() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.06;
    }
  });
  return (
    <group ref={groupRef} position={[0, 0, -50]}>
      {[0, 1, 2].map((s) => (
        <mesh key={s} castShadow receiveShadow position={[0, s * 0.6, 0]}>
          <boxGeometry args={[14 - s * 2, 0.6, 14 - s * 2]} />
          <meshStandardMaterial color="#a07800" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, 2.5, 0]}>
        <boxGeometry args={[10, 4, 10]} />
        <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 8, 0]}>
        <cylinderGeometry args={[1.8, 2.2, 8, 10]} />
        <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.95} emissive="#ffa500" emissiveIntensity={0.15} />
      </mesh>
      <mesh castShadow position={[-3.5, 9, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.5, 0.7, 5, 8]} />
        <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.95} />
      </mesh>
      <mesh castShadow position={[3.5, 9, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.5, 0.7, 5, 8]} />
        <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 13.5, 0]}>
        <sphereGeometry args={[2, 12, 10]} />
        <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.95} emissive="#ffaa00" emissiveIntensity={0.2} />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} castShadow position={[
          Math.sin((k / 5) * Math.PI * 2) * 1.6,
          15.5,
          Math.cos((k / 5) * Math.PI * 2) * 1.6,
        ]}>
          <coneGeometry args={[0.25, 1.2, 5]} />
          <meshStandardMaterial color="#ffe066" roughness={0.15} metalness={1} emissive="#ffcc00" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {[-2, 0, 2].map((ox, i) => (
        <mesh key={i} castShadow position={[ox, 5 + i, 2.2]}>
          <torusGeometry args={[0.8, 0.18, 6, 10]} />
          <meshStandardMaterial color="#2d7a12" roughness={0.9} />
        </mesh>
      ))}
      <pointLight position={[0, 10, 0]} intensity={3} distance={30} color="#ffd700" />
    </group>
  );
}

// ─── Ancient Ruins ────────────────────────────────────────────────────────────
function AncientRuins() {
  const ruins = useMemo(() => {
    const rand = seededRand(77);
    const arr: { x: number; z: number; rot: number; h: number; w: number; d: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const x = (rand() * 2 - 1) * TRACK_HALF * 0.8;
      const z = (rand() * 2 - 1) * TRACK_HALF * 0.7;
      if (Math.abs(x) < 8 && Math.abs(z) < 52) continue;
      arr.push({ x, z, rot: rand() * Math.PI, h: 1.5 + rand() * 3, w: 2 + (i % 3), d: 2 + (i % 2) });
    }
    return arr;
  }, []);

  return (
    <group>
      {ruins.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]} rotation={[0, r.rot, 0]}>
          <mesh castShadow receiveShadow position={[0, r.h / 2, 0]}>
            <boxGeometry args={[r.w, r.h, r.d]} />
            <meshStandardMaterial color="#4a4030" roughness={0.95} metalness={0.05} />
          </mesh>
          <mesh position={[0, r.h, 0]}>
            <boxGeometry args={[r.w + 0.1, 0.3, r.d + 0.1]} />
            <meshStandardMaterial color="#2d5a1a" roughness={1} />
          </mesh>
        </group>
      ))}
      <group position={[20, 0, -20]} rotation={[0, 0.4, 0]}>
        <mesh castShadow position={[-3, 4, 0]}>
          <boxGeometry args={[1.5, 8, 1.5]} />
          <meshStandardMaterial color="#5a5040" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[3, 4, 0]}>
          <boxGeometry args={[1.5, 8, 1.5]} />
          <meshStandardMaterial color="#5a5040" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 8.5, 0]}>
          <boxGeometry args={[8, 1.5, 1.5]} />
          <meshStandardMaterial color="#5a5040" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Obstacle Mesh ────────────────────────────────────────────────────────────
function ObstacleMesh({ obs }: { obs: Obstacle }) {
  if (obs.type === "rock") {
    return (
      <mesh castShadow receiveShadow position={[obs.x, 1, obs.z]}>
        <dodecahedronGeometry args={[obs.radius * 0.9, 0]} />
        <meshStandardMaterial color="#5a5a4a" roughness={0.95} metalness={0.1} />
      </mesh>
    );
  }
  if (obs.type === "mud") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[obs.x, 0.08, obs.z]}>
        <circleGeometry args={[obs.radius, 12]} />
        <meshStandardMaterial color="#1a0c00" roughness={1} transparent opacity={0.9} />
      </mesh>
    );
  }
  if (obs.type === "vine") {
    return (
      <group position={[obs.x, 0, obs.z]}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} castShadow position={[Math.sin(k * 2.1) * 0.5, 2 + k * 1.5, Math.cos(k * 2.1) * 0.5]}>
            <cylinderGeometry args={[0.12, 0.18, 3, 5]} />
            <meshStandardMaterial color="#2d6b10" roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <mesh castShadow receiveShadow position={[obs.x, 1.2, obs.z]}>
      <boxGeometry args={[obs.radius * 1.6, 2.4, obs.radius * 1.6]} />
      <meshStandardMaterial color="#4a4030" roughness={0.95} />
    </mesh>
  );
}

// ─── Power-Up Mesh ────────────────────────────────────────────────────────────
const PU_COLORS: Record<PowerUp["type"], string> = { boost: "#22d3ee", shield: "#60a5fa", gun: "#f87171", repair: "#4ade80" };
const PU_EMISSIVE: Record<PowerUp["type"], string> = { boost: "#0891b2", shield: "#1d4ed8", gun: "#b91c1c", repair: "#15803d" };

function PowerUpMesh({ pu }: { pu: PowerUp }) {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 2.5;
      mesh.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.25;
    }
  });
  return (
    <group position={[pu.x, 0, pu.z]}>
      <mesh ref={mesh} castShadow>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={PU_COLORS[pu.type]} emissive={PU_EMISSIVE[pu.type]} emissiveIntensity={0.8} roughness={0.2} metalness={0.5} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={1.5} distance={6} color={PU_COLORS[pu.type]} />
    </group>
  );
}

// ─── Bullet Mesh ──────────────────────────────────────────────────────────────
function BulletMesh({ bullet }: { bullet: Bullet }) {
  return (
    <group position={[bullet.x, 0.8, bullet.z]}>
      <mesh>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      <pointLight intensity={2} distance={4} color="#ff4400" />
    </group>
  );
}

// ─── Enemy Car ────────────────────────────────────────────────────────────────
function EnemyCar({ enemy }: { enemy: Enemy }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = enemy.x;
      groupRef.current.position.z = enemy.z;
      groupRef.current.rotation.y = enemy.angle;
    }
  });
  const stunned = enemy.stunTimer > 0;
  return (
    <group ref={groupRef} position={[enemy.x, 0, enemy.z]}>
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2.2, 0.8, 3.8]} />
        <meshStandardMaterial color={stunned ? "#888" : "#c0392b"} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0.3]}>
        <boxGeometry args={[1.8, 0.7, 2.2]} />
        <meshStandardMaterial color={stunned ? "#666" : "#922b21"} roughness={0.5} metalness={0.3} />
      </mesh>
      {([[-1.2, 0.4, 1.4], [1.2, 0.4, 1.4], [-1.2, 0.4, -1.4], [1.2, 0.4, -1.4]] as [number, number, number][]).map(([wx, wy, wz], k) => (
        <mesh key={k} castShadow position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 0.35, 10]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      ))}
      <pointLight position={[0, 0.8, -2.2]} intensity={1.5} distance={10} color="#ffeeaa" />
    </group>
  );
}

// ─── Player Car ───────────────────────────────────────────────────────────────
function PlayerCar({
  posRef, angleRef, shieldActive, boostActive,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  angleRef: React.RefObject<number>;
  shieldActive: boolean;
  boostActive: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const w0 = useRef<THREE.Mesh>(null!);
  const w1 = useRef<THREE.Mesh>(null!);
  const w2 = useRef<THREE.Mesh>(null!);
  const w3 = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.position.x = posRef.current.x;
    groupRef.current.position.z = posRef.current.z;
    groupRef.current.rotation.y = angleRef.current;
    w0.current && (w0.current.rotation.x += dt * 8);
    w1.current && (w1.current.rotation.x += dt * 8);
    w2.current && (w2.current.rotation.x += dt * 8);
    w3.current && (w3.current.rotation.x += dt * 8);
  });

  return (
    <group ref={groupRef}>
      {shieldActive && (
        <mesh>
          <sphereGeometry args={[3, 16, 12]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.22} roughness={0.1} metalness={0.5} wireframe />
        </mesh>
      )}
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2.2, 0.85, 4]} />
        <meshStandardMaterial
          color={boostActive ? "#22d3ee" : "#1a7a1a"}
          emissive={boostActive ? "#0891b2" : "#000"}
          emissiveIntensity={boostActive ? 0.4 : 0}
          roughness={0.35} metalness={0.55}
        />
      </mesh>
      <mesh castShadow position={[0, 1.42, 0.4]}>
        <boxGeometry args={[1.8, 0.75, 2.4]} />
        <meshStandardMaterial color="#145214" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.42, -0.8]}>
        <boxGeometry args={[1.75, 0.6, 0.08]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.6} roughness={0.05} metalness={0.3} />
      </mesh>
      <mesh ref={w0} castShadow position={[-1.2, 0.4, 1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.48, 0.48, 0.38, 10]} />
        <meshStandardMaterial color="#111" roughness={0.95} />
      </mesh>
      <mesh ref={w1} castShadow position={[1.2, 0.4, 1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.48, 0.48, 0.38, 10]} />
        <meshStandardMaterial color="#111" roughness={0.95} />
      </mesh>
      <mesh ref={w2} castShadow position={[-1.2, 0.4, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.48, 0.48, 0.38, 10]} />
        <meshStandardMaterial color="#111" roughness={0.95} />
      </mesh>
      <mesh ref={w3} castShadow position={[1.2, 0.4, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.48, 0.48, 0.38, 10]} />
        <meshStandardMaterial color="#111" roughness={0.95} />
      </mesh>
      <pointLight position={[0.7, 0.8, -2.2]} intensity={2} distance={14} color="#ffffcc" />
      <pointLight position={[-0.7, 0.8, -2.2]} intensity={2} distance={14} color="#ffffcc" />
      {boostActive && <pointLight position={[0, 0.5, 2.2]} intensity={3} distance={5} color="#ff6600" />}
    </group>
  );
}

// ─── Mist ─────────────────────────────────────────────────────────────────────
function MistLayer() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    groupRef.current?.children.forEach((c, i) => {
      c.position.x += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.01;
      c.position.z += Math.cos(state.clock.elapsedTime * 0.2 + i * 0.7) * 0.008;
    });
  });
  const planes = useMemo(() => {
    const rand = seededRand(55);
    return Array.from({ length: 20 }, (_, i) => ({
      x: (rand() * 2 - 1) * TRACK_HALF * 0.9,
      z: (rand() * 2 - 1) * TRACK_HALF * 0.9,
      s: 8 + rand() * 14,
      key: i,
    }));
  }, []);

  return (
    <group ref={groupRef}>
      {planes.map((m) => (
        <mesh key={m.key} rotation={[-Math.PI / 2, 0, 0]} position={[m.x, 0.6, m.z]}>
          <planeGeometry args={[m.s, m.s]} />
          <meshStandardMaterial color="#c8e8d0" transparent opacity={0.07} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Birds ────────────────────────────────────────────────────────────────────
function Birds() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    groupRef.current?.children.forEach((bird, i) => {
      const r = 20 + i * 5;
      const sp = 0.4 + i * 0.07;
      bird.position.x = Math.sin(t * sp + i * 2.1) * r;
      bird.position.z = Math.cos(t * sp * 0.8 + i * 2.1) * r;
      bird.position.y = 18 + Math.sin(t * 1.5 + i) * 3;
      bird.rotation.y = Math.atan2(Math.cos(t * sp + i * 2.1), -Math.sin(t * sp * 0.8 + i * 2.1));
    });
  });
  return (
    <group ref={groupRef}>
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i}>
          <mesh><boxGeometry args={[0.8, 0.15, 0.35]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[-0.55, 0.12, 0]}><boxGeometry args={[0.5, 0.08, 0.6]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.55, 0.12, 0]}><boxGeometry args={[0.5, 0.08, 0.6]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Follow Camera ────────────────────────────────────────────────────────────
function FollowCamera({ posRef, angleRef }: { posRef: React.RefObject<THREE.Vector3>; angleRef: React.RefObject<number> }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 9, 20));
  useFrame((_, dt) => {
    const p = posRef.current;
    const angle = angleRef.current;
    const tx = p.x + Math.sin(angle) * 14;
    const tz = p.z + Math.cos(angle) * 14;
    const lp = 1 - Math.pow(0.01, dt);
    camPos.current.x += (tx - camPos.current.x) * lp;
    camPos.current.y += (9 - camPos.current.y) * lp;
    camPos.current.z += (tz - camPos.current.z) * lp;
    camera.position.copy(camPos.current);
    camera.lookAt(p.x, 1.5, p.z);
  });
  return null;
}

// ─── Scene (main game logic) ──────────────────────────────────────────────────
interface SceneProps extends GameProps {
  onHud: (state: HudState) => void;
}

function Scene({ onScore, onTime, onHealth, onGameOver, onHud }: SceneProps) {
  const posRef = useRef(new THREE.Vector3(0, 0, 10));
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const keys = useRef<Set<string>>(new Set());

  const healthRef = useRef(100);
  const ammoRef = useRef(0);
  const hasGunRef = useRef(false);
  const boostTimerRef = useRef(0);
  const shieldTimerRef = useRef(0);
  const fireTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const timeRef = useRef(ROUND_SECONDS);
  const lastSecRef = useRef(ROUND_SECONDS);
  const overRef = useRef(false);
  const hurtTimerRef = useRef(0);

  const sounds = useGameSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const cbs = useRef({ onScore, onTime, onHealth, onGameOver, onHud });
  cbs.current = { onScore, onTime, onHealth, onGameOver, onHud };

  // Static obstacles
  const obstacles = useMemo<Obstacle[]>(() => {
    const rand = seededRand(13);
    const types: Obstacle["type"][] = ["rock", "mud", "vine", "ruin"];
    const obs: Obstacle[] = [];
    for (let i = 0; i < 30; i++) {
      const type = types[Math.floor(rand() * types.length)]!;
      const x = (rand() * 2 - 1) * TRACK_HALF * 0.8;
      const z = (rand() * 2 - 1) * TRACK_HALF * 0.75;
      if (Math.abs(x) < 6 && Math.abs(z) < 12) continue;
      obs.push({ id: i, type, x, z, radius: type === "mud" ? 3.5 : type === "ruin" ? 2 : 1.5 });
    }
    return obs;
  }, []);

  const [powerUps, setPowerUps] = useState<PowerUp[]>(() => {
    const rand = seededRand(21);
    const types: PowerUp["type"][] = ["boost", "shield", "gun", "repair"];
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      type: types[i % types.length]!,
      x: (rand() * 2 - 1) * TRACK_HALF * 0.75,
      z: (rand() * 2 - 1) * TRACK_HALF * 0.75,
      collected: false,
    }));
  });
  const puRef = useRef(powerUps);
  puRef.current = powerUps;

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const nextBulletId = useRef(0);

  const [enemies, setEnemies] = useState<Enemy[]>(() =>
    Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2;
      return { id: i, x: Math.sin(a) * 30, z: Math.cos(a) * 30, angle: a + Math.PI, speed: ENEMY_SPEED_BASE + i * 1.5, health: 3, stunTimer: 0 };
    })
  );
  const enemiesRef = useRef(enemies);
  enemiesRef.current = enemies;
  const nextEnemyId = useRef(4);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, delta) => {
    if (overRef.current) return;
    const dt = Math.min(delta, 0.05);

    // Timer
    timeRef.current -= dt;
    const secs = Math.max(0, Math.ceil(timeRef.current));
    if (secs !== lastSecRef.current) { lastSecRef.current = secs; cbs.current.onTime(secs); }
    if (timeRef.current <= 0) {
      overRef.current = true;
      soundsRef.current.playGameOver();
      cbs.current.onGameOver();
      return;
    }

    if (hurtTimerRef.current > 0) hurtTimerRef.current -= dt;
    if (boostTimerRef.current > 0) boostTimerRef.current -= dt;
    if (shieldTimerRef.current > 0) shieldTimerRef.current -= dt;
    if (fireTimerRef.current > 0) fireTimerRef.current -= dt;

    const boosting = boostTimerRef.current > 0;
    const shielded = shieldTimerRef.current > 0;
    const sm = boosting ? 1.8 : 1;
    const K = keys.current;

    const accel = K.has("ArrowUp") || K.has("w") || K.has("W");
    const rev = K.has("ArrowDown") || K.has("s") || K.has("S");
    const left = K.has("ArrowLeft") || K.has("a") || K.has("A");
    const right = K.has("ArrowRight") || K.has("d") || K.has("D");

    if (accel) speedRef.current = Math.min(speedRef.current + dt * 30, PLAYER_SPEED * sm);
    else if (rev) speedRef.current = Math.max(speedRef.current - dt * 30, -PLAYER_SPEED * 0.5);
    else speedRef.current *= (1 - dt * 6);

    if (Math.abs(speedRef.current) > 0.5 && (left || right)) {
      const dir = left ? 1 : -1;
      const tr = PLAYER_TURN_SPEED * (Math.abs(speedRef.current) / PLAYER_SPEED) * sm;
      angleRef.current += dir * tr * dt;
    }

    const p = posRef.current;
    const [cx, cz] = clampToTrack(
      p.x - Math.sin(angleRef.current) * speedRef.current * dt,
      p.z - Math.cos(angleRef.current) * speedRef.current * dt,
    );
    p.x = cx; p.z = cz;

    // Obstacle collisions
    for (const obs of obstacles) {
      const r = obs.type === "mud" ? obs.radius * 0.7 : obs.radius + 1.2;
      if (collides(p.x, p.z, obs.x, obs.z, r)) {
        if (obs.type === "mud") {
          speedRef.current *= 0.3;
        } else {
          const dx = p.x - obs.x, dz = p.z - obs.z;
          const d = Math.sqrt(dx * dx + dz * dz) || 1;
          p.x = obs.x + (dx / d) * (r + 0.1);
          p.z = obs.z + (dz / d) * (r + 0.1);
          speedRef.current *= -0.3;
          if (hurtTimerRef.current <= 0 && !shielded) {
            healthRef.current = Math.max(0, healthRef.current - 8);
            hurtTimerRef.current = 0.5;
            cbs.current.onHealth(healthRef.current);
            cbs.current.onHud({ health: healthRef.current, ammo: ammoRef.current, hasGun: hasGunRef.current, boostActive: boosting, shieldActive: shielded });
            if (healthRef.current <= 0) { overRef.current = true; soundsRef.current.playGameOver(); cbs.current.onGameOver(); return; }
          }
        }
      }
    }

    // Power-up collection
    const pus = puRef.current;
    let puChanged = false;
    for (let i = 0; i < pus.length; i++) {
      const pu = pus[i]!;
      if (pu.collected) continue;
      if (collides(p.x, p.z, pu.x, pu.z, 2.5)) {
        pus[i] = { ...pu, collected: true };
        puChanged = true;
        soundsRef.current.playScore();
        scoreRef.current += scoreForPickup(pu.type);
        cbs.current.onScore(scoreRef.current);
        if (pu.type === "boost") boostTimerRef.current = 5;
        if (pu.type === "shield") shieldTimerRef.current = 6;
        if (pu.type === "gun") { hasGunRef.current = true; ammoRef.current = Math.min(ammoRef.current + 10, 20); }
        if (pu.type === "repair") { healthRef.current = Math.min(100, healthRef.current + 30); cbs.current.onHealth(healthRef.current); }
        cbs.current.onHud({ health: healthRef.current, ammo: ammoRef.current, hasGun: hasGunRef.current, boostActive: boostTimerRef.current > 0, shieldActive: shieldTimerRef.current > 0 });
        const [rx, rz] = randomPosition(p.x, p.z);
        setTimeout(() => {
          setPowerUps((prev) => prev.map((q) => q.id === pu.id ? { ...q, collected: false, x: rx, z: rz } : q));
        }, 5000);
      }
    }
    if (puChanged) setPowerUps([...pus]);

    // Fire
    if (K.has(" ") && hasGunRef.current && ammoRef.current > 0 && fireTimerRef.current <= 0) {
      fireTimerRef.current = 0.25;
      ammoRef.current--;
      if (ammoRef.current === 0) hasGunRef.current = false;
      cbs.current.onHud({ health: healthRef.current, ammo: ammoRef.current, hasGun: hasGunRef.current, boostActive: boostTimerRef.current > 0, shieldActive: shieldTimerRef.current > 0 });
      const b: Bullet = {
        id: nextBulletId.current++,
        x: p.x - Math.sin(angleRef.current) * 2.5,
        z: p.z - Math.cos(angleRef.current) * 2.5,
        vx: -Math.sin(angleRef.current) * BULLET_SPEED,
        vz: -Math.cos(angleRef.current) * BULLET_SPEED,
        life: BULLET_LIFE,
      };
      bulletsRef.current = [...bulletsRef.current, b];
      setBullets([...bulletsRef.current]);
    }

    // Update bullets
    let bChanged = false;
    const aliveBullets: Bullet[] = [];
    for (const b of bulletsRef.current) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.life -= dt;
      if (b.life <= 0 || Math.abs(b.x) > TRACK_HALF || Math.abs(b.z) > TRACK_HALF) { bChanged = true; continue; }
      aliveBullets.push(b);
    }
    if (bChanged) { bulletsRef.current = aliveBullets; setBullets([...aliveBullets]); }

    // Update enemies
    const enms = enemiesRef.current;
    let eChanged = false;
    const alive: Enemy[] = [];
    for (const en of enms) {
      let { x, z, angle, stunTimer, health: eHp } = en;

      // Bullet hit check
      let hit = false;
      for (const b of bulletsRef.current) {
        if (dist2(b.x, b.z, x, z) < 9) { hit = true; b.life = 0; break; }
      }
      if (hit) {
        eHp--;
        stunTimer = 0.8;
        eChanged = true;
        if (eHp <= 0) {
          scoreRef.current += scoreForKill();
          cbs.current.onScore(scoreRef.current);
          soundsRef.current.playScore();
          const [ex, ez] = randomPosition(p.x, p.z, TRACK_HALF, 20);
          const newEn: Enemy = { id: nextEnemyId.current++, x: ex, z: ez, angle: Math.random() * Math.PI * 2, speed: ENEMY_SPEED_BASE + Math.random() * 4, health: 3, stunTimer: 0 };
          setTimeout(() => setEnemies((prev) => [...prev, newEn]), 2000);
          continue;
        }
      }

      if (stunTimer > 0) { stunTimer -= dt; alive.push({ ...en, stunTimer, health: eHp }); eChanged = true; continue; }

      const dx = p.x - x, dz = p.z - z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      angle = lerpAngle(angle, Math.atan2(-dx, -dz), dt * 2.5);
      x += (dx / d) * en.speed * dt;
      z += (dz / d) * en.speed * dt;
      [x, z] = clampToTrack(x, z);

      if (d < 3.5 && hurtTimerRef.current <= 0 && !shielded) {
        healthRef.current = Math.max(0, healthRef.current - 12);
        hurtTimerRef.current = 0.8;
        cbs.current.onHealth(healthRef.current);
        cbs.current.onHud({ health: healthRef.current, ammo: ammoRef.current, hasGun: hasGunRef.current, boostActive: boostTimerRef.current > 0, shieldActive: shieldTimerRef.current > 0 });
        if (healthRef.current <= 0) { overRef.current = true; soundsRef.current.playGameOver(); cbs.current.onGameOver(); return; }
      }

      alive.push({ ...en, x, z, angle, stunTimer, health: eHp });
      eChanged = true;
    }
    if (eChanged) { enemiesRef.current = alive; setEnemies([...alive]); }

    // Emit HUD every frame for boost/shield timer changes
    cbs.current.onHud({ health: healthRef.current, ammo: ammoRef.current, hasGun: hasGunRef.current, boostActive: boostTimerRef.current > 0, shieldActive: shieldTimerRef.current > 0 });
  });

  return (
    <>
      <color attach="background" args={["#0d1f0a"]} />
      <fog attach="fog" args={["#1a3a0a", 30, 110]} />
      <ambientLight intensity={0.35} color="#a8d8a8" />
      <directionalLight
        position={[20, 40, 10]} intensity={2.2} color="#ffe8b0" castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5} shadow-camera-far={150}
        shadow-camera-left={-80} shadow-camera-right={80}
        shadow-camera-top={80} shadow-camera-bottom={-80}
      />
      <directionalLight position={[-15, 20, -20]} intensity={0.6} color="#80c080" />
      <pointLight position={[0, 5, -50]} intensity={4} distance={35} color="#ffd700" />
      <pointLight position={[-30, 3, 20]} intensity={2} distance={25} color="#40ff80" />
      <pointLight position={[35, 3, -15]} intensity={1.5} distance={20} color="#80ffaa" />

      <FollowCamera posRef={posRef} angleRef={angleRef} />
      <JungleFloor />
      <JungleTrees />
      <GroundCover />
      <AncientRuins />
      <MistLayer />
      <Birds />
      <Waterfall position={[-45, 0, -30]} />
      <Waterfall position={[42, 0, 15]} />
      <GoldenStatue />

      {obstacles.map((obs) => <ObstacleMesh key={obs.id} obs={obs} />)}
      {powerUps.filter((pu) => !pu.collected).map((pu) => <PowerUpMesh key={pu.id} pu={pu} />)}
      {bullets.map((b) => <BulletMesh key={b.id} bullet={b} />)}
      {enemies.map((en) => <EnemyCar key={en.id} enemy={en} />)}

      <PlayerCar posRef={posRef} angleRef={angleRef} shieldActive={shieldTimerRef.current > 0} boostActive={boostTimerRef.current > 0} />
    </>
  );
}

// ─── HUD overlay ──────────────────────────────────────────────────────────────
function Hud({ hud }: { hud: HudState }) {
  return (
    <div style={{
      position: "absolute", top: 8, left: 8, right: 8,
      display: "flex", gap: 8, alignItems: "flex-start",
      pointerEvents: "none", zIndex: 10, flexWrap: "wrap",
    }}>
      <div style={{
        background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "6px 12px",
        backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.12)", minWidth: 110,
      }}>
        <div style={{ fontSize: "0.62rem", color: "#86efac", fontWeight: 700, marginBottom: 3, letterSpacing: "0.1em" }}>HEALTH</div>
        <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4, transition: "width 0.15s",
            width: `${hud.health}%`,
            background: hud.health > 60 ? "#22c55e" : hud.health > 30 ? "#f59e0b" : "#ef4444",
          }} />
        </div>
      </div>
      {hud.hasGun && (
        <div style={{
          background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "6px 12px",
          backdropFilter: "blur(6px)", border: "1px solid rgba(248,113,113,0.4)",
        }}>
          <div style={{ fontSize: "0.62rem", color: "#fca5a5", fontWeight: 700, letterSpacing: "0.1em" }}>🔫 AMMO</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>{hud.ammo}</div>
        </div>
      )}
      {hud.boostActive && (
        <div style={{
          background: "rgba(34,211,238,0.2)", border: "1px solid #22d3ee",
          borderRadius: 8, padding: "4px 10px", fontSize: "0.7rem", color: "#22d3ee", fontWeight: 700,
          backdropFilter: "blur(4px)",
        }}>⚡ BOOST</div>
      )}
      {hud.shieldActive && (
        <div style={{
          background: "rgba(96,165,250,0.2)", border: "1px solid #60a5fa",
          borderRadius: 8, padding: "4px 10px", fontSize: "0.7rem", color: "#60a5fa", fontWeight: 700,
          backdropFilter: "blur(4px)",
        }}>🛡️ SHIELD</div>
      )}
    </div>
  );
}

// ─── Mobile Controls ──────────────────────────────────────────────────────────
type CtrlKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | " ";

function CtrlBtn({ label, ctrlKey, style }: { label: string; ctrlKey: CtrlKey; style?: React.CSSProperties }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent("keydown", { key: ctrlKey, bubbles: true })); }}
      onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent("keyup", { key: ctrlKey, bubbles: true })); }}
      onPointerCancel={() => window.dispatchEvent(new KeyboardEvent("keyup", { key: ctrlKey, bubbles: true }))}
      onPointerLeave={() => window.dispatchEvent(new KeyboardEvent("keyup", { key: ctrlKey, bubbles: true }))}
      style={{
        width: 52, height: 52, borderRadius: 12,
        background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 20,
        cursor: "pointer", touchAction: "none", userSelect: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...style,
      }}
      aria-label={label}
    >{label}</button>
  );
}

function MobileControls() {
  useEffect(() => () => {
    (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "] as CtrlKey[]).forEach((k) =>
      window.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }))
    );
  }, []);

  return (
    <div style={{
      position: "absolute", bottom: 12, left: 0, right: 0,
      display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      padding: "0 16px", pointerEvents: "none", zIndex: 20,
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 52px)", gridTemplateRows: "repeat(2, 52px)",
        gap: 4, pointerEvents: "all",
      }}>
        <span />
        <CtrlBtn label="▲" ctrlKey="ArrowUp" />
        <span />
        <CtrlBtn label="◀" ctrlKey="ArrowLeft" />
        <CtrlBtn label="▼" ctrlKey="ArrowDown" />
        <CtrlBtn label="▶" ctrlKey="ArrowRight" />
      </div>
      <div style={{ pointerEvents: "all" }}>
        <CtrlBtn label="🔫" ctrlKey=" " style={{ width: 64, height: 64, fontSize: 26, background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.6)" }} />
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function Game(props: GameProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768 || "ontouchstart" in window);
  const [hud, setHud] = useState<HudState>({ health: 100, ammo: 0, hasGun: false, boostActive: false, shieldActive: false });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        camera={{ position: [0, 9, 20], fov: 65, near: 0.1, far: 250 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Scene {...props} onHud={setHud} />
      </Canvas>
      <Hud hud={hud} />
      {isMobile && <MobileControls />}
    </div>
  );
}
