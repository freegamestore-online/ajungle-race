export const TRACK_HALF_W = 10;
export const PLAYER_MAX_SPEED = 22;   // faster!
export const PLAYER_ACCEL = 22;
export const PLAYER_BRAKE = 32;
export const PLAYER_TURN = 3.2;
export const BULLET_SPEED = 55;
export const BULLET_LIFE = 1.0;
export const ENEMY_BASE_SPEED = 6;

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
export function scoreForPickup(_type: string): number { return 10; }
