import { A4_STANDARD_FREQUENCY } from "../shared/constants";
import { Frequency, GlobalState } from "../shared/types";
import { i18n } from "../i18n/i18n";

// Theme is pre-applied in public/theme-preload.js to avoid flash during first paint

// ======================== DOM ELEMENTS ========================
const elements = {
  // Control bar
  powerToggle: document.getElementById("powerToggle") as HTMLButtonElement,
  settingsBtn: document.getElementById("settingsBtn") as HTMLButtonElement,
  backFromSettings: document.getElementById(
    "backFromSettings"
  ) as HTMLButtonElement,
  openAboutBtn: document.getElementById("openAboutBtn") as HTMLButtonElement,
  resetAllBtn: document.getElementById("resetAllBtn") as HTMLButtonElement,

  // Views
  mainView: document.getElementById("mainView") as HTMLElement,
  settingsView: document.getElementById("settingsView") as HTMLElement,

  // Settings: language
  languageBtn: document.getElementById("languageBtn") as HTMLButtonElement,
  languageMenu: document.getElementById("languageMenu") as HTMLElement,

  // Settings: theme segmented control
  themeSegment: document.getElementById("themeSegment") as HTMLElement,

  // Layout
  disabledOverlay: document.getElementById("disabledOverlay") as HTMLElement,
  appContainer: document.querySelector(".app-container") as HTMLElement,

  // Controls
  resetButton: document.getElementById("reset-btn") as HTMLButtonElement,
  pitchModeBtn: document.getElementById("pitch-mode-btn") as HTMLButtonElement,
  rateModeBtn: document.getElementById("rate-mode-btn") as HTMLButtonElement,

  // Presets
  preset432: document.getElementById("pitch-432-btn") as HTMLButtonElement,
  preset528: document.getElementById("pitch-528-btn") as HTMLButtonElement,

  // Announcement banner
  announcementBanner: document.querySelector(
    ".announcement-banner"
  ) as HTMLElement,

  // Status info
  statusSubtitle: document.getElementById("statusSubtitle") as HTMLElement,

  // Reload banner
  reloadBanner: document.getElementById("reloadBanner") as HTMLButtonElement,
};

const ANNOUNCEMENT_ID =
  document
    .querySelector(".announcement-banner")
    ?.getAttribute("data-announcement-id") ?? null;

function applyAnnouncementVisibility(dismissedId: string | null | undefined) {
  if (!elements.announcementBanner || !ANNOUNCEMENT_ID) return;
  const dismissed = dismissedId === ANNOUNCEMENT_ID;
  elements.announcementBanner.classList.toggle("is-dismissed", dismissed);
  elements.announcementBanner.style.display = dismissed ? "none" : "";
}

// ======================== STATE ========================
let currentFrequency: Frequency = A4_STANDARD_FREQUENCY;

// ======================== CORE FUNCTIONS ========================
function sendPatch(patch: Partial<GlobalState>) {
  chrome.runtime.sendMessage({ action: "set", patch });
}

function updateUI(state: GlobalState) {
  const { enabled, mode, frequency } = state;

  // Update overlay and container
  elements.disabledOverlay?.classList.toggle("show", !enabled);
  elements.appContainer?.classList.toggle("disabled", !enabled);

  // Update toggles
  elements.powerToggle?.classList.toggle("active", enabled);

  // Update mode buttons
  elements.rateModeBtn?.classList.toggle("active", mode === "rate");
  elements.pitchModeBtn?.classList.toggle("active", mode === "pitch");

  // Update frequency
  currentFrequency = frequency;
  elements.preset432?.classList.toggle("active", frequency === 432);
  elements.preset528?.classList.toggle("active", frequency === 528);

  // ARIA pressed states
  elements.powerToggle?.setAttribute("aria-pressed", String(enabled));
  elements.pitchModeBtn?.setAttribute("aria-pressed", String(mode === "pitch"));
  elements.rateModeBtn?.setAttribute("aria-pressed", String(mode === "rate"));
  elements.preset432?.setAttribute("aria-pressed", String(frequency === 432));
  elements.preset528?.setAttribute("aria-pressed", String(frequency === 528));

  // Update status
  updateStatusUI(state);
}

function updateStatusUI(state: GlobalState): void {
  const el = elements.statusSubtitle;
  if (!el) return;

  const { enabled, frequency } = state;

  if (!enabled) {
    el.textContent = "Inactive";
    el.classList.remove("active");
  } else if (frequency === 440) {
    el.textContent = "Active";
    el.classList.add("active");
  } else {
    el.textContent = `Active \u00B7 ${frequency} Hz`;
    el.classList.add("active");
  }
}

function updateLanguageUI() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key) element.textContent = i18n.t(key);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.getAttribute("data-i18n-aria-label");
    if (key) element.setAttribute("aria-label", i18n.t(key));
  });
}

// ======================== VIEW SWITCHING ========================
function switchView(view: "main" | "settings"): void {
  if (view === "settings") {
    elements.mainView?.classList.add("hidden");
    elements.mainView?.setAttribute("inert", "");
    elements.settingsView?.classList.remove("hidden");
    elements.settingsView?.removeAttribute("inert");
    elements.appContainer?.setAttribute("data-view", "settings");
  } else {
    elements.settingsView?.classList.add("hidden");
    elements.settingsView?.setAttribute("inert", "");
    elements.mainView?.classList.remove("hidden");
    elements.mainView?.removeAttribute("inert");
    elements.appContainer?.setAttribute("data-view", "main");
  }
}

// ======================== THEME MANAGEMENT ========================
type ThemeChoice = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveEffectiveTheme(choice: ThemeChoice): "light" | "dark" {
  return choice === "system" ? getSystemTheme() : choice;
}

function getStoredTheme(result: { theme?: unknown }): ThemeChoice {
  const t = result.theme;
  return t === "light" || t === "dark" || t === "system"
    ? t
    : "system";
}

const themeManager = {
  current: "system" as ThemeChoice,

  apply(choice: ThemeChoice) {
    this.current = choice;
    const effective = resolveEffectiveTheme(choice);
    document.documentElement.setAttribute("data-theme", effective);

    elements.themeSegment
      ?.querySelectorAll(".segment-btn")
      .forEach((btn) => {
        const t = (btn as HTMLElement).dataset.theme;
        btn.classList.toggle("active", t === choice);
        btn.setAttribute("aria-pressed", String(t === choice));
      });
  },

  persist(choice: ThemeChoice) {
    if (choice === "system") {
      chrome.storage.local.set({ theme: "system" });
      localStorage.removeItem("theme");
    } else {
      chrome.storage.local.set({ theme: choice });
      localStorage.setItem("theme", choice);
    }
  },

  init() {
    // Read DOM first (preload may have already applied system theme).
    chrome.storage.local.get(["theme"], (result) => {
      const stored = getStoredTheme(result);
      this.apply(stored);

      if (stored === "light" || stored === "dark") {
        // Mirror explicit choice to localStorage so preload renders it on next open.
        localStorage.setItem("theme", stored);
      } else {
        // System: keep localStorage clean so preload derives from OS each load.
        localStorage.removeItem("theme");
      }
    });
  },
};

// ======================== LANGUAGE MANAGEMENT ========================
const languageManager = {
  async init() {
    const result = await new Promise<{ language?: string }>((resolve) => {
      chrome.storage.local.get(["language"], (data) => resolve(data));
    });

    const currentLang = result.language || "en";
    await i18n.loadLanguage(currentLang);
    updateLanguageUI();

    if (elements.languageBtn) {
      elements.languageBtn.textContent = currentLang.toUpperCase();
    }

    // Update dropdown selection
      elements.languageMenu
        ?.querySelectorAll(".dropdown-item")
        .forEach((item) => {
          const lang = (item as HTMLElement).dataset.lang;
          item.classList.toggle("active", lang === currentLang);
        item.setAttribute("aria-pressed", String(lang === currentLang));
      });
  },

  async change(lang: string) {
    chrome.storage.local.set({ language: lang });
    await i18n.loadLanguage(lang);
    updateLanguageUI();

    if (elements.languageBtn) {
      elements.languageBtn.textContent = lang.toUpperCase();
    }

    elements.languageMenu
      ?.querySelectorAll(".dropdown-item")
      .forEach((item) => {
        const itemLang = (item as HTMLElement).dataset.lang;
        item.classList.toggle("active", itemLang === lang);
        item.setAttribute("aria-pressed", String(itemLang === lang));
      });
  },
};

// ======================== STORAGE LISTENERS ========================
chrome.storage.local.get("state", ({ state }) => {
  if (state) updateUI(state);
});

chrome.storage.onChanged.addListener(({ state, theme, language }) => {
  if (state?.newValue) updateUI(state.newValue as GlobalState);

  if (theme?.newValue) {
    const next = getStoredTheme({ theme: theme.newValue });
    themeManager.apply(next);
    if (next === "light" || next === "dark") {
      localStorage.setItem("theme", next);
    } else {
      localStorage.removeItem("theme");
    }
  }

  if (language?.newValue) {
    languageManager.change(language.newValue);
  }
});

// Announcement banner: read persisted dismiss on load
chrome.storage.local.get("dismissedAnnouncement", ({ dismissedAnnouncement }) => {
  applyAnnouncementVisibility(dismissedAnnouncement);
});

// ======================== RELOAD BANNER ========================
async function checkReloadBanner(): Promise<void> {
  const banner = elements.reloadBanner;
  if (!banner) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      banner.hidden = true;
      return;
    }
    const url = tab.url;
    if (
      url.startsWith("chrome://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:") ||
      url.startsWith("chrome-extension://")
    ) {
      banner.hidden = true;
      return;
    }
    await chrome.tabs.sendMessage(tab.id, { action: "_tr_heartbeat" });
    banner.hidden = true;
  } catch {
    banner.hidden = false;
  }
}

// ======================== EVENT LISTENERS ========================
// Power toggle
elements.powerToggle?.addEventListener("click", () => {
  const isEnabled = elements.powerToggle.classList.contains("active");
  sendPatch(
    isEnabled
      ? { enabled: false }
      : { enabled: true, frequency: currentFrequency }
  );
});

// Settings: open / back navigation
elements.settingsBtn?.addEventListener("click", () => {
  const isOpen = !elements.settingsView?.classList.contains("hidden");
  switchView(isOpen ? "main" : "settings");
});
elements.backFromSettings?.addEventListener("click", () => switchView("main"));

// Announcement banner: dismiss persists across browser restarts
const announcementDismissBtn = elements.announcementBanner?.querySelector(
  ".announcement-dismiss"
) as HTMLButtonElement | null;
announcementDismissBtn?.addEventListener("click", () => {
  if (!elements.announcementBanner) return;
  elements.announcementBanner.classList.add("is-dismissed");
  if (ANNOUNCEMENT_ID) {
    chrome.storage.local.set({ dismissedAnnouncement: ANNOUNCEMENT_ID });
  }
  setTimeout(() => {
    elements.announcementBanner.style.display = "none";
  }, 260);
});

// Settings: theme segmented control
elements.themeSegment?.querySelectorAll(".segment-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const choice = (btn as HTMLElement).dataset.theme as ThemeChoice | undefined;
    if (!choice) return;
    themeManager.apply(choice);
    themeManager.persist(choice);
  });
});

// Settings: language dropdown (moved from top bar, same logic)
if (elements.languageBtn && elements.languageMenu) {
  elements.languageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    elements.languageMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    elements.languageMenu.classList.remove("show");
  });

  elements.languageMenu.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      const lang = (item as HTMLElement).dataset.lang;

      if (lang) {
        // Update UI
        elements.languageMenu
          .querySelectorAll(".dropdown-item")
          .forEach((i) => {
            i.classList.remove("active");
            i.setAttribute("aria-pressed", "false");
          });
        item.classList.add("active");
        item.setAttribute("aria-pressed", "true");
        elements.languageMenu.classList.remove("show");

        // Change language
        await languageManager.change(lang);
      }
    });
  });
}

// Settings: about
elements.openAboutBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("about.html") });
});

// Settings: reset all
elements.resetAllBtn?.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset all settings? This clears frequency, mode, theme, and language.",
  );
  if (!confirmed) return;

  chrome.storage.local.set({ state: { enabled: false, mode: "pitch", frequency: A4_STANDARD_FREQUENCY } });
  chrome.storage.local.remove("theme");
  chrome.storage.local.remove("language");
  chrome.storage.local.remove("dismissedAnnouncement");
  localStorage.removeItem("theme");
  sendPatch({ enabled: false, mode: "pitch", frequency: A4_STANDARD_FREQUENCY });
  window.location.reload();
});

// Reload banner: reload the current tab
elements.reloadBanner?.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.reload(tab.id);
  }
});

// Frequency controls
elements.preset432?.addEventListener("click", () => {
  currentFrequency = 432;
  sendPatch({ frequency: 432 });
});

elements.preset528?.addEventListener("click", () => {
  currentFrequency = 528;
  sendPatch({ frequency: 528 });
});

elements.resetButton?.addEventListener("click", () => {
  sendPatch({ frequency: A4_STANDARD_FREQUENCY });
});

// Mode buttons
elements.rateModeBtn?.addEventListener("click", () =>
  sendPatch({ mode: "rate" })
);
elements.pitchModeBtn?.addEventListener("click", () =>
  sendPatch({ mode: "pitch" })
);

// ======================== INITIALIZATION ========================
(async function init() {
  themeManager.init();
  await languageManager.init();
  void checkReloadBanner();
})();

chrome.tabs.onActivated.addListener(() => {
  void checkReloadBanner();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    void checkReloadBanner();
  }
});

export {}; // This is to prevent the file from being a module and isolates the variables (errors from typescript)
