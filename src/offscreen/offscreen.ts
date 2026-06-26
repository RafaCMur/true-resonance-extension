const WORKLET_URL = chrome.runtime.getURL("soundtouch-worklet.js");

let _ctx: AudioContext | null = null;
let _processor: AudioWorkletNode | null = null;
let _source: MediaStreamAudioSourceNode | null = null;
let _stream: MediaStream | null = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== "offscreen") return false;

  if (msg.action === "startCapture") {
    startCapture(msg.streamId, msg.pitch, msg.enabled !== false).then(
      sendResponse,
    );
    return true;
  }
  if (msg.action === "setPitch") {
    if (msg.enabled === false) {
      stopCapture();
      return false;
    }
    setPitch(msg.pitch);
    return false;
  }
  if (msg.action === "stopCapture") {
    stopCapture();
    return false;
  }
  return false;
});

async function startCapture(
  streamId: string,
  pitch: number,
  enabled: boolean,
): Promise<{ success: boolean }> {
  if (!enabled) {
    stopCapture();
    return { success: true };
  }
  try {
    stopCapture();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      } as unknown as MediaTrackConstraints,
      video: false,
    });

    _stream = stream;
    _ctx = new AudioContext();

    await _ctx.audioWorklet.addModule(WORKLET_URL);
    _processor = new AudioWorkletNode(_ctx, "soundtouch-processor");
    _processor.connect(_ctx.destination);

    _source = _ctx.createMediaStreamSource(stream);
    _source.connect(_processor);

    setPitch(pitch);

    return { success: true };
  } catch (error) {
    console.error("[True Resonance Offscreen] capture failed:", error);
    stopCapture();
    return { success: false };
  }
}

function setPitch(value: number): void {
  if (!_processor || !_ctx) return;
  _processor.parameters.get("pitch")!.setValueAtTime(value, _ctx.currentTime);
}

function stopCapture(): void {
  if (_source) {
    try {
      _source.disconnect();
    } catch (_) {}
    _source = null;
  }
  if (_processor) {
    try {
      _processor.disconnect();
    } catch (_) {}
    _processor = null;
  }
  if (_ctx) {
    _ctx.close();
    _ctx = null;
  }
  if (_stream) {
    _stream.getTracks().forEach((t) => t.stop());
    _stream = null;
  }
}

export {};
