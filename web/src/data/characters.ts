import type { Character } from "../types";

export const ALL_CHARACTERS: Character[] = [
  {
    id: "amara", name: "Amara", gender: "girl",
    skinColor: "#5c3317", hairColor: "#1a0800",
    shirtColor: "#e74c3c", pantsColor: "#2c3e50", shoeColor: "#1a1a1a",
    unlockLevel: 0, special: "⚡ Quick Feet", specialDesc: "Runs 15% faster",
    speedBonus: 1.15, shieldBonus: 1.0,
  },
  {
    id: "jake", name: "Jake", gender: "boy",
    skinColor: "#fde8d8", hairColor: "#8b4513",
    shirtColor: "#3498db", pantsColor: "#34495e", shoeColor: "#4a3000",
    unlockLevel: 0, special: "🛡️ Tough", specialDesc: "Takes less damage",
    speedBonus: 1.0, shieldBonus: 1.3,
  },
  {
    id: "yuki", name: "Yuki", gender: "girl",
    skinColor: "#f5d5b0", hairColor: "#111111",
    shirtColor: "#ff69b4", pantsColor: "#ffffff", shoeColor: "#cc0044",
    unlockLevel: 1, special: "🌸 Agile", specialDesc: "Turns sharper",
    speedBonus: 1.1, shieldBonus: 1.1,
  },
  {
    id: "kai", name: "Kai", gender: "boy",
    skinColor: "#8d5524", hairColor: "#1a0800",
    shirtColor: "#27ae60", pantsColor: "#1a3a1a", shoeColor: "#2d1b00",
    unlockLevel: 1, special: "💪 Power", specialDesc: "Smashes obstacles",
    speedBonus: 1.05, shieldBonus: 1.2,
  },
  {
    id: "priya", name: "Priya", gender: "girl",
    skinColor: "#c68642", hairColor: "#0a0500",
    shirtColor: "#ff5722", pantsColor: "#4a0a00", shoeColor: "#1a0800",
    unlockLevel: 2, special: "🔥 Blazer", specialDesc: "Boost lasts longer",
    speedBonus: 1.2, shieldBonus: 1.0,
  },
  {
    id: "leon", name: "Leon", gender: "boy",
    skinColor: "#c68642", hairColor: "#3d1c00",
    shirtColor: "#f39c12", pantsColor: "#2c2c00", shoeColor: "#2a1800",
    unlockLevel: 2, special: "🎯 Sharpshooter", specialDesc: "More ammo per pickup",
    speedBonus: 1.0, shieldBonus: 1.0,
  },
  {
    id: "zara", name: "Zara", gender: "girl",
    skinColor: "#2d1b0e", hairColor: "#0a0500",
    shirtColor: "#9b59b6", pantsColor: "#1a0030", shoeColor: "#0a0010",
    unlockLevel: 3, special: "👑 Champion", specialDesc: "Double score bonus",
    speedBonus: 1.15, shieldBonus: 1.15,
  },
  {
    id: "sam", name: "Sam", gender: "boy",
    skinColor: "#ffe0bd", hairColor: "#d4a017",
    shirtColor: "#00bcd4", pantsColor: "#003344", shoeColor: "#001a22",
    unlockLevel: 3, special: "🌊 Surfer", specialDesc: "Mud doesn't slow you",
    speedBonus: 1.1, shieldBonus: 1.0,
  },
  {
    id: "maya", name: "Maya", gender: "girl",
    skinColor: "#7b4f2e", hairColor: "#0a0500",
    shirtColor: "#e91e63", pantsColor: "#1a001a", shoeColor: "#0a000a",
    unlockLevel: 4, special: "🌟 Legend", specialDesc: "All stats maxed",
    speedBonus: 1.25, shieldBonus: 1.25,
  },
  {
    id: "max", name: "Max", gender: "boy",
    skinColor: "#eac086", hairColor: "#2c1810",
    shirtColor: "#607d8b", pantsColor: "#1a2530", shoeColor: "#0a1015",
    unlockLevel: 4, special: "🤖 Cyber", specialDesc: "Shield never breaks",
    speedBonus: 1.1, shieldBonus: 1.5,
  },
];
