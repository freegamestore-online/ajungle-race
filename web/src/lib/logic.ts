export const TRACK_HALF_W = 10;
export const PLAYER_MAX_SPEED = 14;
export const PLAYER_ACCEL = 14;
export const PLAYER_BRAKE = 22;
export const PLAYER_TURN = 2.8;
export const BULLET_SPEED = 44;
export const BULLET_LIFE = 1.1;
export const ENEMY_BASE_SPEED = 5;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
export function dist2(ax: number, az: number, bx: number, bz: number): number {
  return (ax - bx) ** 2 + (az - bz) ** 2;
}
export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function scoreForKill(): number { return 50; }
export function scoreForPickup(type: string): number {
  if (type === "gun") return 20;
  if (type === "shield") return 15;
  if (type === "boost") return 10;
  return 5;
}
