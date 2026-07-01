export type Frequency = 174 | 285 | 396 | 415 | 432 | 440 | 528 | 639 | 741 | 852 | 963;
export type Mode = "rate" | "pitch";
export type MediaElem = HTMLVideoElement | HTMLAudioElement;

export interface SoundtouchNodes {
  src: MediaElementAudioSourceNode;
}

export interface GlobalState {
  enabled: boolean;
  mode: Mode;
  frequency: Frequency;
}
