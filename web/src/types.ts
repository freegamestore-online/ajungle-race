export type GamePhase = "instructions" | "charselect" | "playing" | "over";

export interface Character {
  id: string;
  name: string;
  gender: "girl" | "boy";
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  unlockLevel: number;
  special: string;
  specialDesc: string;
  speedBonus: number;
  shieldBonus: number;
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
