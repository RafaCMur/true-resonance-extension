function init(): void {
  const versionEl = document.getElementById("version");
  if (versionEl) {
    versionEl.textContent = chrome.runtime.getManifest().version;
  }

  (async function () {
    try {
      const result = await chrome.storage.local.get("language");
      const lang = (result.language as string) || "en";
      const resp = await fetch("i18n/locales/" + lang + ".json");
      if (!resp.ok) throw new Error("failed to load i18n");
      const translations = await resp.json();
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key && translations[key]) {
          el.textContent = translations[key];
        }
      });
      if (translations.aboutTitle) {
        document.title = translations.aboutTitle;
      }
    } catch (e) {
      console.warn("True Resonance: about page i18n failed", e);
    }
  })();
}

init();
