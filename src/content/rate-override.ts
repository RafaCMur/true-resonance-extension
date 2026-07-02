export const SELF_THRESHOLD = 1e-4;
export const BASE_THRESHOLD = 1e-3;

export type RateChangeKind = "self" | "base" | "override";

export function classifyRateChange(
  currentRate: number,
  targetRate: number,
): RateChangeKind {
  if (Math.abs(currentRate - targetRate) < SELF_THRESHOLD) return "self";
  if (Math.abs(currentRate - 1.0) < BASE_THRESHOLD) return "base";
  return "override";
}
