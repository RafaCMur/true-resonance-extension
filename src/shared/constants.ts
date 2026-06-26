import { GlobalState } from "./types";

export const WORKLET_PATH = chrome.runtime.getURL("soundtouch-worklet.js");
export const C5_STANDARD_FREQUENCY = 523.2511306011972;
export const A4_STANDARD_FREQUENCY = 440;

export function computePitchRatio(s: GlobalState): number {
  const refFreq =
    s.frequency === 528 ? C5_STANDARD_FREQUENCY : A4_STANDARD_FREQUENCY;
  return s.frequency / refFreq;
}
