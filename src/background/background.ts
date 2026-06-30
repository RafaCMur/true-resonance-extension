import { A4_STANDARD_FREQUENCY, computePitchRatio } from "../shared/constants";
import { GlobalState } from "../shared/types";

const DEFAULT_STATE: GlobalState = {
  enabled: false,
  mode: "pitch",
  frequency: A4_STANDARD_FREQUENCY,
};

let state: GlobalState = { ...DEFAULT_STATE };

let _initialized = false;
const _queue: Array<{ patch: Partial<GlobalState> }> = [];

let _capturedTabId: number | null = null;
let _capturing: Promise<void> | null = null;

function updateBadge(s: GlobalState): void {
  if (s.enabled && s.frequency !== A4_STANDARD_FREQUENCY) {
    chrome.action.setBadgeText({ text: String(s.frequency) });
    chrome.action.setBadgeBackgroundColor({ color: "#c4b5fd" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

function initializeExtension() {
  chrome.storage.local.get("state", (res) => {
    if (res.state) {
      state = res.state;
    } else {
      state = { ...DEFAULT_STATE };
      persistState();
    }
    _initialized = true;
    updateBadge(state);
    _queue.forEach(({ patch }) => setState(patch));
    _queue.length = 0;
  });
}

initializeExtension();

chrome.runtime.onStartup.addListener(() => {
  initializeExtension();
});

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "tabCapture audio pitch processing",
  });
}

async function handleStartTabCapture(
  tabId: number,
  _reason?: string,
  _host?: string,
): Promise<void> {
  if (_capturing) {
    await _capturing;
    if (_capturedTabId === tabId) return;
  }
  const myPromise = doStartTabCapture(tabId, _reason, _host);
  _capturing = myPromise;
  try {
    await myPromise;
  } finally {
    if (_capturing === myPromise) _capturing = null;
  }
}

async function doStartTabCapture(
  tabId: number,
  _reason?: string,
  _host?: string,
): Promise<void> {
  if (_capturedTabId !== null && _capturedTabId !== tabId) {
    await handleStopTabCapture();
  }
  if (_capturedTabId === tabId) return;

  let streamId: string;
  try {
    streamId = await new Promise<string>((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(id);
        }
      });
    });
  } catch {
    return;
  }
  if (!streamId) return;

  try {
    await ensureOffscreenDocument();
  } catch {
    return;
  }

  const pitch = computePitchRatio(state);
  try {
    const response = await chrome.runtime.sendMessage({
      target: "offscreen",
      action: "startCapture",
      streamId,
      pitch,
      enabled: state.enabled,
    });
    if (!response || response.success !== true) return;
  } catch {
    return;
  }

  _capturedTabId = tabId;
}

async function handleStopTabCapture(): Promise<void> {
  if (_capturedTabId === null) return;
  chrome.runtime
    .sendMessage({ target: "offscreen", action: "stopCapture" })
    .catch(() => {});
  try {
    await chrome.tabs.sendMessage(_capturedTabId, {
      action: "stopTabCapture",
    });
  } catch {
    // tab may already be gone or content script not loaded
  }
  _capturedTabId = null;
}

function handleSetTabCapturePitch(): void {
  if (_capturedTabId === null) return;
  const pitch = computePitchRatio(state);
  chrome.runtime
    .sendMessage({
      target: "offscreen",
      action: "setPitch",
      pitch,
      enabled: state.enabled,
    })
    .catch(() => {});
}

async function injectIntoExistingTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    const url = tab.url ?? "";
    if (
      url.startsWith("chrome://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:") ||
      url.startsWith("chrome-extension://")
    ) {
      continue;
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["injected.js"],
        world: "MAIN",
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content_script.js"],
      });
    } catch {
      // protected pages (Chrome Web Store, file://, etc.) — silently ignore
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  initializeExtension();
  if (details.reason === "install") {
    void injectIntoExistingTabs();
  }
});

chrome.tabs.onActivated.addListener(() => {
  if (_initialized) updateBadge(state);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (_capturedTabId === tabId) {
    _capturedTabId = null;
    chrome.runtime
      .sendMessage({ target: "offscreen", action: "stopCapture" })
      .catch(() => {});
  }
});

function persistState() {
  chrome.storage.local.set({ state });
}

function setState(patch: Partial<GlobalState>) {
  state = { ...state, ...patch };
  persistState();
  updateBadge(state);

  if (!state.enabled && _capturedTabId !== null) {
    void handleStopTabCapture();
  } else if (_capturedTabId !== null) {
    handleSetTabCapturePitch();
  }
}

const VALID_FREQUENCIES = new Set([432, 440, 528]);
const VALID_MODES = new Set(["pitch", "rate"]);

/**
 * Validates a message patch before applying it to global state.
 * Rejects non-objects, wrong-typed fields, and unknown keys.
 */
function isValidPatch(patch: unknown): patch is Partial<GlobalState> {
  if (!patch || typeof patch !== "object") return false;
  const p = patch as Record<string, unknown>;
  if ("enabled" in p && typeof p.enabled !== "boolean") return false;
  if ("mode" in p && (!p.mode || !VALID_MODES.has(p.mode as string)))
    return false;
  if ("frequency" in p && !VALID_FREQUENCIES.has(p.frequency as number))
    return false;
  const validKeys = ["enabled", "mode", "frequency"];
  return Object.keys(p).every((k) => validKeys.includes(k));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "set") {
    if (!isValidPatch(msg.patch)) {
      sendResponse({ ok: false, error: "invalid patch" });
      return;
    }
    if (!_initialized) {
      _queue.push({ patch: msg.patch });
      sendResponse?.({ queued: true });
      return;
    }
    setState(msg.patch);
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === "startTabCapture" && sender.tab?.id !== undefined) {
    void handleStartTabCapture(sender.tab.id, msg.reason, msg.host);
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === "stopTabCapture") {
    void handleStopTabCapture();
    sendResponse({ ok: true });
    return;
  }
});

export {};
