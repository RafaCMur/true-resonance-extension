const IDEMPOTENCY_KEY = "__trueResonance_injected";

if ((window as unknown as Record<string, unknown>)[IDEMPOTENCY_KEY]) {
  throw new Error("True Resonance: already injected");
}
Object.defineProperty(window, IDEMPOTENCY_KEY, { value: true, writable: false });

import { loadWorklet, applyPitch } from "./audio-graph";
import type { Algorithm } from "./audio-graph";

const SOURCE_INJECTED = "TR_INJECTED";
const SOURCE_CONTENT = "TR_CONTENT";

interface InjectedConfig {
  enabled: boolean;
  mode: "rate" | "pitch";
  pitchRatio: number;
  playbackRate: number;
  semitones: number;
}

let config: InjectedConfig | null = null;
let baseUrl = "";

const OriginalAudioContext = window.AudioContext;
const OriginalWebkitAudioContext = (window as unknown as Record<string, unknown>).webkitAudioContext;

const contextRegistry = new Set<CustomAudioContext>();

class CustomAudioContext extends OriginalAudioContext {
  private _nativeDest: AudioDestinationNode;
  private _virtualDest: GainNode;
  private _workletNode: AudioWorkletNode | null = null;
  private _algorithm: Algorithm | null = null;

  constructor(contextOptions?: AudioContextOptions) {
    super(contextOptions);
    this._nativeDest = super.destination;
    this._virtualDest = this.createGain();
    this._virtualDest.gain.value = 1;
    this._virtualDest.connect(this._nativeDest);
    contextRegistry.add(this);
  }

  override get destination(): AudioDestinationNode {
    return this._virtualDest as unknown as AudioDestinationNode;
  }

  async wireWorklet(): Promise<void> {
    if (this._workletNode || !baseUrl) return;
    try {
      const { node, algorithm } = await loadWorklet(this, baseUrl);
      this._workletNode = node;
      this._algorithm = algorithm;
      this._virtualDest.disconnect();
      this._virtualDest.connect(this._workletNode);
      this._workletNode.connect(this._nativeDest);
      if (config) {
        this.updatePitch(config.pitchRatio);
      }
    } catch (e) {
      console.warn("True Resonance: failed to load worklet", e);
    }
  }

  bypassWorklet(): void {
    if (!this._workletNode) return;
    this._virtualDest.disconnect();
    this._workletNode.disconnect();
    this._workletNode = null;
    this._algorithm = null;
    this._virtualDest.connect(this._nativeDest);
  }

  updatePitch(ratio: number): void {
    if (!this._workletNode || !this._algorithm) return;
    applyPitch(this._workletNode, this._algorithm, ratio, this.currentTime);
  }
}

(window as unknown as Record<string, unknown>).AudioContext = CustomAudioContext;
if (OriginalWebkitAudioContext) {
  (window as unknown as Record<string, unknown>).webkitAudioContext = CustomAudioContext;
}

const registeredMedia = new Set<HTMLMediaElement>();

function isCrossOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
}

function setCrossOrigin(media: HTMLMediaElement): void {
  if (media.crossOrigin) return;
  media.crossOrigin = "anonymous";

  let crossOriginFailed = false;

  media.addEventListener("loadstart", () => {
    if (media.currentSrc && isCrossOrigin(media.currentSrc)) {
      crossOriginFailed = true;
    }
  });

  const onAbort = (e: Event): void => {
    if (!crossOriginFailed) return;
    let next: string | null;
    switch (media.crossOrigin) {
      case "anonymous":
        next = "use-credentials";
        break;
      case "use-credentials":
        next = null;
        break;
      default:
        return;
    }
    e.stopImmediatePropagation();
    media.crossOrigin = next as string | null;
    media.load();
  };

  media.addEventListener("abort", onAbort);

  const onDone = (): void => {
    crossOriginFailed = false;
  };
  media.addEventListener("loadedmetadata", onDone);
  media.addEventListener("loadeddata", onDone);
}

let activeCtx: CustomAudioContext | null = null;

async function onMediaPlaying(media: HTMLMediaElement): Promise<void> {
  if (!config) return;

  if (
    activeCtx &&
    (activeCtx.state === "suspended" ||
      activeCtx.state === ("interrupted" as unknown as AudioContextState))
  ) {
    await activeCtx.resume();
  }

  if (config.mode === "rate") {
    media.preservesPitch = false;
    media.playbackRate = config.playbackRate;
    return;
  }

  media.preservesPitch = true;
  media.playbackRate = config.playbackRate;

  if (!activeCtx || activeCtx.state === "closed") {
    activeCtx = new CustomAudioContext();
  }

  await activeCtx.wireWorklet();
  activeCtx.updatePitch(config.pitchRatio);

  try {
    const source = activeCtx.createMediaElementSource(media);
    source.connect(activeCtx.destination);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "InvalidStateError") {
      return;
    }
    if (e instanceof DOMException && e.name === "SecurityError") {
      console.warn(
        "True Resonance: SecurityError on",
        window.location.hostname,
        "- falling back to rate mode",
      );
      media.preservesPitch = false;
      media.playbackRate = config.playbackRate;
      window.postMessage(
        { source: SOURCE_INJECTED, type: "NEEDS_TIER2", reason: "CORS" },
        "*",
      );
      return;
    }
    throw e;
  }
}

function registerMedia(media: HTMLMediaElement): void {
  if (registeredMedia.has(media)) return;
  registeredMedia.add(media);

  setCrossOrigin(media);
  media.preservesPitch = true;
  media.addEventListener("playing", () => void onMediaPlaying(media));

  if (
    !media.paused &&
    media.currentTime > 0 &&
    media.readyState >= 2
  ) {
    void onMediaPlaying(media);
  }
}

try {
  const OriginalAudio = (window as unknown as Record<string, unknown>).Audio;
  (window as unknown as Record<string, unknown>).Audio =
    class extends (OriginalAudio as new (src?: string) => HTMLAudioElement) {
      constructor(src?: string) {
        super(src);
        registerMedia(this as unknown as HTMLAudioElement);
      }
    };
} catch {
  // Audio extension not supported in this browser
}

const originalCreateElement = document.createElement.bind(document) as (
  tagName: string,
  options?: ElementCreationOptions,
) => HTMLElement;

document.createElement = function createElement(
  tagName: string,
  options?: ElementCreationOptions,
): HTMLElement {
  const element = originalCreateElement(tagName, options);
  if (element instanceof HTMLMediaElement) {
    registerMedia(element);
  }
  return element;
} as typeof document.createElement;

function scanDocument(): void {
  document.querySelectorAll("audio, video").forEach((el) => {
    if (el instanceof HTMLMediaElement) {
      registerMedia(el);
    }
  });
}

let observer: MutationObserver | null = null;

function startObserving(): void {
  if (observer || !document.body) return;
  scanDocument();

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLMediaElement) {
          registerMedia(node);
        } else if (node instanceof Element) {
          node.querySelectorAll("audio, video").forEach((el) => {
            if (el instanceof HTMLMediaElement) {
              registerMedia(el);
            }
          });
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) {
  startObserving();
} else {
  document.addEventListener("DOMContentLoaded", startObserving);
}

function applyConfig(newConfig: InjectedConfig): void {
  config = newConfig;

  for (const ctx of contextRegistry) {
    if (ctx.state === "closed") {
      contextRegistry.delete(ctx);
      continue;
    }
    if (newConfig.enabled && newConfig.mode === "pitch") {
      void ctx.wireWorklet().then(() => {
        ctx.updatePitch(newConfig.pitchRatio);
      });
    } else {
      ctx.bypassWorklet();
    }
  }

  for (const media of registeredMedia) {
    if (!newConfig.enabled) {
      media.preservesPitch = true;
      media.playbackRate = 1;
    } else if (newConfig.mode === "rate") {
      media.preservesPitch = false;
      media.playbackRate = newConfig.playbackRate;
    } else {
      media.preservesPitch = true;
      media.playbackRate = newConfig.playbackRate;
    }
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const data = event.data as { source?: string; type?: string; config?: InjectedConfig; baseUrl?: string } | undefined;
  if (!data || data.source !== SOURCE_CONTENT) return;

  if (data.type === "UPDATE_CONFIG" && data.config) {
    baseUrl = data.baseUrl || "";
    applyConfig(data.config);
  }
});
