import { A4_STANDARD_FREQUENCY, C5_STANDARD_FREQUENCY } from "../shared/constants";
import { GlobalState } from "../shared/types";

const SOURCE_CONTENT = "TR_CONTENT";
const SOURCE_INJECTED = "TR_INJECTED";

function sendConfig(state: GlobalState): void {
  const refFreq =
    state.frequency === 528 ? C5_STANDARD_FREQUENCY : A4_STANDARD_FREQUENCY;
  const pitchRatio = state.frequency / refFreq;

  window.postMessage(
    {
      source: SOURCE_CONTENT,
      type: "UPDATE_CONFIG",
      config: {
        enabled: state.enabled,
        mode: state.mode,
        pitchRatio,
        playbackRate: state.mode === "rate" ? pitchRatio : 1,
        semitones: 12 * Math.log2(pitchRatio),
      },
      baseUrl: chrome.runtime.getURL(""),
    },
    "*",
  );
}

chrome.storage.local.get("state", ({ state }) => {
  if (state) sendConfig(state as GlobalState);
});

chrome.storage.onChanged.addListener(({ state }) => {
  if (state?.newValue) sendConfig(state.newValue as GlobalState);
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (window.self !== window.top) return;

  const data = event.data as
    | { source?: string; type?: string; reason?: string; host?: string }
    | undefined;
  if (!data || data.source !== SOURCE_INJECTED) return;

  if (data.type === "NEEDS_TIER2") {
    chrome.runtime.sendMessage({
      action: "startTabCapture",
      reason: data.reason,
      host: data.host,
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === "stopTabCapture") {
    window.postMessage(
      { source: SOURCE_CONTENT, type: "STOP_TIER2" },
      "*",
    );
  }
});

export {};
