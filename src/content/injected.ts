import { loadWorklet, applyPitch } from "./audio-graph";
import type { Algorithm } from "./audio-graph";
import { isDRMHost } from "../shared/drm";
import { classifyRateChange } from "./rate-override";

const IDEMPOTENCY_KEY = "__trueResonance_injected";

if (!(window as unknown as Record<string, unknown>)[IDEMPOTENCY_KEY]) {
  Object.defineProperty(window, IDEMPOTENCY_KEY, {
    value: true,
    writable: false,
  });

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

  let tier2Requested = false;

  const OriginalAudioContext = window.AudioContext;
  const OriginalWebkitAudioContext = (
    window as unknown as Record<string, unknown>
  ).webkitAudioContext;

  const contextRegistry = new Set<CustomAudioContext>();

  class CustomAudioContext extends OriginalAudioContext {
    private _nativeDest: AudioDestinationNode;
    private _virtualDest: GainNode;
    private _workletNode: AudioWorkletNode | null = null;
    private _algorithm: Algorithm | null = null;
    private _wiring = false;

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
      if (this._workletNode || this._wiring || !baseUrl) return;
      this._wiring = true;
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
      } finally {
        this._wiring = false;
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

  (window as unknown as Record<string, unknown>).AudioContext =
    CustomAudioContext;
  if (OriginalWebkitAudioContext) {
    (window as unknown as Record<string, unknown>).webkitAudioContext =
      CustomAudioContext;
  }

  const registeredMedia = new Set<HTMLMediaElement>();

  const overriddenMedia = new Set<HTMLMediaElement>();

  function isCrossOrigin(url: string): boolean {
    try {
      return (
        new URL(url, window.location.href).origin !== window.location.origin
      );
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

    const onError = (e: Event): void => {
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

    media.addEventListener("error", onError);

    const onDone = (): void => {
      crossOriginFailed = false;
    };
    media.addEventListener("loadedmetadata", onDone);
    media.addEventListener("loadeddata", onDone);
  }

  let activeCtx: CustomAudioContext | null = null;

  function reapplyConfig(media: HTMLMediaElement): void {
    if (!config || !config.enabled) return;
    if (config.mode === "rate") {
      if (overriddenMedia.has(media)) return;
      if (media.playbackRate !== config.playbackRate) {
        media.playbackRate = config.playbackRate;
      }
    } else if (activeCtx && activeCtx.state !== "closed") {
      activeCtx.updatePitch(config.pitchRatio);
    }
  }

  function handleRateChange(media: HTMLMediaElement): void {
    if (!config || !config.enabled) return;
    if (config.mode !== "rate") {
      reapplyConfig(media);
      return;
    }

    const kind = classifyRateChange(media.playbackRate, config.playbackRate);

    if (kind === "self") {
      overriddenMedia.delete(media);
      return;
    }

    if (kind === "base") {
      overriddenMedia.delete(media);
      media.preservesPitch = false;
      media.playbackRate = config.playbackRate;
      return;
    }

    overriddenMedia.add(media);
    media.preservesPitch = true;
  }

  async function onMediaPlaying(media: HTMLMediaElement): Promise<void> {
    if (!config || !config.enabled) return;

    if (
      isDRMHost(window.location.hostname) &&
      config.enabled &&
      !tier2Requested
    ) {
      tier2Requested = true;
      window.postMessage(
        {
          source: SOURCE_INJECTED,
          type: "NEEDS_TIER2",
          reason: "DRM_HOST",
          host: window.location.hostname,
        },
        window.location.origin,
      );
      return;
    }

    if (
      activeCtx &&
      (activeCtx.state === "suspended" ||
        activeCtx.state === ("interrupted" as unknown as AudioContextState))
    ) {
      await activeCtx.resume();
    }

    if (config.mode === "rate") {
      if (overriddenMedia.has(media)) {
        media.preservesPitch = true;
        return;
      }
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
        if (!tier2Requested) {
          tier2Requested = true;
          window.postMessage(
            { source: SOURCE_INJECTED, type: "NEEDS_TIER2", reason: "CORS" },
            window.location.origin,
          );
        }
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
    media.addEventListener("play", () => void onMediaPlaying(media));
    media.addEventListener("loadstart", () => void onMediaPlaying(media));
    media.addEventListener("seeked", () => reapplyConfig(media));
    media.addEventListener("ratechange", () => handleRateChange(media));

    if (!media.paused && media.currentTime > 0 && media.readyState >= 2) {
      void onMediaPlaying(media);
    }
  }

  try {
    const OriginalAudio = (window as unknown as Record<string, unknown>).Audio;
    (window as unknown as Record<string, unknown>).Audio = class extends (
      (OriginalAudio as new (src?: string) => HTMLAudioElement)
    ) {
      constructor(src?: string) {
        super(src);
        registerMedia(this as unknown as HTMLMediaElement);
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
    const oldConfig = config;
    if (
      oldConfig &&
      (oldConfig.mode !== newConfig.mode ||
        oldConfig.enabled !== newConfig.enabled)
    ) {
      overriddenMedia.clear();
    }
    config = newConfig;
    tier2Requested = false;

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
        if (overriddenMedia.has(media)) {
          media.preservesPitch = true;
        } else {
          media.preservesPitch = false;
          media.playbackRate = newConfig.playbackRate;
        }
      } else {
        media.preservesPitch = true;
        media.playbackRate = newConfig.playbackRate;
        if (!media.paused) void onMediaPlaying(media);
      }
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;

    const data = event.data as
      | {
          source?: string;
          type?: string;
          config?: InjectedConfig;
          baseUrl?: string;
        }
      | undefined;
    if (!data || data.source !== SOURCE_CONTENT) return;

    if (data.type === "UPDATE_CONFIG" && data.config) {
      baseUrl = data.baseUrl || "";
      applyConfig(data.config);
    }

    if (data.type === "STOP_TIER2") {
      tier2Requested = false;
    }
  });
}
