import { clamp, dist2, lerpAngle } from "./logic";

test("clamp", () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-1, 0, 10)).toBe(0);
  expect(clamp(15, 0, 10)).toBe(10);
});

test("dist2", () => {
  expect(dist2(0, 0, 3, 4)).toBe(25);
});

test("lerpAngle wraps", () => {
  const r = lerpAngle(Math.PI * 0.9, -Math.PI * 0.9, 0.5);
  expect(Math.abs(r)).toBeGreaterThan(Math.PI * 0.8);
});
