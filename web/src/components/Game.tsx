import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Character, PowerUp, Obstacle, Bullet, Enemy } from "../types";
import {
  TRACK_HALF_W, PLAYER_MAX_SPEED, PLAYER_ACCEL, PLAYER_BRAKE,
  PLAYER_TURN, BULLET_SPEED, BULLET_LIFE, ENEMY_BASE_SPEED,
  clamp, dist2, lerpAngle, scoreForKill, scoreForPickup,
} from "../lib/logic";

export interface GameProps {
  character: Character;
  level: number;
  onScore: (s: number) => void;
  onHealth: (hp: number) => void;
  onLevelComplete: (score: number) => void;
  onGameOver: (score: number) => void;
}

function mkRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

const ZONES = [
  { z: 65,  label: "🌊 River Crossing", color: "#60a5fa" },
  { z: 35,  label: "🪨 Boulder Field",  color: "#a78bfa" },
  { z: 0,   label: "🌿 Vine Maze",      color: "#4ade80" },
  { z: -35, label: "💀 Enemy Camp",     color: "#f87171" },
  { z: -65, label: "🏛️ Temple Gates",   color: "#fbbf24" },
];

// ── Ground ────────────────────────────────────────────────────────────────────
function Ground() {
  const strips = useMemo(() => Array.from({ length: 50 }, (_, i) => 120 - i * 5), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#1a3a0a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[TRACK_HALF_W * 2, 260]} />
        <meshStandardMaterial color="#7a5530" roughness={0.9} />
      </mesh>
      {/* track texture strips */}
      {strips.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
          <planeGeometry args={[TRACK_HALF_W * 2, 4.2]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#6b4820" : "#7a5530"} roughness={1} />
        </mesh>
      ))}
      {/* edge lines */}
      {([-TRACK_HALF_W + 0.5, TRACK_HALF_W - 0.5] as number[]).map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, 0]}>
          <planeGeometry args={[0.5, 260]} />
          <meshStandardMaterial color="#f0c040" roughness={0.6} />
        </mesh>
      ))}
      {/* centre dashes */}
      {strips.map((z, i) => (
        <mesh key={`d${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, z]}>
          <planeGeometry args={[0.28, 2.8]} />
          <meshStandardMaterial color="#ffffc0" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// ── Jungle sides ──────────────────────────────────────────────────────────────
function JungleSides() {
  const trees = useMemo(() => {
    const rand = mkRand(99);
    return Array.from({ length: 160 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return {
        x: side * (TRACK_HALF_W + 1.5 + rand() * 35),
        z: -120 + rand() * 240,
        s: 0.6 + rand() * 1.8,
        rot: rand() * Math.PI * 2,
        variant: Math.floor(rand() * 3),
      };
    });
  }, []);

  const bushes = useMemo(() => {
    const rand = mkRand(42);
    return Array.from({ length: 80 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return {
        x: side * (TRACK_HALF_W + 0.5 + rand() * 4),
        z: -120 + rand() * 240,
        s: 0.3 + rand() * 0.6,
      };
    });
  }, []);

  const TRUNK_COLORS = ["#3d2008", "#4a2a0a", "#2e1806"];
  const CANOPY_SETS = [
    ["#1a4a0a", "#1e5c0e", "#22660f"],
    ["#0d3d08", "#145210", "#186014"],
    ["#1e4d10", "#246018", "#2a701e"],
  ];

  return (
    <group>
      {trees.map((t, i) => {
        const canopy = CANOPY_SETS[t.variant] ?? CANOPY_SETS[0]!;
        const trunk = TRUNK_COLORS[t.variant] ?? TRUNK_COLORS[0]!;
        return (
          <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]} scale={[t.s, t.s, t.s]}>
            <mesh castShadow position={[0, 2.5, 0]}>
              <cylinderGeometry args={[0.28, 0.6, 5, 7]} />
              <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {([5.5, 7.8, 9.8] as number[]).map((y, li) => (
              <mesh key={li} castShadow position={[0, y, 0]}>
                <coneGeometry args={[3.8 - li * 0.8, 5 - li * 0.6, 8]} />
                <meshStandardMaterial color={canopy[li]!} roughness={0.75} />
              </mesh>
            ))}
          </group>
        );
      })}
      {bushes.map((b, i) => (
        <mesh key={`b${i}`} castShadow position={[b.x, b.s * 0.5, b.z]} scale={[b.s, b.s, b.s]}>
          <sphereGeometry args={[1.2, 7, 6]} />
          <meshStandardMaterial color="#1a5010" roughness={0.9} />
        </mesh>
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
          {([-1, 1] as number[]).map((side, si) => (
            <group key={si} position={[side * (TRACK_HALF_W + 1.2), 0, 0]}>
              <mesh castShadow position={[0, 3.5, 0]}>
                <cylinderGeometry args={[0.32, 0.45, 7, 8]} />
                <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.6} roughness={0.3} metalness={0.5} />
              </mesh>
              <mesh castShadow position={[0, 7.5, 0]}>
                <sphereGeometry args={[0.55, 10, 8]} />
                <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={1.2} roughness={0.1} metalness={0.8} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 7.2, 0]}>
            <boxGeometry args={[TRACK_HALF_W * 2 + 2.6, 0.55, 0.22]} />
            <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0, 5.5, 0]} intensity={4} distance={20} color={zone.color} />
        </group>
      ))}
    </group>
  );
}

// ── Golden Statue ─────────────────────────────────────────────────────────────
function GoldenStatue() {
  const spinRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    if (spinRef.current) spinRef.current.rotation.y = state.clock.elapsedTime * 0.8;
    if (glowRef.current) glowRef.current.intensity = 8 + Math.sin(state.clock.elapsedTime * 2) * 3;
  });
  return (
    <group position={[0, 0, -92]}>
      {([0, 1, 2] as number[]).map((s) => (
        <mesh key={s} castShadow position={[0, s * 0.7, 0]}>
          <cylinderGeometry args={[7.5 - s * 1.8, 7.5 - s * 1.8, 0.7, 14]} />
          <meshStandardMaterial color="#a07800" roughness={0.35} metalness={0.75} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[3.5, 4.5, 4.5, 12]} />
        <meshStandardMaterial color="#b8860b" roughness={0.25} metalness={0.85} />
      </mesh>
      <group ref={spinRef} position={[0, 6, 0]}>
        <mesh castShadow position={[0, 2.5, 0]}>
          <cylinderGeometry args={[1.2, 1.5, 5, 12]} />
          <meshStandardMaterial color="#ffd700" roughness={0.1} metalness={0.97} emissive="#ffa500" emissiveIntensity={0.4} />
        </mesh>
        <mesh castShadow position={[0, 6.2, 0]}>
          <sphereGeometry args={[1.6, 16, 12]} />
          <meshStandardMaterial color="#ffd700" roughness={0.08} metalness={0.98} emissive="#ffaa00" emissiveIntensity={0.5} />
        </mesh>
        {Array.from({ length: 8 }, (_, k) => (
          <mesh key={k} castShadow position={[
            Math.sin((k / 8) * Math.PI * 2) * 1.5, 8.2,
            Math.cos((k / 8) * Math.PI * 2) * 1.5,
          ]}>
            <coneGeometry args={[0.22, 1.2, 5]} />
            <meshStandardMaterial color="#ffe066" roughness={0.08} metalness={1} emissive="#ffcc00" emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>
      <pointLight ref={glowRef} position={[0, 10, 0]} intensity={8} distance={60} color="#ffd700" />
      <pointLight position={[0, 10, 0]} intensity={5} distance={35} color="#ff8800" />
    </group>
  );
}

// ── Obstacle ──────────────────────────────────────────────────────────────────
function ObstacleMesh({ obs }: { obs: Obstacle }) {
  if (obs.type === "rock") {
    return (
      <group position={[obs.x, obs.radius * 0.7, obs.z]}>
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[obs.radius, 0]} />
          <meshStandardMaterial color="#6a6a5a" roughness={0.9} metalness={0.15} />
        </mesh>
        <mesh castShadow receiveShadow position={[obs.radius * 0.5, -obs.radius * 0.3, obs.radius * 0.3]} scale={[0.6, 0.5, 0.6]}>
          <dodecahedronGeometry args={[obs.radius, 0]} />
          <meshStandardMaterial color="#5a5a4a" roughness={0.95} />
        </mesh>
      </group>
    );
  }
  if (obs.type === "mud") {
    return (
      <group position={[obs.x, 0, obs.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.07, 0]}>
          <circleGeometry args={[obs.radius, 16]} />
          <meshStandardMaterial color="#1a0c00" roughness={1} transparent opacity={0.92} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
          <circleGeometry args={[obs.radius * 0.6, 12]} />
          <meshStandardMaterial color="#2a1400" roughness={1} transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }
  if (obs.type === "vine") {
    return (
      <group position={[obs.x, 0, obs.z]}>
        {([
          [0, 3.5, 0, 0.16, 0.22, 7],
          [0.8, 2.5, 0.3, 0.13, 0.18, 5],
          [-0.7, 3, -0.2, 0.11, 0.15, 6],
        ] as [number, number, number, number, number, number][]).map(([vx, vy, vz, r1, r2, h], vi) => (
          <mesh key={vi} castShadow position={[vx, vy, vz]}>
            <cylinderGeometry args={[r1, r2, h, 7]} />
            <meshStandardMaterial color="#2d6b10" roughness={0.85} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 7, 0]}>
          <sphereGeometry args={[1.2, 8, 7]} />
          <meshStandardMaterial color="#1e5a0c" roughness={0.8} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[obs.radius * 2.2, 3, obs.radius * 1.6]} />
        <meshStandardMaterial color="#4a4030" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[obs.radius * 2.4, 0.35, obs.radius * 1.8]} />
        <meshStandardMaterial color="#2d5a1a" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Power-up ──────────────────────────────────────────────────────────────────
const PU_COLOR: Record<PowerUp["type"], string> = {
  boost: "#22d3ee", shield: "#60a5fa", gun: "#f87171", repair: "#4ade80",
};

function PowerUpMesh({ pu }: { pu: PowerUp }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 3;
    ref.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 3.5) * 0.35;
  });
  const col = PU_COLOR[pu.type];
  return (
    <group ref={ref} position={[pu.x, 0, pu.z]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9} roughness={0.1} metalness={0.6} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.3} transparent opacity={0.18} roughness={0} />
      </mesh>
      <pointLight intensity={3.5} distance={8} color={col} />
    </group>
  );
}

// ── Bullet ────────────────────────────────────────────────────────────────────
function BulletMesh({ b }: { b: Bullet }) {
  return (
    <group position={[b.x, 1.1, b.z]}>
      <mesh>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2200" emissiveIntensity={3} />
      </mesh>
      <pointLight intensity={4} distance={6} color="#ff4400" />
    </group>
  );
}

// ── Enemy ─────────────────────────────────────────────────────────────────────
function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const grp = useRef<THREE.Group>(null!);
  const eRef = useRef(enemy);
  eRef.current = enemy;
  const legSwing = useRef(0);

  useFrame((_, dt) => {
    if (!grp.current) return;
    grp.current.position.set(eRef.current.x, 0, eRef.current.z);
    grp.current.rotation.y = eRef.current.angle;
    legSwing.current += dt * 5;
  });

  const stunned = enemy.stunTimer > 0;
  const sc = stunned ? "#999" : "#c0392b";
  const dc = stunned ? "#777" : "#8b2500";

  return (
    <group ref={grp}>
      <mesh castShadow position={[-0.35, 0.75, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 1.5, 7]} />
        <meshStandardMaterial color={dc} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.35, 0.75, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 1.5, 7]} />
        <meshStandardMaterial color={dc} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.62, 0.52, 1.3, 9]} />
        <meshStandardMaterial color={sc} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh castShadow position={[-0.9, 1.9, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.16, 0.16, 1.1, 6]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.9, 1.9, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.16, 0.16, 1.1, 6]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.58, 12, 9]} />
        <meshStandardMaterial color="#8d5524" roughness={0.55} />
      </mesh>
      <mesh position={[-0.23, 2.88, 0.5]}>
        <sphereGeometry args={[0.11, 6, 6]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.23, 2.88, 0.5]}>
        <sphereGeometry args={[0.11, 6, 6]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
      </mesh>
      <mesh castShadow position={[1.3, 1.9, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.07, 0.07, 3, 6]} />
        <meshStandardMaterial color="#5a3000" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[1.65, 3.25, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.17, 0.55, 6]} />
        <meshStandardMaterial color="#ccc" roughness={0.25} metalness={0.85} />
      </mesh>
      {stunned && <pointLight position={[0, 2, 0]} intensity={4} distance={6} color="#ffff00" />}
    </group>
  );
}

// ── Boost trail particles ─────────────────────────────────────────────────────
function BoostTrail({ posRef, active }: { posRef: React.RefObject<THREE.Vector3>; active: boolean }) {
  const pts = useRef<{ x: number; z: number; life: number; y: number }[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    if (active) {
      pts.current.push({ x: posRef.current.x + (Math.random() - 0.5) * 0.8, z: posRef.current.z + (Math.random() - 0.5) * 0.8, life: 1, y: 0.4 + Math.random() * 0.6 });
    }
    pts.current = pts.current.filter(p => p.life > 0);
    pts.current.forEach(p => { p.life -= dt * 2.5; p.y += dt * 1.5; });
    const count = Math.min(pts.current.length, 40);
    for (let i = 0; i < count; i++) {
      const p = pts.current[i]!;
      dummy.position.set(p.x, p.y, p.z);
      const s = p.life * 0.45;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    for (let i = count; i < 40; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 40]}>
      <sphereGeometry args={[0.35, 6, 6]} />
      <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={1.5} transparent opacity={0.7} />
    </instancedMesh>
  );
}

// ── Player ────────────────────────────────────────────────────────────────────
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
  const grp  = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Mesh>(null!);
  const legR = useRef<THREE.Mesh>(null!);
  const armL = useRef<THREE.Mesh>(null!);
  const armR = useRef<THREE.Mesh>(null!);
  const bobT = useRef(0);

  useFrame((_, dt) => {
    if (!grp.current) return;
    grp.current.position.set(posRef.current.x, 0, posRef.current.z);
    grp.current.rotation.y = angleRef.current;
    const spd = Math.abs(speedRef.current);
    if (spd > 0.5) {
      bobT.current += dt * (spd / PLAYER_MAX_SPEED) * 12;
      const sw = Math.sin(bobT.current) * 0.65;
      if (legL.current) legL.current.rotation.x = sw;
      if (legR.current) legR.current.rotation.x = -sw;
      if (armL.current) armL.current.rotation.x = -sw * 0.5;
      if (armR.current) armR.current.rotation.x = sw * 0.5;
      grp.current.position.y = Math.abs(Math.sin(bobT.current)) * 0.14;
    } else {
      if (legL.current) legL.current.rotation.x = 0;
      if (legR.current) legR.current.rotation.x = 0;
      if (armL.current) armL.current.rotation.x = 0;
      if (armR.current) armR.current.rotation.x = 0;
      grp.current.position.y = 0;
    }
  });

  const { sc, hc, sh, pa, sk } = {
    sc: char.skinColor, hc: char.hairColor,
    sh: char.shirtColor, pa: char.pantsColor, sk: char.shoeColor,
  };

  return (
    <group ref={grp}>
      {shieldActive && (
        <mesh>
          <sphereGeometry args={[3, 18, 14]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.15} roughness={0} wireframe />
        </mesh>
      )}
      {/* shoes */}
      <mesh castShadow position={[-0.33, 0.18, 0.12]}>
        <boxGeometry args={[0.4, 0.24, 0.7]} />
        <meshStandardMaterial color={sk} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.33, 0.18, 0.12]}>
        <boxGeometry args={[0.4, 0.24, 0.7]} />
        <meshStandardMaterial color={sk} roughness={0.85} />
      </mesh>
      {/* legs */}
      <mesh ref={legL} castShadow position={[-0.33, 0.88, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 1.25, 8]} />
        <meshStandardMaterial color={pa} roughness={0.8} />
      </mesh>
      <mesh ref={legR} castShadow position={[0.33, 0.88, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 1.25, 8]} />
        <meshStandardMaterial color={pa} roughness={0.8} />
      </mesh>
      {/* body */}
      <mesh castShadow position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.52, 0.44, 1.15, 10]} />
        <meshStandardMaterial
          color={boostActive ? "#22d3ee" : sh}
          roughness={0.45} metalness={0.12}
          emissive={boostActive ? "#0891b2" : "#000"}
          emissiveIntensity={boostActive ? 0.6 : 0}
        />
      </mesh>
      {/* arms */}
      <mesh ref={armL} castShadow position={[-0.76, 1.8, 0]} rotation={[0, 0, 0.28]}>
        <cylinderGeometry args={[0.17, 0.17, 0.95, 7]} />
        <meshStandardMaterial color={sh} roughness={0.6} />
      </mesh>
      <mesh ref={armR} castShadow position={[0.76, 1.8, 0]} rotation={[0, 0, -0.28]}>
        <cylinderGeometry args={[0.17, 0.17, 0.95, 7]} />
        <meshStandardMaterial color={sh} roughness={0.6} />
      </mesh>
      {/* hands */}
      <mesh castShadow position={[-0.88, 1.28, 0]}>
        <sphereGeometry args={[0.19, 7, 7]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.88, 1.28, 0]}>
        <sphereGeometry args={[0.19, 7, 7]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      {/* neck */}
      <mesh castShadow position={[0, 2.42, 0]}>
        <cylinderGeometry args={[0.21, 0.23, 0.38, 8]} />
        <meshStandardMaterial color={sc} roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 2.96, 0]}>
        <sphereGeometry args={[0.54, 14, 12]} />
        <meshStandardMaterial color={sc} roughness={0.5} />
      </mesh>
      {/* hair */}
      <mesh castShadow position={[0, 3.32, 0]}>
        <sphereGeometry args={[0.56, 12, 10]} />
        <meshStandardMaterial color={hc} roughness={0.75} />
      </mesh>
      {char.gender === "girl" && (
        <>
          <mesh castShadow position={[-0.54, 2.82, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color={hc} roughness={0.75} />
          </mesh>
          <mesh castShadow position={[0.54, 2.82, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color={hc} roughness={0.75} />
          </mesh>
        </>
      )}
      {/* eyes */}
      <mesh position={[-0.21, 3.02, 0.48]}>
        <sphereGeometry args={[0.11, 7, 7]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.21, 3.02, 0.48]}>
        <sphereGeometry args={[0.11, 7, 7]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.21, 3.02, 0.54]}>
        <sphereGeometry args={[0.065, 6, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.21, 3.02, 0.54]}>
        <sphereGeometry args={[0.065, 6, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {boostActive && <pointLight position={[0, 1, 1]} intensity={6} distance={8} color="#ff6600" />}
    </group>
  );
}

// ── Follow camera with dynamic FOV ────────────────────────────────────────────
function FollowCamera({
  posRef, angleRef, speedRef,
}: {
  posRef: React.RefObject<THREE.Vector3>;
  angleRef: React.RefObject<number>;
  speedRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 10, 20));

  useFrame((_, dt) => {
    const p = posRef.current;
    const a = angleRef.current;
    const spd = Math.abs(speedRef.current);
    const lp = 1 - Math.pow(0.008, dt);
    const dist = 13 + spd * 0.35;
    const height = 8.5 + spd * 0.15;
    const tx = p.x + Math.sin(a) * dist;
    const tz = p.z + Math.cos(a) * dist;
    camPos.current.x += (tx - camPos.current.x) * lp;
    camPos.current.y += (height - camPos.current.y) * lp;
    camPos.current.z += (tz - camPos.current.z) * lp;
    camera.position.copy(camPos.current);
    camera.lookAt(p.x, 1.8, p.z);
    const targetFov = 60 + spd * 1.2;
    (camera as THREE.PerspectiveCamera).fov += (targetFov - (camera as THREE.PerspectiveCamera).fov) * 0.08;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  });

  return null;
}

// ── Scene root ────────────────────────────────────────────────────────────────
interface SceneProps {
  character: Character;
  level: number;
  keysRef: React.RefObject<Set<string>>;
  onScore: (s: number) => void;
  onHealth: (hp: number) => void;
  onLevelComplete: (score: number) => void;
  onGameOver: (score: number) => void;
  onHudUpdate: (h: HudState) => void;
  onShootRef: React.RefObject<() => void>;
}

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

function Scene({
  character, level, keysRef,
  onScore, onHealth, onLevelComplete, onGameOver, onHudUpdate, onShootRef,
}: SceneProps) {
  const posRef   = useRef(new THREE.Vector3(0, 0, 80));
  const angleRef = useRef(Math.PI);
  const speedRef = useRef(0);

  const healthRef    = useRef(100);
  const scoreRef     = useRef(0);
  const ammoRef      = useRef(0);
  const hasGunRef    = useRef(false);
  const boostRef     = useRef(0);
  const shieldRef    = useRef(0);
  const hurtCoolRef  = useRef(0);
  const doneRef      = useRef(false);

  const [obstacles]  = useState<Obstacle[]>(() => genObstacles(level));
  const [powerUps, setPowerUps]  = useState<PowerUp[]>(() => genPowerUps(level));
  const [bullets, setBullets]    = useState<Bullet[]>([]);
  const [enemies, setEnemies]    = useState<Enemy[]>(() => genEnemies(level));
  const [shieldVis, setShieldVis] = useState(false);
  const [boostVis,  setBoostVis]  = useState(false);

  const bulletRef  = useRef<Bullet[]>([]);
  const enemyRef   = useRef<Enemy[]>(enemies);
  const powerUpRef = useRef<PowerUp[]>(powerUps);

  const hudTimer = useRef(0);

  // expose shoot
  useEffect(() => {
    (onShootRef as React.MutableRefObject<() => void>).current = () => {
      if (!hasGunRef.current || ammoRef.current <= 0 || doneRef.current) return;
      ammoRef.current -= 1;
      if (ammoRef.current <= 0) hasGunRef.current = false;
      const a = angleRef.current;
      const b: Bullet = {
        x: posRef.current.x - Math.sin(a) * 1.5,
        z: posRef.current.z - Math.cos(a) * 1.5,
        vx: -Math.sin(a) * BULLET_SPEED,
        vz: -Math.cos(a) * BULLET_SPEED,
        life: BULLET_LIFE,
      };
      bulletRef.current = [...bulletRef.current, b];
      setBullets([...bulletRef.current]);
    };
  }, [onShootRef]);

  useFrame((_, dt) => {
    if (doneRef.current) return;
    const keys = keysRef.current;
    const boost = boostRef.current > 0;
    const maxSpd = boost ? PLAYER_MAX_SPEED * 1.75 : PLAYER_MAX_SPEED;

    // turning
    const turning = keys.has("ArrowLeft") || keys.has("a")
      ? -1 : keys.has("ArrowRight") || keys.has("d") ? 1 : 0;
    angleRef.current += turning * PLAYER_TURN * dt;

    // speed
    const forward = keys.has("ArrowUp") || keys.has("w");
    const backward = keys.has("ArrowDown") || keys.has("s");
    if (forward) speedRef.current = clamp(speedRef.current + PLAYER_ACCEL * dt, 0, maxSpd);
    else if (backward) speedRef.current = clamp(speedRef.current - PLAYER_BRAKE * dt, -maxSpd * 0.4, maxSpd);
    else speedRef.current *= Math.pow(0.18, dt);

    // move
    const a = angleRef.current;
    const spd = speedRef.current;
    posRef.current.x = clamp(posRef.current.x - Math.sin(a) * spd * dt, -TRACK_HALF_W + 0.8, TRACK_HALF_W - 0.8);
    posRef.current.z += Math.cos(a) * spd * dt;
    posRef.current.z = clamp(posRef.current.z, -100, 82);

    // timers
    if (boostRef.current > 0) boostRef.current -= dt;
    if (shieldRef.current > 0) shieldRef.current -= dt;
    if (hurtCoolRef.current > 0) hurtCoolRef.current -= dt;

    // goal check
    if (posRef.current.z <= -90 && !doneRef.current) {
      doneRef.current = true;
      onLevelComplete(scoreRef.current);
      return;
    }

    // obstacle collision
    if (hurtCoolRef.current <= 0 && shieldRef.current <= 0) {
      for (const obs of obstacles) {
        const r = obs.type === "mud" ? obs.radius * 0.7 : obs.radius;
        if (dist2(posRef.current.x, posRef.current.z, obs.x, obs.z) < (r + 0.9) ** 2) {
          let dmg = 0;
          if (obs.type === "rock")  { dmg = 18; speedRef.current *= -0.5; }
          if (obs.type === "mud")   { dmg = 5; speedRef.current *= 0.35; }
          if (obs.type === "vine")  { dmg = 10; speedRef.current *= 0.5; }
          if (obs.type === "ruin")  { dmg = 14; speedRef.current *= -0.4; }
          if (dmg > 0) {
            healthRef.current = clamp(healthRef.current - dmg, 0, 100);
            onHealth(healthRef.current);
            hurtCoolRef.current = 0.8;
            if (healthRef.current <= 0 && !doneRef.current) {
              doneRef.current = true;
              onGameOver(scoreRef.current);
              return;
            }
          }
          break;
        }
      }
    }

    // power-up collection
    const remaining: PowerUp[] = [];
    for (const pu of powerUpRef.current) {
      if (dist2(posRef.current.x, posRef.current.z, pu.x, pu.z) < (1.6) ** 2) {
        if (pu.type === "boost")  boostRef.current = 4;
        if (pu.type === "shield") shieldRef.current = 5;
        if (pu.type === "gun")    { hasGunRef.current = true; ammoRef.current += 8; }
        if (pu.type === "repair") { healthRef.current = clamp(healthRef.current + 30, 0, 100); onHealth(healthRef.current); }
        scoreRef.current += scoreForPickup(pu.type);
        onScore(scoreRef.current);
      } else {
        remaining.push(pu);
      }
    }
    if (remaining.length !== powerUpRef.current.length) {
      powerUpRef.current = remaining;
      setPowerUps([...remaining]);
    }

    // bullets
    let bulletsChanged = false;
    const newBullets = bulletRef.current.filter(b => {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.life -= dt;
      if (b.life <= 0) { bulletsChanged = true; return false; }
      // bullet-enemy
      for (let i = 0; i < enemyRef.current.length; i++) {
        const en = enemyRef.current[i]!;
        if (dist2(b.x, b.z, en.x, en.z) < 2.5 ** 2) {
          en.stunTimer = 2.5;
          en.hp = (en.hp ?? 3) - 1;
          if (en.hp <= 0) {
            scoreRef.current += scoreForKill();
            onScore(scoreRef.current);
            enemyRef.current.splice(i, 1);
            setEnemies([...enemyRef.current]);
          }
          bulletsChanged = true;
          return false;
        }
      }
      return true;
    });
    if (bulletsChanged || newBullets.length !== bulletRef.current.length) {
      bulletRef.current = newBullets;
      setBullets([...newBullets]);
    }

    // enemies
    const eSpeed = ENEMY_BASE_SPEED * (1 + level * 0.35);
    let enemiesChanged = false;
    for (const en of enemyRef.current) {
      if (en.stunTimer > 0) { en.stunTimer -= dt; continue; }
      const dx = posRef.current.x - en.x;
      const dz = posRef.current.z - en.z;
      const d = Math.sqrt(dx * dx + dz * dz) + 0.001;
      const targetAngle = Math.atan2(-dx, -dz);
      en.angle = lerpAngle(en.angle, targetAngle, 3 * dt);
      en.x += (dx / d) * eSpeed * dt;
      en.z += (dz / d) * eSpeed * dt;
      enemiesChanged = true;
      // enemy hits player
      if (hurtCoolRef.current <= 0 && shieldRef.current <= 0 && d < 1.6) {
        healthRef.current = clamp(healthRef.current - 12, 0, 100);
        onHealth(healthRef.current);
        hurtCoolRef.current = 1.0;
        speedRef.current = -6;
        if (healthRef.current <= 0 && !doneRef.current) {
          doneRef.current = true;
          onGameOver(scoreRef.current);
          return;
        }
      }
    }
    if (enemiesChanged) setEnemies([...enemyRef.current]);

    // HUD
    hudTimer.current += dt;
    if (hudTimer.current > 0.08) {
      hudTimer.current = 0;
      const distPct = clamp(((posRef.current.z + 100) / 180) * 100, 0, 100);
      const zone = ZONES.findIndex(z => posRef.current.z >= z.z - 18);
      setShieldVis(shieldRef.current > 0);
      setBoostVis(boostRef.current > 0);
      onHudUpdate({
        health: healthRef.current,
        score: scoreRef.current,
        ammo: ammoRef.current,
        hasGun: hasGunRef.current,
        boostActive: boostRef.current > 0,
        shieldActive: shieldRef.current > 0,
        zone: zone < 0 ? 0 : zone,
        distPct: 100 - distPct,
      });
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} color="#b8d4b0" />
      <directionalLight
        castShadow position={[18, 28, 12]} intensity={2.2} color="#ffe8b0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5} shadow-camera-far={200}
        shadow-camera-left={-60} shadow-camera-right={60}
        shadow-camera-top={60} shadow-camera-bottom={-60}
      />
      <directionalLight position={[-15, 10, -10]} intensity={0.4} color="#a0c8ff" />
      <hemisphereLight args={["#87ceeb", "#2d5a1a", 0.5]} />
      <fog attach="fog" args={["#1a3a10", 55, 160]} />

      <Ground />
      <JungleSides />
      <ZoneMarkers />
      <GoldenStatue />

      {obstacles.map((obs, i) => <ObstacleMesh key={i} obs={obs} />)}
      {powerUps.map((pu, i) => <PowerUpMesh key={i} pu={pu} />)}
      {bullets.map((b, i) => <BulletMesh key={i} b={b} />)}
      {enemies.map((en, i) => <EnemyMesh key={i} enemy={en} />)}

      <BoostTrail posRef={posRef} active={boostVis} />

      <PlayerMesh
        posRef={posRef}
        angleRef={angleRef}
        speedRef={speedRef}
        shieldActive={shieldVis}
        boostActive={boostVis}
        char={character}
      />

      <FollowCamera posRef={posRef} angleRef={angleRef} speedRef={speedRef} />
    </>
  );
}

// ── Generators ────────────────────────────────────────────────────────────────
function genObstacles(level: number): Obstacle[] {
  const rand = mkRand(level * 7 + 3);
  const types: Obstacle["type"][] = ["rock", "mud", "vine", "ruin"];
  const count = 20 + level * 6;
  return Array.from({ length: count }, () => ({
    x: (rand() - 0.5) * (TRACK_HALF_W * 2 - 2.5),
    z: -85 + rand() * 155,
    radius: 1.2 + rand() * 1.5,
    type: types[Math.floor(rand() * types.length)]!,
  }));
}

function genPowerUps(level: number): PowerUp[] {
  const rand = mkRand(level * 13 + 7);
  const types: PowerUp["type"][] = ["boost", "shield", "gun", "repair"];
  const count = 10 + level * 2;
  return Array.from({ length: count }, () => ({
    x: (rand() - 0.5) * (TRACK_HALF_W * 2 - 3),
    z: -80 + rand() * 145,
    type: types[Math.floor(rand() * types.length)]!,
  }));
}

function genEnemies(level: number): Enemy[] {
  const rand = mkRand(level * 5 + 11);
  const count = 3 + level * 2;
  return Array.from({ length: count }, () => ({
    x: (rand() - 0.5) * (TRACK_HALF_W * 2 - 2),
    z: -20 - rand() * 65,
    angle: rand() * Math.PI * 2,
    stunTimer: 0,
    hp: 3,
  }));
}

// ── Mobile button ─────────────────────────────────────────────────────────────
function MobileBtn({ label, keyName, style }: { label: string; keyName: string; style?: React.CSSProperties }) {
  const fire = (down: boolean) => {
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: keyName, bubbles: true }));
  };
  return (
    <button
      onPointerDown={e => { e.preventDefault(); fire(true); }}
      onPointerUp={e => { e.preventDefault(); fire(false); }}
      onPointerLeave={e => { e.preventDefault(); fire(false); }}
      style={{
        width: 48, height: 48, borderRadius: 10, border: "2px solid rgba(255,255,255,0.35)",
        background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: "1.1rem",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none", backdropFilter: "blur(4px)",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

// ── HUD overlay ───────────────────────────────────────────────────────────────
function HudOverlay({ hud, onShoot }: { hud: HudState; onShoot: () => void }) {
  const zoneName  = ZONES[hud.zone]?.label ?? "";
  const zoneColor = ZONES[hud.zone]?.color ?? "#fff";
  const hpColor   = hud.health > 60 ? "#4ade80" : hud.health > 30 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: "Manrope, sans-serif" }}>
      {/* Top */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ color: hpColor, fontSize: "0.78rem", fontWeight: 800 }}>❤️</span>
          <div style={{ width: 80, height: 9, background: "rgba(255,255,255,0.15)", borderRadius: 5 }}>
            <div style={{ width: `${hud.health}%`, height: "100%", background: hpColor, borderRadius: 5, transition: "width 0.25s", boxShadow: `0 0 8px ${hpColor}88` }} />
          </div>
          <span style={{ color: "#fff", fontSize: "0.72rem", fontWeight: 700 }}>{hud.health}</span>
        </div>
        <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: 12, padding: "6px 14px", color: "#fbbf24", fontWeight: 800, fontSize: "0.82rem", backdropFilter: "blur(6px)", border: "1px solid rgba(255,200,0,0.2)", boxShadow: "0 0 12px rgba(251,191,36,0.2)" }}>
          ⭐ {hud.score}
        </div>
        {hud.boostActive && (
          <div style={{ background: "rgba(34,211,238,0.9)", borderRadius: 12, padding: "6px 12px", color: "#0a1a2a", fontWeight: 800, fontSize: "0.78rem", boxShadow: "0 0 16px #22d3ee88", animation: "pulse 0.5s infinite alternate" }}>
            💨 BOOST
          </div>
        )}
        {hud.shieldActive && (
          <div style={{ background: "rgba(96,165,250,0.9)", borderRadius: 12, padding: "6px 12px", color: "#0a1a2a", fontWeight: 800, fontSize: "0.78rem", boxShadow: "0 0 16px #60a5fa88" }}>
            🛡️ SHIELD
          </div>
        )}
        {hud.hasGun && (
          <div style={{ background: "rgba(248,113,113,0.9)", borderRadius: 12, padding: "6px 12px", color: "#1a0000", fontWeight: 800, fontSize: "0.78rem", boxShadow: "0 0 16px #f8717188" }}>
            🔫 ×{hud.ammo}
          </div>
        )}
      </div>

      {/* Zone */}
      <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: "4px 18px", color: zoneColor, fontWeight: 700, fontSize: "0.78rem", border: `1px solid ${zoneColor}55`, backdropFilter: "blur(6px)", whiteSpace: "nowrap", boxShadow: `0 0 14px ${zoneColor}44` }}>
        {zoneName}
      </div>

      {/* Progress */}
      <div style={{ position: "absolute", bottom: 96, left: "50%", transform: "translateX(-50%)", width: "min(300px,82vw)" }}>
        <div style={{ color: "#fff", fontSize: "0.68rem", textAlign: "center", marginBottom: 4, textShadow: "0 1px 6px #000", fontWeight: 600 }}>
          🏛️ Temple {Math.round(hud.distPct)}% away
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: `${100 - hud.distPct}%`, height: "100%", background: "linear-gradient(90deg,#4ade80,#22d3ee,#fbbf24)", borderRadius: 5, transition: "width 0.4s", boxShadow: "0 0 10px #4ade8088" }} />
        </div>
      </div>

      {/* Mobile controls */}
      <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 14px", pointerEvents: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 48px 48px", gridTemplateRows: "48px 48px", gap: 5 }}>
          <div />
          <MobileBtn label="▲" keyName="ArrowUp" />
          <div />
          <MobileBtn label="◄" keyName="ArrowLeft" />
          <MobileBtn label="▼" keyName="ArrowDown" />
          <MobileBtn label="►" keyName="ArrowRight" />
        </div>
        {hud.hasGun && (
          <button
            onPointerDown={e => { e.preventDefault(); onShoot(); }}
            style={{ width: 64, height: 64, borderRadius: 16, border: "2px solid rgba(248,113,113,0.6)", background: "rgba(248,113,113,0.85)", color: "#fff", fontSize: "1.6rem", cursor: "pointer", touchAction: "none", boxShadow: "0 0 20px #f8717188", backdropFilter: "blur(4px)" }}
          >
            🔫
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function Game({ character, level, onScore, onHealth, onLevelComplete, onGameOver }: GameProps) {
  const keysRef   = useRef<Set<string>>(new Set());
  const shootRef  = useRef<() => void>(() => {});
  const [hud, setHud] = useState<HudState>({
    health: 100, score: 0, ammo: 0, hasGun: false,
    boostActive: false, shieldActive: false, zone: 0, distPct: 100,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " " || e.key === "Enter") shootRef.current();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.2, far: 220, position: [0, 10, 20] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ background: "linear-gradient(180deg,#1a4a2a 0%,#0d2e10 60%,#0a1a08 100%)" }}
      >
        <Scene
          character={character}
          level={level}
          keysRef={keysRef}
          onScore={onScore}
          onHealth={onHealth}
          onLevelComplete={onLevelComplete}
          onGameOver={onGameOver}
          onHudUpdate={setHud}
          onShootRef={shootRef}
        />
      </Canvas>
      <HudOverlay hud={hud} onShoot={() => shootRef.current()} />
      <style>{`@keyframes pulse { from { opacity:1; } to { opacity:0.7; } }`}</style>
    </div>
  );
}
