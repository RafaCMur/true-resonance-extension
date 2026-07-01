import { GlobalState } from "./types";

export const A4_STANDARD_FREQUENCY = 440;

export const SOLFEGGIO_REFERENCE: Record<number, number> = {
  174: 174.61,  // F3
  285: 277.18,  // C#4
  396: 392.00,  // G4
  415: 440.00,  // A4 (Baroque)
  432: 440.00,  // A4
  528: 523.25,  // C5
  639: 622.25,  // D#5
  741: 739.99,  // F#5
  852: 830.61,  // G#5
  963: 932.33,  // A#5
};

export function getReferenceFreq(frequency: number): number {
  return SOLFEGGIO_REFERENCE[frequency] ?? A4_STANDARD_FREQUENCY;
}

export function computePitchRatio(s: GlobalState): number {
  return s.frequency / getReferenceFreq(s.frequency);
}
