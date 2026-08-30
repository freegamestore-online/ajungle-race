export type GamePhase = "menu" | "playing" | "over";

export interface PowerUp {
  id: number;
  type: "boost" | "shield" | "gun" | "repair";
  x: number;
  z: number;
  collected: boolean;
}

export interface Obstacle {
  id: number;
  type: "rock" | "mud" | "vine" | "ruin";
  x: number;
  z: number;
  radius: number;
}

export interface Bullet {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
}

export interface Enemy {
  id: number;
  x: number;
  z: number;
  angle: number;
  speed: number;
  health: number;
  stunTimer: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
}
