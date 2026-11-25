import { describe, expect, it } from "vitest";
import { clean, decode, DEFAULT_DESIGN, encode, stats, type Design } from "./design";

const d = (over: Partial<Design>): Design => ({ ...DEFAULT_DESIGN, ...over });

describe("stats", () => {
  it("gives the default boat a sound, middling set of numbers", () => {
    const s = stats(DEFAULT_DESIGN);
    expect(s.capsizes).toBe(false);
    expect(s.speed).toBeGreaterThan(4);
    expect(s.stability).toBeGreaterThan(3.5);
    expect(s.charm).toBeGreaterThanOrEqual(7);
  });
  it("rolls a racer over under three square masts and two storeys", () => {
    const s = stats(d({ hull: "racer", rig: "square", masts: 3, cabin: "tall" }));
    expect(s.capsizes).toBe(true);
    expect(s.warnings[0]).toMatch(/roll over/);
  });
  it("keeps a broad houseboat upright under the same rig, but slow to warn", () => {
    const s = stats(d({ hull: "house", rig: "gaff", masts: 1, cabin: "tall" }));
    expect(s.capsizes).toBe(false);
    expect(s.warnings.join(" ")).toMatch(/Slow/);
  });
  it("makes more sail faster and less steady", () => {
    const one = stats(d({ masts: 1 })), three = stats(d({ masts: 3 }));
    expect(three.speed).toBeGreaterThan(one.speed);
    expect(three.stability).toBeLessThan(one.stability);
  });
  it("rewards a motif, a name and a contrasting stripe with charm", () => {
    const plain = stats(d({ motif: "none", name: "", stripe: "teak", paint: "teak" }));
    expect(stats(DEFAULT_DESIGN).charm - plain.charm).toBe(4);
  });
  it("keeps every number between 0 and 10", () => {
    for (const hull of ["trader", "racer", "house"] as const)
      for (const masts of [1, 2, 3] as const)
        for (const cabin of ["none", "low", "tall"] as const) {
          const s = stats(d({ hull, masts, cabin, rig: "square" }));
          for (const v of [s.speed, s.stability, s.charm]) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(10);
          }
        }
  });
});

describe("saving and sharing", () => {
  it("round-trips a design through a share code, names with any characters included", () => {
    const boat = d({ hull: "racer", rig: "tanja", masts: 3, motif: "lotus", name: "Ombak ~ Biru ✦" });
    const code = encode(boat);
    expect(code).toMatch(/^[\w-]+$/);
    expect(decode(code)).toEqual(boat);
  });
  it("refuses codes that are not designs", () => {
    expect(decode("not a code!")).toBeNull();
    expect(decode(btoa("2~racer"))).toBeNull();
  });
  it("puts unknown parts back to the defaults and trims the name", () => {
    expect(clean({ hull: "submarine", masts: 9, motif: "__proto__", name: `  <b>${"x".repeat(40)}</b> ` })).toEqual({
      ...DEFAULT_DESIGN,
      name: `b${"x".repeat(23)}`,
    });
    expect(clean(null)).toEqual(DEFAULT_DESIGN);
  });
});
