# CHANGELOG

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
