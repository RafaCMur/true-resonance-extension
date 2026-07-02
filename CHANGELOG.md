# CHANGELOG

## [2.5.1] - 2026-07-02

### Added

- **Rate override detection**: when the user changes playback speed on YouTube while in rate mode, the extension now stops fighting the user's speed choice instead of continuously resetting it. Tuning resumes automatically when the user returns to 1x speed. Includes 21 new unit tests for the `classifyRateChange` pure function.
- **`classifyRateChange` pure module**: extracted to `src/content/rate-override.ts` with 1e-4/1e-3 SELF/BASE thresholds, exported and independently testable.

### Changed

- **`injected.ts`**: added `overriddenMedia` Set, split `ratechange`/`seeked` handlers, added `handleRateChange` with override detection, guards in `reapplyConfig`/`onMediaPlaying`/`applyConfig` to respect override state.
- **Override persists through frequency changes**: only mode or enabled toggle resets the override state — changing the tuning frequency while the user is at a custom speed keeps their speed choice intact.

## [2.5.0] - 2026-07-02

### Changed

- **Footer redesigned**: three icon + text lines (questions, review, open source) replace the old button row. Cleaner look at the bottom of the popup.
- **Support links moved to Settings**: Contribute and Donate buttons now live in a "Support" row inside Settings instead of the main view.
- **"Show More Options" renamed to "Show More Frequencies"** across all 6 languages. Makes the button purpose clearer.
- **About page links redesigned**: GitHub, Contribute, and Donate now have SVGs, matching the popup button style.
- **Extension name and description updated**: clearer wording for the Chrome Web Store listing.
- **CSS refactoring with variables**: popup dimensions, control sizes, and focus rings now use CSS custom properties (`--popup-max-height`, `--control-size`, etc.) for easier maintenance.
- **Dark theme color adjustments**: darker background (`#0b0f19`), removed shadows for a flatter look, added hover states for cards and borders.
- **Performance improvements**: replaced `transition: all` with specific properties (`transform`, `box-shadow`, `opacity`) to reduce repaints.
- **Theme-aware hover states**: using `color-mix()` for button hovers so they automatically adapt to light/dark themes.

### Fixed

- **Chrome popup auto-resize oscillation**: added a fixed-height scrollbar (6px width) to prevent the popup from flickering when content length changes. The popup now caps at 600px height with smooth scrolling when content is long.
- **Disabled state z-index issues**: tooltips and dropdowns are now hidden when the extension is disabled. Overlay z-index raised to 200, top control bar to 300, ensuring proper layering.
- **Dark mode contrast**: popup dark colors were too bright and hard to read. Background, card, and border colors now match the design from the about page. Shadows removed in dark mode for a flatter look.
- **Dark mode on the About page**: about.html had no dark theme at all. Added CSS variables and a `data-theme="dark"` block so it matches the rest of the extension.
- **Control button hover was showing the wrong color**: the power and settings icons used `<img>` elements with complex CSS filters. Switched to inline SVGs with `currentColor` — hover now fades smoothly to purple instead of flashing light blue.
- **i18n textContent bug**: putting `data-i18n` directly on `<a>` tags wiped their SVG children when translations loaded. Moved the attribute to an inner `<span>` so icons stay visible after language switch.

## [2.3.0] - 2026-07-01

### Added

- **Test suite**: 52 test cases across 7 test files using Vitest. Covers constants, DRM detection, state machine, i18n, audio graph, message routing, and popup DOM integrity.
- **Reload banner**: yellow banner in the popup when content scripts are not active on the current tab. Shows a refresh icon and "Reload page to activate" text. Clicking it reloads the tab. Hidden automatically on protected pages (chrome://, about:, etc.).
- **About page i18n**: the about page now supports all 6 languages. It reads the language from storage and updates text dynamically.

### Changed

- **Messages hardened**: `postMessage` calls now use `window.location.origin` instead of `"*"`. Background service worker validates incoming state patches with a type guard.
- **Accessibility improved**: added `aria-pressed`, `aria-label`, and `lang="en"` attributes. Hidden views get `inert` so keyboard focus does not reach them. All interactive elements have `:focus-visible` outlines. Added `prefers-reduced-motion` support.
- **Inter font bundled locally**: the font is now loaded from the extension package instead of Google Fonts CDN. No external network requests for fonts.
- **Permissions reduced**: removed `host_permissions` and `scripting` from manifest. Content scripts are injected only via declarative `content_scripts` in the manifest. The popup tells users to reload tabs manually when needed.

### Removed

- **Dead code**: deleted `soundtouch.ts`, `WORKLET_PATH` export, `calculatePlaybackRate()` and `shouldResetPlaybackRate()` from state.ts.

### Fixed

- **CSP inline-script bug in about.html**: moved inline JavaScript to an external bundle. The about page now works under the default Manifest V3 CSP without requiring a relaxed policy.

## [2.2.1] - 2026-06-26

New version overriding old 2.2.0 already uploaded in the chrome web store

## [2.1.8] - 2026-06-26

> **Note:** This is the first release published to the Chrome Web Store since 2.1.6. It bundles all 2.1.7 changes (hybrid audio architecture, Spotify Tier-2 support) which were not uploaded to the store.

### Added

- **Settings view**: new in-popup screen opened from the gear icon, with a back-arrow header that replaces the top bar while active. Hides and shows the main view via `switchView('main' | 'settings')`.
- **Segmented theme control** (Light / System / Dark) in Settings. Replaces the old 3-state cycle button. The slider indicator animates between segments via `transform: translateX`.
- **Language dropdown moved to Settings**: no longer in the top bar.
- **About row in Settings**: opens `about.html` in a new tab (moved from the old gear click behavior).
- **Reset all settings** button in Settings: confirms via `window.confirm()`, then clears `state` (back to `enabled:false`, `pitch`, 440 Hz), removes `theme` and `language` from `chrome.storage.local`, clears the `theme` localStorage mirror, and reloads the popup.
- **Spotify celebration banner**: replaces the stale "Spotify support is coming soon" banner with the official Spotify logo + "Spotify support is here" copy in the existing green gradient. Always visible (no auto-fade or dismiss).
- **10 new i18n keys** in all 6 locales (`settingsTitle`, `themeLabel`, `themeDesc`, `languageLabel`, `aboutLabel`, `aboutDesc`, `openAbout`, `resetLabel`, `resetDesc`, `reset`).

### Changed

- **Top control bar simplified** to just Power + Gear. Theme and language controls no longer live there.
- **`themeManager.cycle()` removed**: replaced by direct selection driven by the segmented control. The `themeManager.persist()` helper was extracted so it can be called from the new click handler.
- **`themeManager.apply()` rewritten**: no longer references the deleted `#themeToggle`; instead moves `.segment-slider` to match the chosen theme and marks the matching `.segment-btn` active.

### Removed

- **`#themeToggle` button** from the top bar (theme control moved to Settings).
- **Language dropdown** from the top bar (moved to Settings).
- **"Spotify support is coming soon" banner** (replaced by the celebration banner).
- **Dead `#enable-extension-toggle` references** in `popup.ts` (the HTML element never existed — pre-existing dead code).

### Fixed

- **`about.html` showed stale version `2.1.4`**: now reads `chrome.runtime.getManifest().version` dynamically, so it always reflects the installed build.

## [2.1.7] - 2026-06-26

### Added

- **Hybrid audio architecture**: DRM-protected sites (Spotify, Netflix) now play in healing frequencies via `chrome.tabCapture` + offscreen document with SoundTouch worklet. Non-DRM sites continue using the lightweight Tier 1 (AudioContext + media element source) path.
- **DRM host allowlist**: Spotify (`open.spotify.com`) and Netflix (`netflix.com`) automatically route to Tier 2. Subdomain matching included (`*.open.spotify.com`, `*.netflix.com`).
- **Multi-tab handoff**: only one offscreen capture active at a time. If a second DRM tab enables tuning, the first is gracefully stopped and the new one starts.
- **Retro-injection on install**: when the extension is first installed, `chrome.scripting.executeScript` injects both `injected.js` (MAIN world) and `content_script.js` (ISOLATED world) into all existing tabs, so they don't need a reload to start working.
- **`sidePanel` permission**: popup can now also be opened as a Chrome side panel via `chrome.sidePanel`.
- **`minimum_chrome_version` raised to 116**: Chrome < 116 cannot consume a tabCapture `streamId` in an offscreen document without `consumerTabId`; 116+ supports the clean API.

### Changed

- **Robustness hardening**: all cross-context `chrome.runtime.sendMessage` calls now have `.catch(() => {})` guards to prevent unhandled promise rejections if the receiver is gone.
- **Idempotency guard for injected script**: uses silent `if`-wrap (no exception) to prevent double-injection without leaking errors to the page console.
- **`computePitchRatio` extracted to `src/shared/constants.ts`**: single source of truth used by both background script and content script (prevents drift).

### Fixed

- **Spotify detune on manual song change**: Spotify's gapless MSE buffer swap does not re-fire the `playing` event, and its player resets `playbackRate = 1` on track transition. Now handled by Tier 2 (tabCapture survives the swap at the document level) plus a `loadstart` listener for Tier 1.
- **YouTube `ratechange` reset**: YouTube's player also resets `playbackRate` on certain transitions; now re-applied via `ratechange`/`seeked` listeners.
- **Race condition on concurrent `handleStartTabCapture`**: serialized via `_capturing` mutex so two simultaneous DRM tab requests don't orphan an offscreen capture.
- **`AudioContext.state === "interrupted"`** (macOS background): now handled alongside `"suspended"` when resuming.

## [2.1.6] - 2026-06-26

### Added

- Theme now follows the system preference (`prefers-color-scheme`) by default. The toggle is now a 3-state cycle: **Light → Dark → System (auto)**. The "System" option returns the popup to following the OS theme and continues tracking it.

### Fixed

- Theme is no longer baked into `localStorage`/`chrome.storage` when derived from the system preference — the popup now keeps tracking OS theme changes until the user explicitly toggles.
- Removed dead `about.html` script that referenced non-existent DOM IDs (`status`, `frequency`, `mode`, `resetBtn`) and threw `TypeError` on load.

## [2.1.5] - 2026-06-26

### Added

- TypeScript `@types/chrome` now included via `tsconfig.json` for proper `chrome.*` global typings

### Changed

- Announcement banner: replaced Android pre-release message with "Spotify support is coming soon" (Spotify green styling, translated across all 6 languages)
- Badge color for 432/528 Hz tuning: now lilac (`#c4b5fd`) instead of green
- TypeScript `moduleResolution` migrated from `node` to `bundler` (resolves deprecation warning)

### Fixed

- Pitch mode now correctly sends `playbackRate: 1` to the page instead of `pitchRatio`, preventing double pitch shifting by both the worklet and the browser
- Pitch mode now re-applies tuning to media that's already playing when the extension is enabled or config changes
- CORS media ladder now listens for the `error` event (instead of `abort`), which never fires reliably on `<audio>`/`<video>` elements
- Race condition when concurrent `wireWorklet()` calls happened before the worklet finished loading (`_wiring` guard prevents duplicate AudioWorklet loads)

## [2.1.4] - 2025-10-16

### Added

- Announcement popup: Android 432 Hz player is now in pre-release!

## [2.1.3] - 2025-10-16

### Added

- Announcement popup: Coming soon: Android 432 Hz player!

## [2.1.2] - 2025-10-16

### Fixed

- The extension was not working in **MAC OS** when the browser was in background mode. Fixed by adding "interrupted" state support for `AudioContext` object.

## [2.1.1] - 2025-10-06

### Added

- Default state initialization on first installation (extension now enabled by default on install)
- Centralized DEFAULT_STATE constant in background service worker

### Fixed

- Pitch mode now correctly preserves user-set playback speeds (1.25x, 1.5x, etc.) when switching modes
- Improved playback rate detection to distinguish between extension-set rates (432Hz, 528Hz) and user-set speeds
- Refactored frequency handling for better scalability when adding new healing frequencies

### Changed

- Optimized state management with better separation of concerns

## [2.1.0] - 2025-09-05

### Added

- Better error control

### Fixed

- Problems with syncronization between UI and storage
- Chrome was showing an error in pages with no video or audio elements
- Eliminated the flash (flash) of the theme when opening the popup through a preload script.

## [2.0.0] - 2025-07-24

### Added

- Add i18n support
- Make the extension compatible with more platforms (Suno, youtube music, etc)

### Changed

- Redesign the popup completely, new styles and modern look

## [1.0.2] - 2025-07-08

### Changed

- Soundtouch is only connected when pitch mode is selected. When rate mode is selected, it should not be connected. This saves resources.

## [1.0.1] - 2025-07-08

### Fixed

- When entering a youtube video with the extension disabled, and then enabling it, the video wasn't tuned properly in pitch mode.

## [1.0.0] - 2025-07-08

- Initial release
