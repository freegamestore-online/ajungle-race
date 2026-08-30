import { describe, it, expect } from "vitest";
import { clamp, dist2, lerpAngle, scoreForKill, scoreForPickup } from "./logic";

describe("clamp", () => {
  it("clamps below", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("clamps above", () => expect(clamp(15, 0, 10)).toBe(10));
  it("passes through", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("dist2", () => {
  it("squared distance", () => expect(dist2(0, 0, 3, 4)).toBe(25));
  it("zero for same", () => expect(dist2(2, 2, 2, 2)).toBe(0));
});

describe("lerpAngle", () => {
  it("interpolates", () => expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 4));
  it("wraps PI boundary", () => {
    const r = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 1);
    expect(Math.abs(r)).toBeLessThan(Math.PI);
  });
});

describe("scores", () => {
  it("kill = 50", () => expect(scoreForKill()).toBe(50));
  it("gun = 20", () => expect(scoreForPickup("gun")).toBe(20));
  it("repair = 5", () => expect(scoreForPickup("repair")).toBe(5));
});
