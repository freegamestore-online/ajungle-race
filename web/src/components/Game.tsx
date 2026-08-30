import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PowerUp, Obstacle, Bullet, Enemy, Particle } from "../types";
import {
  TRACK_HALF,
  PLAYER_SPEED,
  PLAYER_TURN_SPEED,
  ROUND_SECONDS,
  BULLET_SPEED,
  BULLET_LIFE,
  ENEMY_SPEED_BASE,
  clamp,
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
  onGameOver: () => void;
}

// ─── Jungle Tree ──────────────────────────────────────────────────────────────
function JungleTree({ x, z, scale = 1, variant = 0 }: { x: number; z: number; scale?: number; variant?: number }) {
  const leafColors = ["#1a5c1a", "#2d7a2d", "#1e6b3a"];
  const leafColor = leafColors[variant % 3] ?? "#1a5c1a";
  const h = 4 + (variant % 3) * 1.5;
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.45, h * 0.8, 7]} />
        <meshStandardMaterial color="#5D3A1A" roughness={0.9} />
      </mesh>
      <mesh position={[0, h * 0.82, 0]} castShadow>
        <coneGeometry args={[2.2, h * 0.6, 7]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, h * 1.05, 0]} castShadow>
        <coneGeometry args={[1.5, h * 0.45, 6]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, h * 1.22, 0]} castShadow>
        <coneGeometry args={[0.9, h * 0.3, 6]} />
        <meshStandardMaterial color="#3a8a3a" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── Golden Statue ────────────────────────────────────────────────────────────
function GoldenStatue() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
    }
  });
  return (
    <group ref={groupRef} position={[0, 0, -45]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 3, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[6, 1, 6]} />
        <meshStandardMaterial color="#C5A028" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.6, 5, 8]} />
        <meshStandardMaterial color="#FFD700" roughness={0.15} metalness={0.9} emissive="#7a5a00" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 10.5, 0]} castShadow>
        <sphereGeometry args={[1.4, 12, 12]} />
        <meshStandardMaterial color="#FFD700" roughness={0.15} metalness={0.9} emissive="#7a5a00" emissiveIntensity={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 1.1, 12, Math.sin((i / 5) * Math.PI * 2) * 1.1]} castShadow>
          <coneGeometry args={[0.2, 1.2, 5]} />
          <meshStandardMaterial color="#FFD700" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}
      <mesh position={[-3.5, 8, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.35, 0.25, 4, 6]} />
        <meshStandardMaterial color="#FFD700" roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh position={[3.5, 8, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.35, 0.25, 4, 6]} />
        <meshStandardMaterial color="#FFD700" roughness={0.15} metalness={0.9} />
      </mesh>
      {[-2, -1, 0, 1, 2].map((i) => (
        <mesh key={i} position={[i * 1.2, 5 + Math.abs(i) * 0.3, 1.7]} castShadow>
          <torusGeometry args={[0.4, 0.08, 6, 8]} />
          <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-0.45, 10.7, 1.1]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.45, 10.7, 1.1]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 8, 0]} color="#FFD700" intensity={3} distance={20} />
    </group>
  );
}

// ─── Waterfall ────────────────────────────────────────────────────────────────
function Waterfall({ x, z }: { x: number; z: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 6, -1]} castShadow>
        <boxGeometry args={[5, 12, 2]} />
        <meshStandardMaterial color="#4a3728" roughness={0.95} />
      </mesh>
      <mesh ref={meshRef} position={[0, 4, 0]}>
        <planeGeometry args={[2.5, 10]} />
        <meshStandardMaterial color="#4fc3f7" emissive="#29b6f6" emissiveIntensity={0.3} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 12]} />
        <meshStandardMaterial color="#1565c0" transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 3, 1]} color="#4fc3f7" intensity={1.5} distance={10} />
    </group>
  );
}

// ─── Rock Obstacle ────────────────────────────────────────────────────────────
function Rock({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#6b6b6b" roughness={0.95} />
      </mesh>
      <mesh position={[0.5, 0.4, 0.3]} castShadow>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Mud Patch ────────────────────────────────────────────────────────────────
function MudPatch({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <ellipseGeometry args={[2.5, 1.8, 10]} />
      <meshStandardMaterial color="#4a3220" roughness={1} />
    </mesh>
  );
}

// ─── Ruin Column ─────────────────────────────────────────────────────────────
function RuinColumn({ x, z, tilt = 0 }: { x: number; z: number; tilt?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[tilt, 0, tilt * 0.5]}>
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.65, 5, 8]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.4, 0.4, 1.4]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Vine Arch ────────────────────────────────────────────────────────────────
function VineArch({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[-2.5, 3, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 6, 6]} />
        <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
      </mesh>
      <mesh position={[2.5, 3, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 6, 6]} />
        <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[2.5, 0.18, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1e4010" roughness={0.9} />
      </mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((ox) => (
        <mesh key={ox} position={[ox, 4.5, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.04, 3 + Math.abs(ox) * 0.4, 4]} />
          <meshStandardMaterial color="#3a7a1a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Player Car ──────────────────────────────────────────────────────────────
function PlayerCar({
  posRef,
  angleRef,
  shieldActiveRef,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  angleRef: React.RefObject<number>;
  shieldActiveRef: React.RefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const shieldMeshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = posRef.current;
    groupRef.current.position.set(p.x, 0.6, p.z);
    groupRef.current.rotation.y = angleRef.current;
    if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = shieldActiveRef.current;
      shieldMeshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 0.7, 3.2]} />
        <meshStandardMaterial color="#c0392b" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Cab */}
      <mesh position={[0, 1.05, 0.2]} castShadow>
        <boxGeometry args={[1.5, 0.5, 1.8]} />
        <meshStandardMaterial color="#922b21" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.1, -0.6]}>
        <boxGeometry args={[1.4, 0.4, 0.08]} />
        <meshStandardMaterial color="#85c1e9" transparent opacity={0.6} metalness={0.2} />
      </mesh>
      {/* Wheels */}
      {([-1, 1] as const).map((side) =>
        ([-1.1, 1.1] as const).map((fwd) => (
          <mesh key={`w${side}${fwd}`} position={[side * 1.0, 0.32, fwd * 1.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 10]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        ))
      )}
      {/* Headlights */}
      <mesh position={[-0.5, 0.7, -1.65]}>
        <boxGeometry args={[0.3, 0.18, 0.06]} />
        <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.5, 0.7, -1.65]}>
        <boxGeometry args={[0.3, 0.18, 0.06]} />
        <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={2} />
      </mesh>
      {/* Shield bubble */}
      <mesh ref={shieldMeshRef} visible={false}>
        <sphereGeometry args={[2.4, 16, 16]} />
        <meshStandardMaterial color="#00bfff" transparent opacity={0.22} side={THREE.DoubleSide} emissive="#00bfff" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 0.8, -2]} color="#fffde7" intensity={2} distance={12} />
    </group>
  );
}

// ─── Enemy Car ────────────────────────────────────────────────────────────────
function EnemyCar({ enemy }: { enemy: Enemy }) {
  const groupRef = useRef<THREE.Group>(null!);
  const prevAngle = useRef(enemy.angle);

  useFrame(() => {
    if (!groupRef.current) return;
    prevAngle.current = lerpAngle(prevAngle.current, enemy.angle, 0.15);
    groupRef.current.position.set(enemy.x, 0.6, enemy.z);
    groupRef.current.rotation.y = prevAngle.current;
  });

  const hp = clamp(enemy.health / 3, 0, 1);
  const col = new THREE.Color().setHSL(hp * 0.33, 0.9, 0.4);

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 0.7, 3.2]} />
        <meshStandardMaterial color={col} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.05, 0.2]} castShadow>
        <boxGeometry args={[1.5, 0.5, 1.8]} />
        <meshStandardMaterial color={col} roughness={0.3} metalness={0.5} />
      </mesh>
      {([-1, 1] as const).map((side) =>
        ([-1.1, 1.1] as const).map((fwd) => (
          <mesh key={`ew${side}${fwd}`} position={[side * 1.0, 0.32, fwd * 1.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 10]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        ))
      )}
      <pointLight position={[0, 1, -1.8]} color="#ff2200" intensity={1.2} distance={6} />
    </group>
  );
}

// ─── Power-Up Mesh ────────────────────────────────────────────────────────────
const PU_COLORS: Record<string, string> = {
  boost: "#ff9800",
  shield: "#00bfff",
  gun: "#e74c3c",
  repair: "#2ecc71",
};

function PowerUpMesh({ pu }: { pu: PowerUp }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const color = PU_COLORS[pu.type] ?? "#ffffff";

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.03;
    meshRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 2 + pu.id) * 0.25;
  });

  return (
    <group position={[pu.x, 0, pu.z]}>
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.4} roughness={0.2} />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={5} position={[0, 1.2, 0]} />
    </group>
  );
}

// ─── Bullet Mesh ─────────────────────────────────────────────────────────────
function BulletMesh({ bullet }: { bullet: Bullet }) {
  return (
    <group position={[bullet.x, 1.2, bullet.z]}>
      <mesh>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={2} />
      </mesh>
      <pointLight color="#ff6600" intensity={1.5} distance={4} />
    </group>
  );
}

// ─── Particle Mesh ───────────────────────────────────────────────────────────
function ParticleMesh({ particle }: { particle: Particle }) {
  const alpha = clamp(particle.life / particle.maxLife, 0, 1);
  return (
    <mesh position={[particle.x, particle.y, particle.z]}>
      <sphereGeometry args={[0.12 * alpha, 4, 4]} />
      <meshStandardMaterial color={particle.color} emissive={particle.color} emissiveIntensity={1.5} transparent opacity={alpha} />
    </mesh>
  );
}

// ─── Mist Cloud ──────────────────────────────────────────────────────────────
function MistCloud({ x, z, idx }: { x: number; z: number; idx: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * 0.3 + idx;
    meshRef.current.position.x = x + Math.sin(t) * 1.5;
    meshRef.current.position.z = z + Math.cos(t * 0.7) * 1.5;
    meshRef.current.position.y = 1.2 + Math.sin(t * 0.5) * 0.4;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.07 + Math.sin(t * 0.8) * 0.03;
  });
  return (
    <mesh ref={meshRef} position={[x, 1.2, z]}>
      <sphereGeometry args={[3.5 + (idx % 3), 6, 6]} />
      <meshStandardMaterial color="#c8e6f0" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ─── Bird ────────────────────────────────────────────────────────────────────
function Bird({ idx }: { idx: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const baseAngle = (idx / 5) * Math.PI * 2;
  const radius = 25 + idx * 3;
  const height = 18 + idx * 2;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * 0.4 + baseAngle;
    groupRef.current.position.set(Math.cos(t) * radius, height, Math.sin(t) * radius);
    groupRef.current.rotation.y = -t + Math.PI / 2;
    const wing = state.clock.elapsedTime * 6;
    const c0 = groupRef.current.children[0];
    const c1 = groupRef.current.children[1];
    if (c0) c0.rotation.z = Math.sin(wing) * 0.4;
    if (c1) c1.rotation.z = -Math.sin(wing) * 0.4;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[-0.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.08, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.08, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.12, 0.5]} />
        <meshStandardMaterial color="#2c2c4e" />
      </mesh>
    </group>
  );
}

// ─── Ground ──────────────────────────────────────────────────────────────────
function JungleGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[TRACK_HALF * 2, TRACK_HALF * 2, 20, 20]} />
        <meshStandardMaterial color="#2d5a1b" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[14, TRACK_HALF * 2]} />
        <meshStandardMaterial color="#7a5c3a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[TRACK_HALF * 2, 14]} />
        <meshStandardMaterial color="#7a5c3a" roughness={1} />
      </mesh>
    </group>
  );
}

// ─── Follow Camera ────────────────────────────────────────────────────────────
function FollowCamera({ posRef, angleRef }: { posRef: React.RefObject<THREE.Vector3>; angleRef: React.RefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = posRef.current;
    const ang = angleRef.current;
    const tx = p.x + Math.sin(ang) * 12;
    const tz = p.z + Math.cos(ang) * 12;
    camera.position.x += (tx - camera.position.x) * 0.1;
    camera.position.z += (tz - camera.position.z) * 0.1;
    camera.position.y += (7 - camera.position.y) * 0.1;
    camera.lookAt(p.x, 1, p.z);
  });
  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
interface SceneCallbacks {
  onHealth: (h: number) => void;
  onShield: (v: boolean) => void;
  onGun: (v: boolean) => void;
  onBoost: (v: boolean) => void;
}

function Scene({ onScore, onTime, onGameOver, onHealth, onShield, onGun, onBoost }: GameProps & SceneCallbacks) {
  const posRef = useRef(new THREE.Vector3(0, 0.6, 10));
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const keys = useRef<Set<string>>(new Set());
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const timeRef = useRef(ROUND_SECONDS);
  const lastSecRef = useRef(ROUND_SECONDS);
  const shieldActiveRef = useRef(false);
  const shieldTimerRef = useRef(0);
  const boostTimerRef = useRef(0);
  const hasGunRef = useRef(false);
  const gunTimerRef = useRef(0);
  const healthRef = useRef(3);
  const nextIdRef = useRef(100);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shootCoolRef = useRef(0);

  const cbs = useRef({ onScore, onTime, onGameOver, onHealth, onShield, onGun, onBoost });
  cbs.current = { onScore, onTime, onGameOver, onHealth, onShield, onGun, onBoost };

  const obstacles = useMemo<Obstacle[]>(() => {
    const types: Obstacle["type"][] = ["rock", "mud", "vine", "ruin"];
    const positions: [number, number][] = [
      [-8, -15], [8, -15], [-15, 0], [15, 0], [-8, 15], [8, 15],
      [-20, -25], [20, -25], [-20, 25], [20, 25],
      [-5, -35], [5, -35], [-5, 35], [5, 35],
      [-25, -10], [25, -10], [-25, 10], [25, 10],
      [-30, 0], [30, 0], [0, -40], [0, 40],
    ];
    return positions.map(([x, z], i) => ({
      id: i,
      type: types[i % 4]!,
      x, z,
      radius: types[i % 4] === "mud" ? 2.5 : 1.8,
    }));
  }, []);

  const initPowerUps = useMemo<PowerUp[]>(() => {
    const types: PowerUp["type"][] = ["boost", "shield", "gun", "repair"];
    const spots: [number, number][] = [
      [-10, -20], [10, -20], [-10, 20], [10, 20],
      [0, -30], [0, 30], [-25, 0], [25, 0],
    ];
    return spots.map(([x, z], i) => ({ id: i, type: types[i % 4]!, x, z, collected: false }));
  }, []);

  const [powerUps, setPowerUps] = useState<PowerUp[]>(initPowerUps);
  const powerUpsRef = useRef<PowerUp[]>(initPowerUps);

  const initEnemies = useMemo<Enemy[]>(() => [
    { id: 0, x: -20, z: -20, angle: 0, speed: ENEMY_SPEED_BASE, health: 3, stunTimer: 0 },
    { id: 1, x: 20, z: -20, angle: Math.PI, speed: ENEMY_SPEED_BASE * 1.2, health: 3, stunTimer: 0 },
    { id: 2, x: -20, z: 20, angle: Math.PI / 2, speed: ENEMY_SPEED_BASE * 0.9, health: 3, stunTimer: 0 },
    { id: 3, x: 20, z: 20, angle: -Math.PI / 2, speed: ENEMY_SPEED_BASE * 1.1, health: 3, stunTimer: 0 },
  ], []);

  const [enemies, setEnemies] = useState<Enemy[]>(initEnemies);
  const enemiesRef = useRef<Enemy[]>(initEnemies);

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const trees = useMemo(() => {
    const t: { x: number; z: number; scale: number; variant: number }[] = [];
    let s = 42;
    const rand = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 80; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 18 + rand() * 38;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (Math.abs(x) < 9 && Math.abs(z) < 9) continue;
      t.push({ x, z, scale: 0.7 + rand() * 0.9, variant: Math.floor(rand() * 9) });
    }
    return t;
  }, []);

  const mistPositions = useMemo<[number, number][]>(() =>
    Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      const r = 12 + (i % 5) * 6;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key);
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  function spawnParticles(x: number, z: number, color: string, count = 6) {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: nextIdRef.current++,
        x, y: 1, z,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5 + 2,
        vz: (Math.random() - 0.5) * 8,
        life: 0.6, maxLife: 0.6,
        color,
      });
    }
  }

  useFrame((_, delta) => {
    if (overRef.current) return;
    const dt = Math.min(delta, 0.05);

    // Timer
    timeRef.current -= dt;
    const secs = Math.max(0, Math.ceil(timeRef.current));
    if (secs !== lastSecRef.current) {
      lastSecRef.current = secs;
      cbs.current.onTime(secs);
    }
    if (timeRef.current <= 0) {
      overRef.current = true;
      cbs.current.onGameOver();
      return;
    }

    // Power-up timers
    if (shieldTimerRef.current > 0) {
      shieldTimerRef.current -= dt;
      if (shieldTimerRef.current <= 0) { shieldActiveRef.current = false; cbs.current.onShield(false); }
    }
    if (boostTimerRef.current > 0) {
      boostTimerRef.current -= dt;
      if (boostTimerRef.current <= 0) cbs.current.onBoost(false);
    }
    if (gunTimerRef.current > 0) {
      gunTimerRef.current -= dt;
      if (gunTimerRef.current <= 0) { hasGunRef.current = false; cbs.current.onGun(false); }
    }
    if (shootCoolRef.current > 0) shootCoolRef.current -= dt;

    // Input
    const k = keys.current;
    const goLeft = k.has("ArrowLeft") || k.has("a") || k.has("A");
    const goRight = k.has("ArrowRight") || k.has("d") || k.has("D");
    const goFwd = k.has("ArrowUp") || k.has("w") || k.has("W");
    const goBack = k.has("ArrowDown") || k.has("s") || k.has("S");
    const isShooting = (k.has(" ") || k.has("f") || k.has("F")) && hasGunRef.current;

    const boost = boostTimerRef.current > 0 ? 1.8 : 1;
    const targetSpeed = goFwd ? PLAYER_SPEED * boost : goBack ? -PLAYER_SPEED * 0.5 : 0;
    speedRef.current += (targetSpeed - speedRef.current) * 0.12;

    if (Math.abs(speedRef.current) > 0.5) {
      const turnDir = (goLeft ? 1 : 0) - (goRight ? 1 : 0);
      angleRef.current += turnDir * PLAYER_TURN_SPEED * dt * (speedRef.current / PLAYER_SPEED);
    }

    const p = posRef.current;
    const sin = Math.sin(angleRef.current);
    const cos = Math.cos(angleRef.current);
    let nx = p.x - sin * speedRef.current * dt;
    let nz = p.z - cos * speedRef.current * dt;

    // Obstacle collision
    let inMud = false;
    for (const obs of obstacles) {
      if (collides(nx, nz, obs.x, obs.z, obs.radius + 0.9)) {
        if (obs.type === "mud") inMud = true;
        else { nx = p.x; nz = p.z; }
      }
    }
    if (inMud) { nx = p.x + (nx - p.x) * 0.3; nz = p.z + (nz - p.z) * 0.3; }

    const [cx, cz] = clampToTrack(nx, nz, TRACK_HALF - 2);
    p.x = cx; p.z = cz;

    // Shooting
    if (isShooting && shootCoolRef.current <= 0) {
      shootCoolRef.current = 0.25;
      bulletsRef.current.push({
        id: nextIdRef.current++,
        x: p.x - sin * 2,
        z: p.z - cos * 2,
        vx: -sin * BULLET_SPEED,
        vz: -cos * BULLET_SPEED,
        life: BULLET_LIFE,
      });
    }

    // Update bullets
    let bulletsChanged = false;
    const aliveBullets: Bullet[] = [];
    for (const b of bulletsRef.current) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.life -= dt;
      if (b.life <= 0) { bulletsChanged = true; continue; }
      let hit = false;
      for (const en of enemiesRef.current) {
        if (en.health <= 0) continue;
        if (collides(b.x, b.z, en.x, en.z, 2)) {
          en.health--;
          en.stunTimer = 1.5;
          spawnParticles(en.x, en.z, "#ff4400", 8);
          hit = true; bulletsChanged = true;
          if (en.health <= 0) {
            spawnParticles(en.x, en.z, "#ff8800", 16);
            scoreRef.current += scoreForKill();
            cbs.current.onScore(scoreRef.current);
            const [rx, rz] = randomPosition(p.x, p.z);
            en.x = rx; en.z = rz; en.health = 3;
          }
          break;
        }
      }
      if (!hit) aliveBullets.push(b);
    }
    bulletsRef.current = aliveBullets;
    if (bulletsChanged) setBullets([...bulletsRef.current]);

    // Update enemies
    let enemiesChanged = false;
    for (const en of enemiesRef.current) {
      if (en.health <= 0) continue;
      if (en.stunTimer > 0) { en.stunTimer -= dt; enemiesChanged = true; continue; }
      const dx = p.x - en.x;
      const dz = p.z - en.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.1) {
        const targetAngle = Math.atan2(-dx, -dz);
        en.angle = lerpAngle(en.angle, targetAngle, 0.05);
        en.x += (dx / d) * en.speed * dt;
        en.z += (dz / d) * en.speed * dt;
        enemiesChanged = true;
      }
      if (collides(p.x, p.z, en.x, en.z, 2.5)) {
        if (!shieldActiveRef.current) {
          healthRef.current = Math.max(0, healthRef.current - 1);
          cbs.current.onHealth(healthRef.current);
          spawnParticles(p.x, p.z, "#ff0000", 10);
          if (healthRef.current <= 0) {
            overRef.current = true;
            cbs.current.onGameOver();
            return;
          }
        }
        if (d > 0.01) {
          en.x -= (dx / d) * 5;
          en.z -= (dz / d) * 5;
        }
        en.stunTimer = 1.0;
        enemiesChanged = true;
      }
    }
    if (enemiesChanged) setEnemies([...enemiesRef.current]);

    // Power-up collection
    const puList = powerUpsRef.current;
    let puChanged = false;
    for (let i = 0; i < puList.length; i++) {
      const pu = puList[i]!;
      if (pu.collected) continue;
      if (collides(p.x, p.z, pu.x, pu.z, 2.2)) {
        pu.collected = true;
        puChanged = true;
        const puColor = PU_COLORS[pu.type] ?? "#fff";
        spawnParticles(pu.x, pu.z, puColor, 10);
        scoreRef.current += scoreForPickup(pu.type);
        cbs.current.onScore(scoreRef.current);
        if (pu.type === "boost") { boostTimerRef.current = 5; cbs.current.onBoost(true); }
        else if (pu.type === "shield") { shieldActiveRef.current = true; shieldTimerRef.current = 8; cbs.current.onShield(true); }
        else if (pu.type === "gun") { hasGunRef.current = true; gunTimerRef.current = 15; cbs.current.onGun(true); }
        else if (pu.type === "repair") { healthRef.current = Math.min(3, healthRef.current + 1); cbs.current.onHealth(healthRef.current); }
        const [rx, rz] = randomPosition(p.x, p.z);
        const puIdx = i;
        setTimeout(() => {
          const list = powerUpsRef.current;
          const target = list[puIdx];
          if (target) { target.collected = false; target.x = rx; target.z = rz; }
          setPowerUps([...powerUpsRef.current]);
        }, 5000);
      }
    }
    if (puChanged) { powerUpsRef.current = [...puList]; setPowerUps([...puList]); }

    // Particles
    let parChanged = false;
    const aliveP: Particle[] = [];
    for (const par of particlesRef.current) {
      par.x += par.vx * dt;
      par.y += par.vy * dt;
      par.z += par.vz * dt;
      par.vy -= 12 * dt;
      par.life -= dt;
      if (par.life > 0) aliveP.push(par);
      else parChanged = true;
    }
    particlesRef.current = aliveP;
    if (parChanged || aliveP.length !== particles.length) setParticles([...aliveP]);
  });

  return (
    <>
      <color attach="background" args={["#0a1a0a"]} />
      <fog attach="fog" args={["#1a3a1a", 35, 90]} />

      <ambientLight intensity={0.35} color="#b8d4a8" />
      <directionalLight
        position={[20, 40, 20]} intensity={1.4} color="#ffe4b5" castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={150}
        shadow-camera-left={-80} shadow-camera-right={80}
        shadow-camera-top={80} shadow-camera-bottom={-80}
      />
      <directionalLight position={[-30, 20, -30]} intensity={0.5} color="#4a9a6a" />
      <hemisphereLight args={["#1a4a1a", "#0a1a0a", 0.4]} />

      <FollowCamera posRef={posRef} angleRef={angleRef} />
      <JungleGround />

      {trees.map((t, i) => <JungleTree key={i} x={t.x} z={t.z} scale={t.scale} variant={t.variant} />)}

      {obstacles.map((obs) => {
        if (obs.type === "rock") return <Rock key={obs.id} x={obs.x} z={obs.z} scale={0.9 + (obs.id % 3) * 0.2} />;
        if (obs.type === "mud") return <MudPatch key={obs.id} x={obs.x} z={obs.z} />;
        if (obs.type === "vine") return <VineArch key={obs.id} x={obs.x} z={obs.z} />;
        if (obs.type === "ruin") return <RuinColumn key={obs.id} x={obs.x} z={obs.z} tilt={(obs.id % 5) * 0.08} />;
        return null;
      })}

      <Waterfall x={-45} z={-30} />
      <Waterfall x={45} z={30} />
      <GoldenStatue />

      {mistPositions.map(([x, z], i) => <MistCloud key={i} x={x!} z={z!} idx={i} />)}
      {[0, 1, 2, 3, 4].map((i) => <Bird key={i} idx={i} />)}

      <PlayerCar posRef={posRef} angleRef={angleRef} shieldActiveRef={shieldActiveRef} />
      {enemies.map((en) => <EnemyCar key={en.id} enemy={en} />)}
      {powerUps.filter((p) => !p.collected).map((pu) => <PowerUpMesh key={pu.id} pu={pu} />)}
      {bullets.map((b) => <BulletMesh key={b.id} bullet={b} />)}
      {particles.map((par) => <ParticleMesh key={par.id} particle={par} />)}

      <pointLight position={[0, 25, 0]} color="#ff8800" intensity={0.4} distance={80} />
    </>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function HUD({ health, hasShield, hasGun, isBoosting }: {
  health: number; hasShield: boolean; hasGun: boolean; isBoosting: boolean;
}) {
  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none" style={{ zIndex: 20 }}>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: "50%",
            background: i <= health ? "#e74c3c" : "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.4)",
          }} />
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {hasShield && <span style={{ background: "#00bfff33", border: "1px solid #00bfff", borderRadius: 6, padding: "1px 7px", color: "#00bfff", fontSize: 11 }}>🛡 SHIELD</span>}
        {hasGun && <span style={{ background: "#e74c3c33", border: "1px solid #e74c3c", borderRadius: 6, padding: "1px 7px", color: "#e74c3c", fontSize: 11 }}>🔫 GUN [SPACE]</span>}
        {isBoosting && <span style={{ background: "#ff980033", border: "1px solid #ff9800", borderRadius: 6, padding: "1px 7px", color: "#ff9800", fontSize: 11 }}>⚡ BOOST</span>}
      </div>
    </div>
  );
}

// ─── Mobile Controls ─────────────────────────────────────────────────────────
type Dir = "left" | "right" | "up" | "down" | "shoot";

function pressKey(dir: Dir, type: "keydown" | "keyup") {
  const map: Record<Dir, string> = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", shoot: "f" };
  window.dispatchEvent(new KeyboardEvent(type, { key: map[dir] }));
}

function DpadButton({ dir, label, style }: { dir: Dir; label: string; style?: React.CSSProperties }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); pressKey(dir, "keydown"); }}
      onPointerUp={(e) => { e.preventDefault(); pressKey(dir, "keyup"); }}
      onPointerCancel={() => pressKey(dir, "keyup")}
      onPointerLeave={() => pressKey(dir, "keyup")}
      className="select-none pointer-events-auto flex items-center justify-center"
      style={{
        width: 52, height: 52, borderRadius: "0.75rem",
        background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 20,
        touchAction: "none", ...style,
      }}
      aria-label={dir}
    >{label}</button>
  );
}

function MobileControls() {
  useEffect(() => () => {
    (["left", "right", "up", "down", "shoot"] as Dir[]).forEach((d) => pressKey(d, "keyup"));
  }, []);
  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4 pointer-events-none" style={{ zIndex: 20 }}>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(3,52px)", gridTemplateRows: "repeat(2,52px)" }}>
        <span /><DpadButton dir="up" label="▲" /><span />
        <DpadButton dir="left" label="◀" />
        <DpadButton dir="down" label="▼" />
        <DpadButton dir="right" label="▶" />
      </div>
      <DpadButton dir="shoot" label="🔫" style={{ background: "rgba(231,76,60,0.35)", border: "1px solid #e74c3c", width: 64, height: 64, borderRadius: "50%", fontSize: 26 }} />
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none hidden md:flex gap-3 flex-wrap justify-center" style={{ zIndex: 10 }}>
      {[
        { color: "#ff9800", label: "⚡ Boost" },
        { color: "#00bfff", label: "🛡 Shield" },
        { color: "#e74c3c", label: "🔫 Gun" },
        { color: "#2ecc71", label: "❤️ Repair" },
      ].map(({ color, label }) => (
        <span key={label} style={{ background: `${color}22`, border: `1px solid ${color}`, borderRadius: 6, padding: "2px 10px", color, fontSize: 12 }}>{label}</span>
      ))}
    </div>
  );
}

// ─── Exported Game ────────────────────────────────────────────────────────────
export function Game(props: GameProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [health, setHealth] = useState(3);
  const [hasShield, setHasShield] = useState(false);
  const [hasGun, setHasGun] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 7, 12], fov: 60, near: 0.1, far: 300 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene
          {...props}
          onHealth={setHealth}
          onShield={setHasShield}
          onGun={setHasGun}
          onBoost={setIsBoosting}
        />
      </Canvas>
      <HUD health={health} hasShield={hasShield} hasGun={hasGun} isBoosting={isBoosting} />
      {isMobile && <MobileControls />}
      <Legend />
    </div>
  );
}
