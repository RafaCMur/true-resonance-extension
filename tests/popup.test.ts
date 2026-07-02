import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

let __fireStorageChange: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void;
let __resetChromeMocks: () => void;
let __setChromeStorageData: (data: Record<string, unknown>) => void;

function setupPopupDOM(): void {
  document.body.innerHTML = `
    <div class="app-container">
      <div id="disabledOverlay"></div>
      <div id="mainView" class="main-view">
        <button id="powerToggle"></button>
        <button id="settingsBtn"></button>
        <button id="pitch-432-btn"></button>
        <button id="pitch-528-btn"></button>
        <button id="reset-btn"></button>
        <button id="pitch-mode-btn"></button>
        <button id="rate-mode-btn"></button>
        <div id="statusSubtitle"></div>
      </div>
      <div id="settingsView" class="settings-view hidden">
        <button id="backFromSettings"></button>
        <button id="openAboutBtn"></button>
        <button id="resetAllBtn"></button>
        <button id="languageBtn">English</button>
        <div id="languageMenu" class="dropdown">
          <div class="dropdown-item" data-lang="en">English</div>
          <div class="dropdown-item" data-lang="es">Español</div>
        </div>
        <div id="themeSegment">
          <button class="segment-btn" data-theme="light"></button>
          <button class="segment-btn" data-theme="dark"></button>
          <button class="segment-btn" data-theme="system"></button>
        </div>
      </div>
      <div class="announcement-banner" data-announcement-id="spotify-launch">
        <button class="announcement-dismiss"></button>
      </div>
    </div>
    <span data-i18n="title"></span>
    <span data-i18n-aria-label="subtitle"></span>
  `;
}

describe("popup", () => {
  beforeEach(async () => {
    vi.resetModules();
    const setup = await import("./setup");
    setup.__resetChromeMocks();
    __fireStorageChange = setup.__fireStorageChange;
    __resetChromeMocks = setup.__resetChromeMocks;
    __setChromeStorageData = setup.__setChromeStorageData;

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              title: "True Resonance",
              subtitle: "Play music in healing frequencies",
              pitchOnly: "Pitch Only",
              speedPitch: "Speed & Pitch",
              resetButton: "Reset",
              footerText: "Footer",
              footerQuestions: "Questions?",
              footerReview: "Leave a review",
              footerOpenSource: "Open source",
              contribute: "Contribute",
              donate: "Donate",
              questions: "Questions",
              supportLabel: "Support",
              supportDesc: "Support desc",
              aboutContribute: "Contribute",
              tooltipPitchOnly: "Tooltip Pitch",
              tooltipSpeedPitch: "Tooltip Speed",
              spotifyBanner: "Spotify Banner",
              settingsTitle: "Settings",
              themeLabel: "Theme",
              themeDesc: "Theme description",
              languageLabel: "Language",
              aboutLabel: "About",
              aboutDesc: "About description",
              openAbout: "Open About",
              resetLabel: "Reset Label",
              resetDesc: "Reset Description",
              reset: "Reset",
              dismissAnnouncement: "Dismiss",
            }),
        }),
      ),
    );

    setupPopupDOM();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("DOM integrity", () => {
    it("has all required elements in DOM", async () => {
      await import("../src/popup/popup");
      await vi.waitFor(() => true, { timeout: 100 });

      expect(document.getElementById("powerToggle")).toBeTruthy();
      expect(document.getElementById("settingsBtn")).toBeTruthy();
      expect(document.getElementById("pitch-432-btn")).toBeTruthy();
      expect(document.getElementById("pitch-528-btn")).toBeTruthy();
      expect(document.getElementById("reset-btn")).toBeTruthy();
      expect(document.getElementById("pitch-mode-btn")).toBeTruthy();
      expect(document.getElementById("rate-mode-btn")).toBeTruthy();
      expect(document.getElementById("statusSubtitle")).toBeTruthy();
      expect(document.getElementById("backFromSettings")).toBeTruthy();
      expect(document.getElementById("openAboutBtn")).toBeTruthy();
      expect(document.getElementById("resetAllBtn")).toBeTruthy();
      expect(document.getElementById("themeSegment")).toBeTruthy();
    });
  });

  describe("settings view switching", () => {
    it("shows settings view when settingsBtn is clicked", async () => {
      await import("../src/popup/popup");
      await vi.waitFor(() => true, { timeout: 100 });

      const btn = document.getElementById("settingsBtn")!;
      btn.click();

      expect(
        document.getElementById("mainView")!.classList.contains("hidden"),
      ).toBe(true);
      expect(
        document.getElementById("settingsView")!.classList.contains("hidden"),
      ).toBe(false);
    });

    it("returns to main view when back button is clicked", async () => {
      await import("../src/popup/popup");
      await vi.waitFor(() => true, { timeout: 100 });

      document.getElementById("settingsBtn")!.click();
      document.getElementById("backFromSettings")!.click();

      expect(
        document.getElementById("mainView")!.classList.contains("hidden"),
      ).toBe(false);
      expect(
        document.getElementById("settingsView")!.classList.contains("hidden"),
      ).toBe(true);
    });
  });

  describe("storage listener", () => {
    it("reacts to storage state changes", async () => {
      await import("../src/popup/popup");
      await vi.waitFor(() => true, { timeout: 100 });

      __fireStorageChange({
        state: {
          newValue: { enabled: true, frequency: 432, mode: "pitch" },
        },
      });

      await vi.waitFor(() => true, { timeout: 50 });

      const statusEl = document.getElementById("statusSubtitle")!;
      expect(statusEl.textContent).toContain("432");
    });
  });

  describe("announcement banner", () => {
    it("banner is visible by default (no dismissed state)", async () => {
      __setChromeStorageData({ dismissedAnnouncement: null });
      await import("../src/popup/popup");
      await vi.waitFor(() => true, { timeout: 100 });

      const banner = document.querySelector(".announcement-banner") as HTMLElement;
      expect(banner).toBeTruthy();
      expect(banner.classList.contains("is-dismissed")).toBe(false);
    });
  });

  describe("power toggle", () => {
    it("has powerToggle button in DOM", async () => {
      await import("../src/popup/popup");
      await vi.waitFor(() => true, { timeout: 100 });

      const btn = document.getElementById("powerToggle");
      expect(btn).toBeTruthy();
      expect(btn!.tagName).toBe("BUTTON");
    });
  });
});
