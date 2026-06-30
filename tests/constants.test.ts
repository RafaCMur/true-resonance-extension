import { describe, it, expect, vi, beforeEach } from "vitest";

import { computePitchRatio } from "../src/shared/constants";
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

  it("uses C5 reference (523.251...) for 528 Hz", () => {
    const expected = 528 / 523.2511306011972;
    expect(computePitchRatio(s({ frequency: 528 }))).toBeCloseTo(expected, 10);
  });

  it("C5 reference ratio is greater than 1", () => {
    expect(computePitchRatio(s({ frequency: 528 }))).toBeGreaterThan(1.0);
  });

  it("432 Hz ratio is less than 1", () => {
    expect(computePitchRatio(s({ frequency: 432 }))).toBeLessThan(1.0);
  });

  it("frequencies with mode 'rate' still return non-1 ratio", () => {
    // computePitchRatio does NOT check mode — that's consumer's job.
    // It just returns frequency/refFrequency.
    expect(computePitchRatio(s({ frequency: 432, mode: "rate" }))).toBeCloseTo(
      432 / 440,
      10,
    );
  });
});
