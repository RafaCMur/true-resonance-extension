import { describe, it, expect, vi, beforeEach } from "vitest";

import { computePitchRatio, getReferenceFreq } from "../src/shared/constants";
import type { GlobalState } from "../src/shared/types";

function s(
  overrides: Partial<GlobalState> = {},
): GlobalState {
  return {
    enabled: true,
    mode: "pitch",
    frequency: 440,
    ...overrides,
  };
}

describe("computePitchRatio", () => {
  it("returns 1.0 for A4=440 Hz", () => {
    expect(computePitchRatio(s({ frequency: 440 }))).toBeCloseTo(1.0, 10);
  });

  it("uses A4 reference (440 Hz) for 432 Hz", () => {
    const expected = 432 / 440;
    expect(computePitchRatio(s({ frequency: 432 }))).toBeCloseTo(expected, 10);
  });

  it("uses A4 reference (440 Hz) for 415 Hz (Baroque)", () => {
    const expected = 415 / 440;
    expect(computePitchRatio(s({ frequency: 415 }))).toBeCloseTo(expected, 10);
  });

  it("uses C5 reference (523.25) for 528 Hz", () => {
    const expected = 528 / 523.25;
    expect(computePitchRatio(s({ frequency: 528 }))).toBeCloseTo(expected, 10);
  });

  it("C5 reference ratio is greater than 1", () => {
    expect(computePitchRatio(s({ frequency: 528 }))).toBeGreaterThan(1.0);
  });

  it("432 Hz ratio is less than 1", () => {
    expect(computePitchRatio(s({ frequency: 432 }))).toBeLessThan(1.0);
  });

  it("frequencies with mode 'rate' still return non-1 ratio", () => {
    expect(computePitchRatio(s({ frequency: 432, mode: "rate" }))).toBeCloseTo(
      432 / 440,
      10,
    );
  });
});

describe("getReferenceFreq", () => {
  it("returns 440 for 432 Hz (A4 reference)", () => {
    expect(getReferenceFreq(432)).toBe(440);
  });

  it("returns 440 for 440 Hz (A4 reference)", () => {
    expect(getReferenceFreq(440)).toBe(440);
  });

  it("returns 523.25 for 528 Hz (C5 reference)", () => {
    expect(getReferenceFreq(528)).toBeCloseTo(523.25, 10);
  });

  it("returns note reference for each Solfeggio frequency", () => {
    expect(getReferenceFreq(174)).toBeCloseTo(174.61, 10);
    expect(getReferenceFreq(285)).toBeCloseTo(277.18, 10);
    expect(getReferenceFreq(396)).toBeCloseTo(392.00, 10);
    expect(getReferenceFreq(415)).toBeCloseTo(440.00, 10);
    expect(getReferenceFreq(639)).toBeCloseTo(622.25, 10);
    expect(getReferenceFreq(741)).toBeCloseTo(739.99, 10);
    expect(getReferenceFreq(852)).toBeCloseTo(830.61, 10);
    expect(getReferenceFreq(963)).toBeCloseTo(932.33, 10);
  });

  it("returns 440 default for unknown frequencies", () => {
    expect(getReferenceFreq(999)).toBe(440);
  });
});
