export interface DrmHostPattern {
  host: string;
  label: string;
}

export const DRM_HOST_PATTERNS: DrmHostPattern[] = [
  { host: "open.spotify.com", label: "Spotify" },
  { host: "netflix.com", label: "Netflix" },
];

export function isDRMHost(hostname: string): boolean {
  return DRM_HOST_PATTERNS.some(
    (p) => hostname === p.host || hostname.endsWith("." + p.host),
  );
}
