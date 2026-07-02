import { describe, it, expect } from "vitest";
import {
  classifyRateChange,
  SELF_THRESHOLD,
  BASE_THRESHOLD,
} from "../src/content/rate-override";

const TARGET_432 = 432 / 440; // 0.9818181...
const TARGET_528 = 528 / 523.25; // 1.0090822...
const TARGET_440 = 440 / 440; // 1.0

describe("classifyRateChange constants", () => {
  it("thresholds are positive and ordered", () => {
    expect(SELF_THRESHOLD).toBeGreaterThan(0);
    expect(BASE_THRESHOLD).toBeGreaterThan(0);
    expect(BASE_THRESHOLD).toBeGreaterThan(SELF_THRESHOLD);
  });
});

describe("classifyRateChange: self", () => {
  it("432Hz exact target → self", () => {
    expect(classifyRateChange(TARGET_432, TARGET_432)).toBe("self");
  });

  it("432Hz within SELF_THRESHOLD float imprecision → self", () => {
    const near = TARGET_432 + SELF_THRESHOLD * 0.5;
    expect(classifyRateChange(near, TARGET_432)).toBe("self");
  });

  it("528Hz exact target → self", () => {
    expect(classifyRateChange(TARGET_528, TARGET_528)).toBe("self");
  });

  it("440Hz exact (target=1.0) → self", () => {
    expect(classifyRateChange(TARGET_440, TARGET_440)).toBe("self");
  });
});

describe("classifyRateChange: base (user back to 1x)", () => {
  it("432Hz user 1x → base", () => {
    expect(classifyRateChange(1.0, TARGET_432)).toBe("base");
  });

  it("528Hz user 1x → base (target 1.009, current 1.0)", () => {
    expect(classifyRateChange(1.0, TARGET_528)).toBe("base");
  });

  it("432Hz user 0.9995 → base (within BASE_THRESHOLD of 1.0)", () => {
    expect(classifyRateChange(0.9995, TARGET_432)).toBe("base");
  });

  it("528Hz user 1.0005 → base (within BASE_THRESHOLD of 1.0)", () => {
    expect(classifyRateChange(1.0005, TARGET_528)).toBe("base");
  });
});

describe("classifyRateChange: override (user picked custom speed)", () => {
  it("432Hz user 1.5x → override", () => {
    expect(classifyRateChange(1.5, TARGET_432)).toBe("override");
  });

  it("432Hz user 0.75x → override", () => {
    expect(classifyRateChange(0.75, TARGET_432)).toBe("override");
  });

  it("432Hz user 2x → override", () => {
    expect(classifyRateChange(2.0, TARGET_432)).toBe("override");
  });

  it("528Hz user 1.25x → override", () => {
    expect(classifyRateChange(1.25, TARGET_528)).toBe("override");
  });

  it("440Hz user 2x → override (no tuning to lose)", () => {
    expect(classifyRateChange(2.0, TARGET_440)).toBe("override");
  });
});

describe("classifyRateChange: order of checks (self before base)", () => {
  it("528Hz target 1.009 + user 1.0 → base (not self despite 1.0 ≈ target)", () => {
    expect(classifyRateChange(1.0, TARGET_528)).toBe("base");
  });

  it("440Hz target 1.0 + user 1.0 → self (not base despite == 1.0)", () => {
    expect(classifyRateChange(1.0, TARGET_440)).toBe("self");
  });

  it("432Hz target 0.982 + user exactly 0.982 → self (not override)", () => {
    expect(classifyRateChange(TARGET_432, TARGET_432)).toBe("self");
  });
});

describe("classifyRateChange: boundary precision", () => {
  it("just outside SELF_THRESHOLD (delta = SELF_THRESHOLD * 2) → not self", () => {
    // use a margin comfortably past SELF to avoid fp boundary issues
    const current = TARGET_432 + SELF_THRESHOLD * 2;
    const result = classifyRateChange(current, TARGET_432);
    expect(result).not.toBe("self");
  });

  it("just outside BASE_THRESHOLD (delta = BASE_THRESHOLD * 2) → override", () => {
    const current = 1.0 + BASE_THRESHOLD * 2;
    // vs target TARGET_432 (~0.982): not self, not base → override
    expect(classifyRateChange(current, TARGET_432)).toBe("override");
  });

  it("YouTube preset 0.75 vs 432Hz target → override", () => {
    expect(classifyRateChange(0.75, TARGET_432)).toBe("override");
  });

  it("YouTube preset 1.75 vs 528Hz target → override", () => {
    expect(classifyRateChange(1.75, TARGET_528)).toBe("override");
  });
});
