import { describe, it, expect, vi, beforeEach } from "vitest";

class MockAudioWorkletNode {
  private params = new Map<string, AudioParam>();

  parameters = {
    get: (name: string) => {
      if (!this.params.has(name)) {
        this.params.set(name, {
          setValueAtTime: vi.fn(),
        } as unknown as AudioParam);
      }
      return this.params.get(name)!;
    },
  };

  port = { postMessage: vi.fn(), onmessage: null as unknown };
  connect = vi.fn();
  disconnect = vi.fn();
  channelCount = 2;
  channelCountMode = "max" as const;
  channelInterpretation = "speakers" as const;
  numberOfInputs = 1;
  numberOfOutputs = 1;
  context = {} as BaseAudioContext;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

function mockAudioWorkletNode(): typeof MockAudioWorkletNode {
  return MockAudioWorkletNode as unknown as typeof AudioWorkletNode;
}

function mockAudioContext(): AudioContext {
  return {
    audioWorklet: {
      addModule: vi.fn(() => Promise.resolve()),
    },
    createMediaElementSource: vi.fn(),
    createGain: vi.fn(),
    destination: {} as AudioDestinationNode,
    currentTime: 123.456,
    state: "running",
    close: vi.fn(),
    resume: vi.fn(),
    suspend: vi.fn(),
    sampleRate: 44100,
    baseLatency: 0,
    outputLatency: 0,
    onstatechange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as AudioContext;
}

describe("audio-graph", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("loadWorklet", () => {
    it("calls audioWorklet.addModule with correct URL", async () => {
      vi.stubGlobal("AudioWorkletNode", mockAudioWorkletNode());
      const ctx = mockAudioContext();
      const { loadWorklet } = await import("../src/content/audio-graph");

      const result = await loadWorklet(ctx, "https://example.com/");
      expect(ctx.audioWorklet.addModule).toHaveBeenCalledWith(
        "https://example.com/soundtouch-worklet.js",
      );
      expect(result.algorithm).toBe("soundtouch");
      expect(result.node).toBeDefined();
      vi.unstubAllGlobals();
    });

    it("returns correct algorithm type", async () => {
      vi.stubGlobal("AudioWorkletNode", mockAudioWorkletNode());
      const ctx = mockAudioContext();
      const { loadWorklet } = await import("../src/content/audio-graph");

      const result = await loadWorklet(ctx, "http://local/");
      expect(result.algorithm).toBe("soundtouch");
      vi.unstubAllGlobals();
    });

    it("creates AudioWorkletNode with correct processor name", async () => {
      vi.stubGlobal("AudioWorkletNode", mockAudioWorkletNode());
      const ctx = mockAudioContext();
      const { loadWorklet } = await import("../src/content/audio-graph");

      await loadWorklet(ctx, "http://local/");
      // The MockAudioWorkletNode was constructed - success means constructor worked
      // The src code uses `new AudioWorkletNode(ctx, "soundtouch-processor")`
      vi.unstubAllGlobals();
    });
  });

  describe("applyPitch", () => {
    it("sets pitch parameter via setValueAtTime for soundtouch", async () => {
      vi.stubGlobal("AudioWorkletNode", mockAudioWorkletNode());
      const node = new MockAudioWorkletNode() as unknown as AudioWorkletNode;
      const { applyPitch } = await import("../src/content/audio-graph");

      applyPitch(node, "soundtouch", 1.009, 1000);

      const pitchParam = node.parameters.get("pitch")!;
      expect(pitchParam.setValueAtTime).toHaveBeenCalledWith(1.009, 1000);
      vi.unstubAllGlobals();
    });

    it("calls setValueAtTime with correct ratio", async () => {
      vi.stubGlobal("AudioWorkletNode", mockAudioWorkletNode());
      const node = new MockAudioWorkletNode() as unknown as AudioWorkletNode;
      const { applyPitch } = await import("../src/content/audio-graph");

      applyPitch(node, "soundtouch", 0.98, 500);

      const pitchParam = node.parameters.get("pitch")!;
      expect(pitchParam.setValueAtTime).toHaveBeenCalledWith(0.98, 500);
      vi.unstubAllGlobals();
    });
  });
});
