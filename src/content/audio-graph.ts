export type Algorithm = "soundtouch";

export interface WorkletResult {
  node: AudioWorkletNode;
  algorithm: Algorithm;
}

export async function loadWorklet(
  ctx: AudioContext,
  baseUrl: string,
): Promise<WorkletResult> {
  await ctx.audioWorklet.addModule(baseUrl + "soundtouch-worklet.js");
  const node = new AudioWorkletNode(ctx, "soundtouch-processor");
  return { node, algorithm: "soundtouch" };
}

export function applyPitch(
  node: AudioWorkletNode,
  algorithm: Algorithm,
  ratio: number,
  currentTime: number,
): void {
  // TODO: Add Signalsmith algorithm support (v2.4.0)
  if (algorithm === "soundtouch") {
    node.parameters.get("pitch")!.setValueAtTime(ratio, currentTime);
  }
}
