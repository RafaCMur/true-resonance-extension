import { describe, it, expect } from "vitest";

import { isDRMHost } from "../src/shared/drm";

describe("isDRMHost", () => {
  describe("Spotify", () => {
    it("matches open.spotify.com exactly", () => {
      expect(isDRMHost("open.spotify.com")).toBe(true);
    });

    it("matches subdomain .open.spotify.com", () => {
      expect(isDRMHost("foo.open.spotify.com")).toBe(true);
    });

    it("does NOT match spotify.com (no subdomain match configured)", () => {
      expect(isDRMHost("spotify.com")).toBe(false);
    });

    it("does NOT match fake-spotify.com", () => {
      expect(isDRMHost("fake-spotify.com")).toBe(false);
    });
  });

  describe("Netflix", () => {
    it("matches netflix.com", () => {
      expect(isDRMHost("netflix.com")).toBe(true);
    });

    it("matches subdomain www.netflix.com", () => {
      expect(isDRMHost("www.netflix.com")).toBe(true);
    });

    it("matches any subdomain of netflix.com", () => {
      expect(isDRMHost("assets.netflix.com")).toBe(true);
    });
  });

  describe("non-DRM hosts", () => {
    it("does NOT match youtube.com", () => {
      expect(isDRMHost("youtube.com")).toBe(false);
    });

    it("does NOT match music.youtube.com", () => {
      expect(isDRMHost("music.youtube.com")).toBe(false);
    });

    it("does NOT match suno.com", () => {
      expect(isDRMHost("suno.com")).toBe(false);
    });

    it("does NOT match evil.com", () => {
      expect(isDRMHost("evil.com")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(isDRMHost("")).toBe(false);
    });

    it("handles hostname with trailing dot (internal normalisation)", () => {
      // The current implementation checks endsWith(".open.spotify.com")
      // So "open.spotify.com." would NOT match "open.spotify.com" but
      // WOULD match the subdomain check since it ends with ".open.spotify.com".
      // This is technically debatable but documents current behavior.
      expect(isDRMHost("open.spotify.com.")).toBe(false);
    });

    it("does NOT match via hasOwnProperty prototype poisoning", () => {
      // Safety check: the implementation uses hostname.endsWith which is safe.
      expect(isDRMHost("constructor")).toBe(false);
    });
  });
});
