import { describe, it, expect, beforeEach } from "vitest";
import { getReferenceFreq } from "../src/shared/constants";
import {
  setMode,
  setFrequency,
  recalculateFactors,
  getState,
} from "../src/content/state";

// Module-level mutable state — reset before each test.
beforeEach(() => {
  setMode("pitch");
  setFrequency(440);
  recalculateFactors();
});

describe("getReferenceFreq", () => {
  it("returns A4_STANDARD_FREQUENCY (440) for 432", () => {
    expect(getReferenceFreq(432)).toBe(440);
  });

  it("returns A4_STANDARD_FREQUENCY (440) for 440", () => {
    expect(getReferenceFreq(440)).toBe(440);
  });

  it("returns A4_STANDARD_FREQUENCY (440) for 415 (Baroque)", () => {
    expect(getReferenceFreq(415)).toBe(440);
  });

  it("returns C5_STANDARD_FREQUENCY (523.25...) for 528", () => {
    expect(getReferenceFreq(528)).toBeCloseTo(523.25, 10);
  });
});

describe("recalculateFactors + getState", () => {
  it("pitch mode: pitch = frequency/ref, playbackRate = 1", () => {
    setFrequency(432);
    setMode("pitch");
    recalculateFactors();
    const s = getState();
    expect(s.currentPlaybackRate).toBe(1);
    expect(s.currentPitch).toBeCloseTo(432 / 440, 10);
    expect(s.currentSemitones).toBeCloseTo(12 * Math.log2(432 / 440), 10);
  });

  it("415 Hz Baroque pitch mode uses A4 reference", () => {
    setFrequency(415);
    setMode("pitch");
    recalculateFactors();
    const s = getState();
    expect(s.currentPlaybackRate).toBe(1);
    expect(s.currentPitch).toBeCloseTo(415 / 440, 10);
    expect(s.currentSemitones).toBeCloseTo(12 * Math.log2(415 / 440), 10);
  });

  it("rate mode: playbackRate = frequency/ref, pitch = 1", () => {
    setFrequency(432);
    setMode("rate");
    recalculateFactors();
    const s = getState();
    expect(s.currentPitch).toBe(1);
    expect(s.currentPlaybackRate).toBeCloseTo(432 / 440, 10);
    expect(s.currentSemitones).toBe(0);
  });

  it("528 Hz pitch mode uses C5 reference", () => {
    setFrequency(528);
    setMode("pitch");
    recalculateFactors();
    const s = getState();
    expect(s.currentPitch).toBeCloseTo(528 / 523.25, 10);
    expect(s.currentPlaybackRate).toBe(1);
  });

  it("440 Hz pitch mode yields 1/1", () => {
    setFrequency(440);
    setMode("pitch");
    recalculateFactors();
    const s = getState();
    expect(s.currentPitch).toBe(1);
    expect(s.currentPlaybackRate).toBe(1);
    expect(s.currentSemitones).toBe(0);
  });

  it("default state is 440 pitch mode", () => {
    const s = getState();
    expect(s.mode).toBe("pitch");
    expect(s.targetFrequency).toBe(440);
    expect(s.currentPitch).toBe(1);
    expect(s.currentPlaybackRate).toBe(1);
  });
});
