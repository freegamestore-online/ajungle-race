export type GamePhase = "charselect" | "playing" | "over";

export interface Character {
  id: string;
  name: string;
  gender: "girl" | "boy";
  skin: "dark" | "medium-dark" | "medium" | "medium-light" | "light";
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  carColor: string;
  unlockLevel: number;
  special: string;
}

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
