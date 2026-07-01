// lib/youtube.ts
// Pure, dependency-free helpers for working with YouTube URLs.
// Kept separate from the API route so the frontend can also use
// extractVideoId() to validate input and render the embedded player
// without waiting for a server round-trip.

/**
 * Extracts an 11-character YouTube video ID from any common URL shape:
 *  - https://www.youtube.com/watch?v=VIDEOID
 *  - https://youtu.be/VIDEOID
 *  - https://www.youtube.com/embed/VIDEOID
 *  - https://www.youtube.com/shorts/VIDEOID
 *  - raw VIDEOID pasted directly
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Already a bare video ID (11 chars, URL-safe base64-ish charset)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/** Quick client-side validation before hitting the API route. */
export function isValidYoutubeUrl(input: string): boolean {
  return extractVideoId(input) !== null;
}

/** Builds a thumbnail URL for preview cards — no API quota needed. */
export function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
