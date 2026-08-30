import { describe, it, expect } from "vitest";
import { clamp, dist2, collides, lerpAngle, randomPosition, scoreForKill, scoreForPickup } from "./logic";

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("passes through mid", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("dist2", () => {
  it("returns squared distance", () => expect(dist2(0, 0, 3, 4)).toBe(25));
  it("is zero for same point", () => expect(dist2(2, 2, 2, 2)).toBe(0));
});

describe("collides", () => {
  it("detects overlap", () => expect(collides(0, 0, 1, 0, 2)).toBe(true));
  it("misses distant", () => expect(collides(0, 0, 10, 0, 2)).toBe(false));
});

describe("lerpAngle", () => {
  it("interpolates toward target", () => {
    const result = lerpAngle(0, Math.PI / 2, 0.5);
    expect(result).toBeCloseTo(Math.PI / 4, 4);
  });
  it("wraps correctly across PI boundary", () => {
    const result = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 1);
    expect(Math.abs(result)).toBeLessThan(Math.PI);
  });
});

describe("randomPosition", () => {
  it("avoids player position", () => {
    const [x, z] = randomPosition(0, 0, 50, 8, Math.random);
    expect(dist2(x, z, 0, 0)).toBeGreaterThanOrEqual(64);
  });
});

describe("scores", () => {
  it("kill gives 50", () => expect(scoreForKill()).toBe(50));
  it("gun pickup gives 20", () => expect(scoreForPickup("gun")).toBe(20));
  it("repair gives 5", () => expect(scoreForPickup("repair")).toBe(5));
});
