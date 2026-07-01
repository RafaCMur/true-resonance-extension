import { describe, it, expect, beforeEach, vi } from "vitest";

let __fireChromeMessage: (msg: unknown, sender?: unknown) => Promise<unknown>;
let __getChromeStorageData: () => Record<string, unknown>;
let __getBadgeText: () => string;

describe("background message routing", () => {
  beforeEach(async () => {
    vi.resetModules();
    const setup = await import("./setup");
    // Reset after resetModules (which gives fresh module for setup)
    setup.__resetChromeMocks();
    __fireChromeMessage = setup.__fireChromeMessage;
    __getChromeStorageData = setup.__getChromeStorageData;
    __getBadgeText = setup.__getBadgeText;
    await import("../src/background/background");
    // initializeExtension runs synchronously in our mock (get callback is sync)
  });

  describe("set action", () => {
    it("updates frequency to 432 and shows badge", async () => {
      const response = await __fireChromeMessage({
        action: "set",
        patch: { enabled: true, frequency: 432 },
      });

      expect(response).toEqual({ ok: true });
      expect(__getBadgeText()).toBe("432");
      expect(__getChromeStorageData().state).toMatchObject({
        enabled: true,
        frequency: 432,
      });
    });

    it("clears badge when frequency is 440", async () => {
      const response = await __fireChromeMessage({
        action: "set",
        patch: { enabled: true, frequency: 440 },
      });

      expect(response).toEqual({ ok: true });
      expect(__getBadgeText()).toBe("");
    });

    it("clears badge when disabled", async () => {
      await __fireChromeMessage({
        action: "set",
        patch: { enabled: true, frequency: 432 },
      });
      await __fireChromeMessage({
        action: "set",
        patch: { enabled: false },
      });

      expect(__getBadgeText()).toBe("");
      expect(__getChromeStorageData().state).toMatchObject({
        enabled: false,
      });
    });

    it("persists state to chrome.storage.local", async () => {
      await __fireChromeMessage({
        action: "set",
        patch: { mode: "rate", frequency: 528 },
      });

      expect(__getChromeStorageData().state).toMatchObject({
        mode: "rate",
        frequency: 528,
      });
    });
  });

  describe("startTabCapture", () => {
    it("responds ok when sender has tab id", async () => {
      const response = await __fireChromeMessage(
        { action: "startTabCapture", reason: "DRM_HOST", host: "open.spotify.com" },
        { tab: { id: 42 } },
      );

      expect(response).toEqual({ ok: true });
    });
  });

  describe("stopTabCapture", () => {
    it("responds ok", async () => {
      const response = await __fireChromeMessage({
        action: "stopTabCapture",
      });

      expect(response).toEqual({ ok: true });
    });
  });

  describe("unknown action", () => {
    it("returns undefined for unknown actions", async () => {
      const response = await Promise.race([
        __fireChromeMessage({ action: "unknown_action_xyz" }),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 500)),
      ]);

      expect(response).toBeUndefined();
    });
  });
});
