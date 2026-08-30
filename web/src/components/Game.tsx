import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

interface HudState {
  health: number;
  score: number;
  ammo: number;
  hasGun: boolean;
  boostActive: boolean;
  shieldActive: boolean;
  zone: number;
}

// ── seeded rng ────────────────────────────────────────────────────────────────
function mkRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Challenge zone definitions ────────────────────────────────────────────────
const ZONES = [
  { z: 60,  label: "🌊 River Crossing",  color: "#60a5fa" },
  { z: 30,  label: "🪨 Boulder Field",   color: "#a78bfa" },
  { z: 0,   label: "🌿 Vine Maze",       color: "#4ade80" },
  { z: -30, label: "💀 Enemy Camp",      color: "#f87171" },
  { z: -60, label: "🏛️ Temple Gates",    color: "#fbbf24" },
];

// ── Road ──────────────────────────────────────────────────────────────────────
function Road() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2d4a1e" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[TRACK_HALF_W * 2, 200]} />
        <meshStandardMaterial color="#5a4020" roughness={1} />
      </mesh>
      {([-TRACK_HALF_W + 0.5, TRACK_HALF_W - 0.5] as number[]).map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[x, 0.02, 0]}>
          <planeGeometry args={[0.5, 200]} />
          <meshStandardMaterial color="#e8c060" roughness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.02, 90 - i * 5]}>
          <planeGeometry args={[0.3, 2.5]} />
          <meshStandardMaterial color="#e8e8a0" roughness={0.8} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ── Trees lining the road ─────────────────────────────────────────────────────
function JungleSides() {
  const trees = useMemo(() => {
    const rand = mkRand(42);
    const arr: { x: number; z: number; s: number; rot: number }[] = [];
    for (let i = 0; i < 120; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (TRACK_HALF_W + 2 + rand() * 28);
      const z = -95 + rand() * 190;
      arr.push({ x, z, s: 0.6 + rand() * 1.4, rot: rand() * Math.PI * 2 });
    }
    return arr;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]} scale={[t.s, t.s, t.s]}>
          <mesh castShadow position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 5, 8]} />
            <meshStandardMaterial color="#3d2008" roughness={0.95} />
          </mesh>
          <mesh castShadow position={[0, 6, 0]}>
            <coneGeometry args={[3, 5, 8]} />
            <meshStandardMaterial color="#1a4a0a" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 8.5, 0]}>
            <coneGeometry args={[2.2, 4, 8]} />
            <meshStandardMaterial color="#1e5c0e" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 10.5, 0]}>
            <coneGeometry args={[1.4, 3, 7]} />
            <meshStandardMaterial color="#22660f" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Zone markers ──────────────────────────────────────────────────────────────
function ZoneMarkers() {
  return (
    <group>
      {ZONES.map((zone, i) => (
        <group key={i} position={[0, 0, zone.z]}>
          <mesh castShadow position={[-(TRACK_HALF_W + 1), 3, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 6, 8]} />
            <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.4} />
          </mesh>
          <mesh castShadow position={[TRACK_HALF_W + 1, 3, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 6, 8]} />
            <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 6.5, 0]}>
            <boxGeometry args={[TRACK_HALF_W * 2 + 2, 0.8, 0.15]} />
            <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.25} />
          </mesh>
          <pointLight position={[0, 5, 0]} intensity={2} distance={15} color={zone.color} />
        </group>
      ))}
    </group>
  );
}

// ── Golden Statue ─────────────────────────────────────────────────────────────
function GoldenStatue() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.5;
  });
  return (
    <group position={[0, 0, -88]}>
      {[0, 1, 2].map((s) => (
        <mesh key={s} castShadow receiveShadow position={[0, s * 0.7, 0]}>
          <cylinderGeometry args={[7 - s * 1.5, 7 - s * 1.5, 0.7, 12]} />
          <meshStandardMaterial color="#a07800" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 3, 0]}>
        <cylinderGeometry args={[3.5, 4, 4, 10]} />
        <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
      </mesh>
      <group ref={ref} position={[0, 5, 0]}>
        <mesh castShadow position={[0, 3, 0]}>
          <cylinderGeometry args={[1.2, 1.5, 5, 10]} />
          <meshStandardMaterial color="#ffd700" roughness={0.15} metalness={0.95} emissive="#ffa500" emissiveIntensity={0.2} />
        </mesh>
        <mesh castShadow position={[0, 6.5, 0]}>
          <sphereGeometry args={[1.5, 12, 10]} />
          <meshStandardMaterial color="#ffd700" roughness={0.15} metalness={0.95} emissive="#ffaa00" emissiveIntensity={0.25} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} castShadow position={[
            Math.sin((k / 6) * Math.PI * 2) * 1.3, 8.2,
            Math.cos((k / 6) * Math.PI * 2) * 1.3,
          ]}>
            <coneGeometry args={[0.22, 1.2, 5]} />
            <meshStandardMaterial color="#ffe066" roughness={0.1} metalness={1} emissive="#ffcc00" emissiveIntensity={0.4} />
          </mesh>
        ))}
        <mesh castShadow position={[-2.5, 4, 0]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.4, 0.5, 3.5, 8]} />
          <meshStandardMaterial color="#ffd700" roughness={0.15} metalness={0.95} />
        </mesh>
        <mesh castShadow position={[2.5, 4, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.4, 0.5, 3.5, 8]} />
          <meshStandardMaterial color="#ffd700" roughness={0.15} metalness={0.95} />
        </mesh>
      </group>
      <pointLight position={[0, 8, 0]} intensity={6} distance={45} color="#ffd700" />
      <pointLight position={[0, 8, 0]} intensity={3} distance={25} color="#ff8800" />
    </group>
  );
}

// ── Waterfall ─────────────────────────────────────────────────────────────────
function Waterfall({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (ref.current)
      (ref.current.material as THREE.MeshStandardMaterial).opacity =
        0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 5, 0]}>
        <boxGeometry args={[5, 10, 3]} />
        <meshStandardMaterial color="#2a3a1a" roughness={0.95} />
      </mesh>
      <mesh ref={ref} position={[0, 1.5, 1.6]}>
        <planeGeometry args={[3, 9]} />
        <meshStandardMaterial color="#60c8ff" transparent opacity={0.6} roughness={0.1} />
      </mesh>
      <pointLight position={[0, 3, 2]} intensity={1.5} distance={10} color="#60c8ff" />
    </group>
  );
}

// ── Obstacle mesh ─────────────────────────────────────────────────────────────
function ObstacleMesh({ obs }: { obs: Obstacle }) {
  if (obs.type === "rock") {
    return (
      <mesh castShadow receiveShadow position={[obs.x, obs.radius * 0.8, obs.z]}>
        <dodecahedronGeometry args={[obs.radius, 0]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.95} metalness={0.1} />
      </mesh>
    );
  }
  if (obs.type === "mud") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[obs.x, 0.06, obs.z]}>
        <circleGeometry args={[obs.radius, 14]} />
        <meshStandardMaterial color="#1a0c00" roughness={1} transparent opacity={0.92} />
      </mesh>
    );
  }
  if (obs.type === "vine") {
    return (
      <group position={[obs.x, 0, obs.z]}>
        <mesh castShadow position={[0, 3, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 6, 6]} />
          <meshStandardMaterial color="#2d6b10" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0.8, 2, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 4, 6]} />
          <meshStandardMaterial color="#3a8015" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-0.7, 2.5, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 5, 6]} />
          <meshStandardMaterial color="#2d6b10" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[obs.radius * 2, 3, obs.radius * 1.5]} />
        <meshStandardMaterial color="#4a4030" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[obs.radius * 2.1, 0.3, obs.radius * 1.6]} />
        <meshStandardMaterial color="#2d5a1a" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Power-up mesh ─────────────────────────────────────────────────────────────
const PU_COLOR: Record<PowerUp["type"], string> = {
  boost: "#22d3ee", shield: "#60a5fa", gun: "#f87171", repair: "#4ade80",
};

function PowerUpMesh({ pu }: { pu: PowerUp }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 2.5;
    ref.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
  });
  return (
    <group position={[pu.x, 0, pu.z]}>
      <mesh ref={ref} castShadow>
        <octahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          color={PU_COLOR[pu.type]} emissive={PU_COLOR[pu.type]}
          emissiveIntensity={0.7} roughness={0.2} metalness={0.5}
        />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={2} distance={7} color={PU_COLOR[pu.type]} />
    </group>
  );
}

// ── Bullet mesh ───────────────────────────────────────────────────────────────
function BulletMesh({ b }: { b: Bullet }) {
  return (
    <group position={[b.x, 1.0, b.z]}>
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2200" emissiveIntensity={2} />
      </mesh>
      <pointLight intensity={3} distance={5} color="#ff4400" />
    </group>
  );
}

// ── Enemy car ─────────────────────────────────────────────────────────────────
function EnemyCar({ enemy }: { enemy: Enemy }) {
  const ref    = useRef<THREE.Group>(null!);
  const wfl    = useRef<THREE.Mesh>(null!);
  const wfr    = useRef<THREE.Mesh>(null!);
  const wbl    = useRef<THREE.Mesh>(null!);
  const wbr    = useRef<THREE.Mesh>(null!);
  const eRef   = useRef(enemy);
  eRef.current = enemy;

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.set(eRef.current.x, 0, eRef.current.z);
    ref.current.rotation.y = eRef.current.angle;
    const spin = dt * 7;
    if (wfl.current) wfl.current.rotation.x += spin;
    if (wfr.current) wfr.current.rotation.x += spin;
    if (wbl.current) wbl.current.rotation.x += spin;
    if (wbr.current) wbr.current.rotation.x += spin;
  });

  const stunned = enemy.stunTimer > 0;
  return (
    <group ref={ref}>
      {/* Body */}
      <mesh castShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[2.0, 0.75, 3.6]} />
        <meshStandardMaterial color={stunned ? "#888" : "#c0392b"} roughness={0.35} metalness={0.5} />
      </mesh>
      {/* Cab */}
      <mesh castShadow position={[0, 1.3, 0.2]}>
        <boxGeometry args={[1.7, 0.7, 2.0]} />
        <meshStandardMaterial color={stunned ? "#666" : "#922b21"} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Windscreen */}
      <mesh position={[0, 1.3, -0.8]}>
        <boxGeometry args={[1.6, 0.55, 0.07]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.55} roughness={0.05} />
      </mesh>
      {/* Wheels */}
      {(
        [[-1.1, 0.38, 1.3], [1.1, 0.38, 1.3], [-1.1, 0.38, -1.3], [1.1, 0.38, -1.3]] as [number, number, number][]
      ).map(([wx, wy, wz], k) => {
        const refs = [wfl, wfr, wbl, wbr];
        return (
          <mesh key={k} ref={refs[k]} castShadow position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.32, 12]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        );
      })}
      <pointLight position={[0, 0.8, -2]} intensity={1.5} distance={10} color="#ffeeaa" />
    </group>
  );
}

// ── Player car ────────────────────────────────────────────────────────────────
function PlayerCar({
  posRef, angleRef, shieldActive, boostActive, carColor,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  angleRef: React.RefObject<number>;
  shieldActive: boolean;
  boostActive: boolean;
  carColor: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  const wfl = useRef<THREE.Mesh>(null!);
  const wfr = useRef<THREE.Mesh>(null!);
  const wbl = useRef<THREE.Mesh>(null!);
  const wbr = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.set(posRef.current.x, 0, posRef.current.z);
    ref.current.rotation.y = angleRef.current;
    const spin = dt * 8;
    if (wfl.current) wfl.current.rotation.x += spin;
    if (wfr.current) wfr.current.rotation.x += spin;
    if (wbl.current) wbl.current.rotation.x += spin;
    if (wbr.current) wbr.current.rotation.x += spin;
  });

  return (
    <group ref={ref}>
      {shieldActive && (
        <mesh>
          <sphereGeometry args={[3.2, 16, 12]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.18} roughness={0.1} wireframe />
        </mesh>
      )}
      {/* Body */}
      <mesh castShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[2.0, 0.75, 3.8]} />
        <meshStandardMaterial
          color={boostActive ? "#22d3ee" : carColor}
          emissive={boostActive ? "#0891b2" : "#000"}
          emissiveIntensity={boostActive ? 0.5 : 0}
          roughness={0.3} metalness={0.6}
        />
      </mesh>
      {/* Cab */}
      <mesh castShadow position={[0, 1.35, 0.3]}>
        <boxGeometry args={[1.7, 0.72, 2.2]} />
        <meshStandardMaterial color={carColor} roughness={0.35} metalness={0.5} />
      </mesh>
      {/* Windscreen */}
      <mesh position={[0, 1.35, -0.8]}>
        <boxGeometry args={[1.65, 0.58, 0.07]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.6} roughness={0.05} />
      </mesh>
      {/* Hood stripe */}
      <mesh position={[0, 1.04, -0.6]}>
        <boxGeometry args={[0.4, 0.02, 1.6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Wheels */}
      {(
        [[-1.1, 0.38, 1.5], [1.1, 0.38, 1.5], [-1.1, 0.38, -1.5], [1.1, 0.38, -1.5]] as [number, number, number][]
      ).map(([wx, wy, wz], k) => {
        const refs = [wfl, wfr, wbl, wbr];
        return (
          <mesh key={k} ref={refs[k]} castShadow position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.44, 0.44, 0.34, 12]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        );
      })}
      <pointLight position={[0.6, 0.8, -2.1]} intensity={2.5} distance={16} color="#ffffcc" />
      <pointLight position={[-0.6, 0.8, -2.1]} intensity={2.5} distance={16} color="#ffffcc" />
      {boostActive && <pointLight position={[0, 0.5, 2.1]} intensity={4} distance={6} color="#ff6600" />}
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
  const camPos = useRef(new THREE.Vector3(0, 8, 18));

  useFrame((_, dt) => {
    const p = posRef.current;
    const a = angleRef.current;
    const tx = p.x + Math.sin(a) * 13;
    const tz = p.z + Math.cos(a) * 13;
    const lp = 1 - Math.pow(0.02, dt);
    camPos.current.x += (tx - camPos.current.x) * lp;
    camPos.current.y += (8 - camPos.current.y) * lp;
    camPos.current.z += (tz - camPos.current.z) * lp;
    camera.position.copy(camPos.current);
    camera.lookAt(p.x, 1.2, p.z);
  });

  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
interface SceneProps extends GameProps {
  keysRef: React.RefObject<Set<string>>;
  onHud: (h: HudState) => void;
}

function Scene({ character, level, onScore, onHealth, onLevelComplete, onGameOver, keysRef, onHud }: SceneProps) {
  const posRef   = useRef(new THREE.Vector3(0, 0, 88));
  const angleRef = useRef(Math.PI);
  const speedRef = useRef(0);

  const healthRef      = useRef(100);
  const ammoRef        = useRef(0);
  const hasGunRef      = useRef(false);
  const boostTimerRef  = useRef(0);
  const shieldTimerRef = useRef(0);
  const fireTimerRef   = useRef(0);
  const scoreRef       = useRef(0);
  const overRef        = useRef(false);
  const hurtCoolRef    = useRef(0);

  const cbs = useRef({ onScore, onHealth, onLevelComplete, onGameOver, onHud });
  cbs.current = { onScore, onHealth, onLevelComplete, onGameOver, onHud };

  const obstacles = useMemo<Obstacle[]>(() => {
    const rand = mkRand(100 + level * 7);
    const types: Obstacle["type"][] = ["rock", "mud", "vine", "ruin"];
    const list: Obstacle[] = [];
    const count = 20 + level * 5;
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(rand() * types.length)]!;
      const x = (rand() * 2 - 1) * (TRACK_HALF_W - 1.5);
      const z = -80 + rand() * 160;
      if (z > 78 || z < -78) continue;
      if (ZONES.some(zo => Math.abs(z - zo.z) < 6 && Math.abs(x) < 8)) continue;
      const radius = type === "mud" ? 2.5 + rand() * 1.5 : 1.2 + rand() * 0.8;
      list.push({ id: i, type, x, z, radius });
    }
    return list;
  }, [level]);

  const enemiesRef  = useRef<Enemy[]>([]);
  const bulletsRef  = useRef<Bullet[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const nextId      = useRef(0);

  const [renderEnemies,  setRenderEnemies]  = useState<Enemy[]>([]);
  const [renderBullets,  setRenderBullets]  = useState<Bullet[]>([]);
  const [renderPowerUps, setRenderPowerUps] = useState<PowerUp[]>([]);

  useEffect(() => {
    const rand = mkRand(200 + level * 13);
    const enemyCount = 3 + level * 2;
    enemiesRef.current = Array.from({ length: enemyCount }, (_, _i) => {
      const z = -70 + rand() * 140;
      const x = (rand() * 2 - 1) * (TRACK_HALF_W - 2);
      return {
        id: nextId.current++,
        x, z,
        angle: rand() * Math.PI * 2,
        speed: ENEMY_BASE_SPEED + level * 1.5 + rand() * 3,
        health: 2 + level,
        stunTimer: 0,
      };
    });
    const puTypes: PowerUp["type"][] = ["boost", "shield", "gun", "repair"];
    powerUpsRef.current = Array.from({ length: 10 + level * 2 }, (_, i) => ({
      id: nextId.current++,
      type: puTypes[i % puTypes.length]!,
      x: (rand() * 2 - 1) * (TRACK_HALF_W - 2),
      z: -80 + rand() * 160,
      collected: false,
    }));
    setRenderEnemies([...enemiesRef.current]);
    setRenderPowerUps([...powerUpsRef.current]);
  }, [level]);

  const frameCount = useRef(0);

  useFrame((_, delta) => {
    if (overRef.current) return;
    const dt = Math.min(delta, 0.05);
    const keys = keysRef.current;

    // ── player input ──
    const fwd   = keys.has("ArrowUp")    || keys.has("w") || keys.has("W");
    const back  = keys.has("ArrowDown")  || keys.has("s") || keys.has("S");
    const left  = keys.has("ArrowLeft")  || keys.has("a") || keys.has("A");
    const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
    const fire  = keys.has(" ");

    const boosting = boostTimerRef.current > 0;
    const maxSpd = boosting ? PLAYER_MAX_SPEED * 1.7 : PLAYER_MAX_SPEED;

    if (fwd) {
      speedRef.current = Math.min(speedRef.current + PLAYER_ACCEL * dt, maxSpd);
    } else if (back) {
      speedRef.current = Math.max(speedRef.current - PLAYER_BRAKE * dt, -maxSpd * 0.45);
    } else {
      const friction = 14;
      if (speedRef.current > 0) speedRef.current = Math.max(0, speedRef.current - friction * dt);
      else speedRef.current = Math.min(0, speedRef.current + friction * dt);
    }

    if (Math.abs(speedRef.current) > 0.4) {
      const dir = speedRef.current > 0 ? 1 : -1;
      if (left)  angleRef.current += PLAYER_TURN * dt * dir;
      if (right) angleRef.current -= PLAYER_TURN * dt * dir;
    }

    const p = posRef.current;
    p.x -= Math.sin(angleRef.current) * speedRef.current * dt;
    p.z -= Math.cos(angleRef.current) * speedRef.current * dt;
    p.x = clamp(p.x, -TRACK_HALF_W + 1.2, TRACK_HALF_W - 1.2);
    p.z = clamp(p.z, -92, 92);

    // ── timers ──
    if (boostTimerRef.current  > 0) boostTimerRef.current  -= dt;
    if (shieldTimerRef.current > 0) shieldTimerRef.current -= dt;
    if (fireTimerRef.current   > 0) fireTimerRef.current   -= dt;
    if (hurtCoolRef.current    > 0) hurtCoolRef.current    -= dt;

    // ── shoot ──
    if (fire && hasGunRef.current && ammoRef.current > 0 && fireTimerRef.current <= 0) {
      fireTimerRef.current = 0.22;
      ammoRef.current -= 1;
      if (ammoRef.current <= 0) hasGunRef.current = false;
      bulletsRef.current.push({
        id: nextId.current++,
        x: p.x - Math.sin(angleRef.current) * 2.5,
        z: p.z - Math.cos(angleRef.current) * 2.5,
        vx: -Math.sin(angleRef.current) * BULLET_SPEED,
        vz: -Math.cos(angleRef.current) * BULLET_SPEED,
        life: BULLET_LIFE,
      });
    }

    // ── bullets ──
    bulletsRef.current = bulletsRef.current
      .map(b => ({ ...b, x: b.x + b.vx * dt, z: b.z + b.vz * dt, life: b.life - dt }))
      .filter(b => b.life > 0);

    // ── bullet vs enemy ──
    let scored = false;
    bulletsRef.current = bulletsRef.current.filter(b => {
      let hit = false;
      enemiesRef.current = enemiesRef.current.map(e => {
        if (hit) return e;
        if (dist2(b.x, b.z, e.x, e.z) < 5) {
          hit = true;
          const nh = e.health - 1;
          if (nh <= 0) {
            scoreRef.current += scoreForKill();
            scored = true;
            return { ...e, health: 0 };
          }
          return { ...e, health: nh, stunTimer: 1.5 };
        }
        return e;
      });
      return !hit;
    });
    enemiesRef.current = enemiesRef.current.filter(e => e.health > 0);

    // ── enemies chase player ──
    enemiesRef.current = enemiesRef.current.map(e => {
      if (e.stunTimer > 0) return { ...e, stunTimer: e.stunTimer - dt };
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const targetAngle = Math.atan2(-dx, -dz);
      const newAngle = lerpAngle(e.angle, targetAngle, 3 * dt);
      return {
        ...e,
        angle: newAngle,
        x: e.x - Math.sin(newAngle) * e.speed * dt,
        z: e.z - Math.cos(newAngle) * e.speed * dt,
      };
    });

    // ── enemy hits player ──
    if (shieldTimerRef.current <= 0 && hurtCoolRef.current <= 0) {
      for (const e of enemiesRef.current) {
        if (dist2(p.x, p.z, e.x, e.z) < 10) {
          healthRef.current = Math.max(0, healthRef.current - 15);
          hurtCoolRef.current = 0.9;
          cbs.current.onHealth(healthRef.current);
          if (healthRef.current <= 0) {
            overRef.current = true;
            cbs.current.onGameOver(scoreRef.current);
          }
          break;
        }
      }
    }

    // ── obstacle collision ──
    for (const obs of obstacles) {
      if (obs.type === "mud") {
        if (dist2(p.x, p.z, obs.x, obs.z) < obs.radius * obs.radius) {
          speedRef.current *= 0.93;
        }
      } else {
        const r = obs.radius + 1.3;
        if (dist2(p.x, p.z, obs.x, obs.z) < r * r) {
          const dx = p.x - obs.x;
          const dz = p.z - obs.z;
          const d = Math.sqrt(dx * dx + dz * dz) || 1;
          p.x = obs.x + (dx / d) * r;
          p.z = obs.z + (dz / d) * r;
          speedRef.current *= 0.35;
        }
      }
    }

    // ── power-up pickup ──
    powerUpsRef.current = powerUpsRef.current.map(pu => {
      if (pu.collected) return pu;
      if (dist2(p.x, p.z, pu.x, pu.z) < 9) {
        scoreRef.current += scoreForPickup(pu.type);
        scored = true;
        if (pu.type === "boost")  boostTimerRef.current  = 5;
        if (pu.type === "shield") shieldTimerRef.current = 6;
        if (pu.type === "gun")    { hasGunRef.current = true; ammoRef.current = Math.min(ammoRef.current + 10, 30); }
        if (pu.type === "repair") { healthRef.current = Math.min(100, healthRef.current + 30); cbs.current.onHealth(healthRef.current); }
        return { ...pu, collected: true };
      }
      return pu;
    });

    // ── reached statue ──
    if (p.z < -85) {
      overRef.current = true;
      cbs.current.onLevelComplete(scoreRef.current);
    }

    // ── sync HUD every 4 frames ──
    frameCount.current++;
    if (frameCount.current % 4 === 0) {
      if (scored) cbs.current.onScore(scoreRef.current);
      const zIdx = ZONES.reduce((best, zone, i) => p.z <= zone.z + 15 ? i : best, 0);
      cbs.current.onHud({
        health: healthRef.current,
        score: scoreRef.current,
        ammo: ammoRef.current,
        hasGun: hasGunRef.current,
        boostActive: boostTimerRef.current > 0,
        shieldActive: shieldTimerRef.current > 0,
        zone: zIdx,
      });
      setRenderEnemies([...enemiesRef.current]);
      setRenderBullets([...bulletsRef.current]);
      setRenderPowerUps([...powerUpsRef.current]);
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#b8d8a0" />
      <directionalLight
        castShadow position={[20, 40, 20]} intensity={1.4} color="#fff8e0"
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-near={0.5} shadow-camera-far={200}
        shadow-camera-left={-80} shadow-camera-right={80}
        shadow-camera-top={120} shadow-camera-bottom={-120}
      />
      <directionalLight position={[-15, 20, -30]} intensity={0.4} color="#90c8ff" />
      <fog attach="fog" args={["#1a3a10", 60, 180]} />

      <Road />
      <JungleSides />
      <ZoneMarkers />
      <GoldenStatue />
      <Waterfall x={-(TRACK_HALF_W + 6)} z={60} />
      <Waterfall x={TRACK_HALF_W + 6} z={60} />

      {obstacles.map(obs => <ObstacleMesh key={obs.id} obs={obs} />)}
      {renderPowerUps.filter(pu => !pu.collected).map(pu => <PowerUpMesh key={pu.id} pu={pu} />)}
      {renderBullets.map(b => <BulletMesh key={b.id} b={b} />)}
      {renderEnemies.map(e => <EnemyCar key={e.id} enemy={e} />)}

      <PlayerCar
        posRef={posRef}
        angleRef={angleRef}
        shieldActive={boostTimerRef.current <= 0}
        boostActive={boostTimerRef.current > 0}
        carColor={character.carColor}
      />
      <FollowCamera posRef={posRef} angleRef={angleRef} />
    </>
  );
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function HUD({ hud, level }: { hud: HudState; level: number }) {
  const zoneInfo = ZONES[hud.zone];
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* HP bar */}
        <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "6px 12px", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ color: "#aaa", fontSize: "0.62rem", marginBottom: 2 }}>HP</div>
          <div style={{ width: 88, height: 8, background: "#333", borderRadius: 4 }}>
            <div style={{
              width: `${hud.health}%`, height: "100%", borderRadius: 4,
              background: hud.health > 60 ? "#4ade80" : hud.health > 30 ? "#fbbf24" : "#f87171",
              transition: "width 0.2s",
            }} />
          </div>
        </div>
        {/* Score */}
        <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "6px 12px", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fbbf24", fontWeight: 700, fontSize: "1rem" }}>
          {hud.score} pts
        </div>
        {/* Level */}
        <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "6px 12px", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)", color: "#86efac", fontWeight: 700, fontSize: "0.85rem" }}>
          Lvl {level + 1}
        </div>
        {hud.boostActive && <div style={{ background: "rgba(34,211,238,0.25)", borderRadius: 10, padding: "6px 10px", border: "1px solid #22d3ee", color: "#22d3ee", fontWeight: 700, fontSize: "0.8rem" }}>⚡ BOOST</div>}
        {hud.shieldActive && <div style={{ background: "rgba(96,165,250,0.25)", borderRadius: 10, padding: "6px 10px", border: "1px solid #60a5fa", color: "#60a5fa", fontWeight: 700, fontSize: "0.8rem" }}>🛡️ SHIELD</div>}
        {hud.hasGun && <div style={{ background: "rgba(248,113,113,0.25)", borderRadius: 10, padding: "6px 10px", border: "1px solid #f87171", color: "#f87171", fontWeight: 700, fontSize: "0.8rem" }}>🔫 {hud.ammo}</div>}
      </div>

      {zoneInfo && (
        <div style={{ alignSelf: "center", background: "rgba(0,0,0,0.65)", borderRadius: 12, padding: "8px 20px", border: `1px solid ${zoneInfo.color}`, color: zoneInfo.color, fontWeight: 700, fontSize: "0.9rem", backdropFilter: "blur(6px)" }}>
          {zoneInfo.label}
        </div>
      )}

      <div style={{ alignSelf: "center", background: "rgba(0,0,0,0.5)", borderRadius: 10, padding: "5px 14px", color: "rgba(255,255,255,0.45)", fontSize: "0.68rem" }}>
        WASD / Arrows · Space to shoot · Reach the golden statue! 🏛️
      </div>
    </div>
  );
}

// ── Touch controls ────────────────────────────────────────────────────────────
function TouchControls({ keysRef }: { keysRef: React.RefObject<Set<string>> }) {
  const press   = useCallback((k: string) => keysRef.current.add(k),    [keysRef]);
  const release = useCallback((k: string) => keysRef.current.delete(k), [keysRef]);

  const Btn = ({ label, k, style }: { label: string; k: string; style?: React.CSSProperties }) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); press(k); }}
      onPointerUp={() => release(k)}
      onPointerLeave={() => release(k)}
      style={{
        width: 54, height: 54, borderRadius: 12,
        background: "rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.3)",
        color: "#fff", fontSize: "1.3rem", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none", touchAction: "none",
        ...style,
      }}
    >{label}</button>
  );

  return (
    <div style={{
      position: "absolute", bottom: 20, left: 0, right: 0,
      display: "flex", justifyContent: "space-between", padding: "0 16px",
      pointerEvents: "none",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, pointerEvents: "all" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Btn label="▲" k="ArrowUp" />
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <Btn label="◀" k="ArrowLeft" />
          <Btn label="▼" k="ArrowDown" />
          <Btn label="▶" k="ArrowRight" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", pointerEvents: "all" }}>
        <Btn label="🔫" k=" " style={{ background: "rgba(200,40,40,0.6)", border: "2px solid #f87171", width: 62, height: 62, fontSize: "1.5rem" }} />
      </div>
    </div>
  );
}

// ── Game (exported) ───────────────────────────────────────────────────────────
export function Game(props: GameProps) {
  const [hud, setHud] = useState<HudState>({
    health: 100, score: 0, ammo: 0, hasGun: false,
    boostActive: false, shieldActive: false, zone: 0,
  });
  const keysRef = useRef<Set<string>>(new Set());

  // Also hook keyboard here so touch + keyboard both work via same ref
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        camera={{ fov: 65, near: 0.5, far: 300, position: [0, 8, 18] }}
        style={{ width: "100%", height: "100%", background: "#1a3a10" }}
      >
        <Scene {...props} keysRef={keysRef} onHud={setHud} />
      </Canvas>
      <HUD hud={hud} level={props.level} />
      <TouchControls keysRef={keysRef} />
    </div>
  );
}
