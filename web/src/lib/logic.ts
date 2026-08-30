/**
 * Pure game math — no React, no three.js.
 */

export const TRACK_HALF = 60;
export const PLAYER_SPEED = 22;
export const PLAYER_TURN_SPEED = 2.2;
export const ROUND_SECONDS = 120;
export const BULLET_SPEED = 45;
export const BULLET_LIFE = 1.2;
export const ENEMY_SPEED_BASE = 8;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.sqrt(dist2(ax, az, bx, bz));
}

export function collides(px: number, pz: number, ox: number, oz: number, radius = 1.5): boolean {
  return dist2(px, pz, ox, oz) <= radius * radius;
}

export function clampToTrack(x: number, z: number, half = TRACK_HALF): [number, number] {
  return [clamp(x, -half, half), clamp(z, -half, half)];
}

export function randomPosition(
  avoidX: number,
  avoidZ: number,
  half = TRACK_HALF,
  minDist = 8,
  rand: () => number = Math.random,
): [number, number] {
  for (let i = 0; i < 32; i++) {
    const x = (rand() * 2 - 1) * half * 0.85;
    const z = (rand() * 2 - 1) * half * 0.85;
    if (dist2(x, z, avoidX, avoidZ) >= minDist * minDist) return [x, z];
  }
  return [-avoidX * 0.9, -avoidZ * 0.9];
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function scoreForKill(): number { return 50; }
export function scoreForPickup(type: string): number {
  return type === "boost" ? 10 : type === "shield" ? 15 : type === "gun" ? 20 : 5;
}
