// app/api/fetch-youtube-script/route.ts
//
// Fetches the NATIVE caption track for a YouTube video and returns it as
// clean, plain text.
//
// ⚠️ IMPORTANT — WHY THIS DOESN'T USE youtubei.js's getTranscript():
// As of late Dec 2025 / early Jan 2026, YouTube added a BotGuard
// attestation requirement to its internal `get_transcript` endpoint
// (confirmed directly by youtubei.js's maintainer — see
// https://github.com/LuanRT/YouTube.js/issues/1102). This means
// `info.getTranscript()` now reliably fails with a 400
// "Precondition check failed" error from ANY server environment —
// this is not an IP-ban or rate-limit issue, it's a cryptographic
// bot-challenge wall with no code-only workaround.
//
// Instead, this route uses the PUBLIC CAPTION TRACK endpoint
// (the same `timedtext` URLs your browser fetches when you turn on
// captions while watching a video normally). This endpoint is NOT
// behind the BotGuard wall as of this writing, though as the comments
// below note, it CAN still be rate-limited under heavy traffic — it is
// not bulletproof, just meaningfully more reliable than the BotGuard'd
// endpoint. If YouTube starts gating this endpoint too in the future,
// the MP4/audio upload path (via Groq) remains the reliable fallback,
// since it doesn't depend on YouTube's APIs at all.
//
// POST body: { url: string, language?: string }  // language is an ISO 639-1 code, e.g. "en"
// Response:  YoutubeScriptResponse

import { NextRequest, NextResponse } from "next/server";
import { Innertube } from "youtubei.js";
import { extractVideoId } from "@/lib/youtube";
import type { YoutubeScriptResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30; // allow time for retries below

const DEFAULT_LANGUAGE = "en";
const MAX_ATTEMPTS = 3;

// A real browser User-Agent is required when fetching timedtext URLs
// directly — YouTube's CDN rejects requests without one.
const TIMEDTEXT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

class LanguageNotAvailableError extends Error {
  availableLanguages: string[];
  constructor(lang: string, availableLanguages: string[]) {
    super(`No caption track available in "${lang}".`);
    this.availableLanguages = availableLanguages;
  }
}

interface CaptionTrack {
  base_url: string;
  language_code: string;
  kind?: "asr" | "frc";
  name?: { toString(): string };
}

interface TimedTextSegment {
  utf8?: string;
}

interface TimedTextEvent {
  segs?: TimedTextSegment[];
}

interface TimedTextResponse {
  events?: TimedTextEvent[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, language } = body as { url?: string; language?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json<YoutubeScriptResponse>(
        { success: false, videoId: "", script: "", error: "Missing 'url' in request body." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json<YoutubeScriptResponse>(
        { success: false, videoId: "", script: "", error: "Could not parse a valid YouTube video ID from that URL." },
        { status: 400 }
      );
    }

    const requestedLang = (language?.trim() || DEFAULT_LANGUAGE).toLowerCase();

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await fetchCaptionTrackOnce(videoId, requestedLang);
        return NextResponse.json<YoutubeScriptResponse>(result);
      } catch (err) {
        lastError = err;

        if (err instanceof LanguageNotAvailableError) {
          return NextResponse.json<YoutubeScriptResponse>(
            {
              success: false,
              videoId,
              script: "",
              availableLanguages: err.availableLanguages,
              error:
                err.availableLanguages.length > 0
                  ? `No "${requestedLang}" captions found for this video. Available languages: ${err.availableLanguages.join(", ")}.`
                  : `No "${requestedLang}" captions found, and no alternative languages were listed for this video.`,
            },
            { status: 404 }
          );
        }

        if (attempt < MAX_ATTEMPTS) {
          const backoffMs = 400 * Math.pow(3, attempt - 1) + Math.random() * 200;
          await sleep(backoffMs);
        }
      }
    }

    console.error("[fetch-youtube-script] All attempts failed:", lastError);
    return NextResponse.json<YoutubeScriptResponse>(
      {
        success: false,
        videoId,
        script: "",
        error:
          "Couldn't fetch captions for this video after multiple attempts. YouTube may be rate-limiting " +
          "this endpoint, or this specific video's captions may be unavailable right now. Try again in a " +
          "bit, try a different video, or use the MP4/audio upload option instead — that path doesn't " +
          "depend on YouTube's caption APIs at all.",
      },
      { status: 503 }
    );
  } catch (err: any) {
    console.error("[fetch-youtube-script] Unexpected error:", err);
    return NextResponse.json<YoutubeScriptResponse>(
      { success: false, videoId: "", script: "", error: "Unexpected server error while fetching the transcript." },
      { status: 500 }
    );
  }
}

async function fetchCaptionTrackOnce(
  videoId: string,
  requestedLang: string
): Promise<YoutubeScriptResponse> {
  // getBasicInfo() is lighter than getInfo() — it skips watch-page extras
  // we don't need (related videos, comments setup, etc.) and is NOT the
  // endpoint affected by the BotGuard requirement; only get_transcript is.
  const youtube = await Innertube.create({
    lang: requestedLang,
    retrieve_player: false,
    generate_session_locally: true,
  });

  const info = await youtube.getBasicInfo(videoId);
  const captionTracks = (info.captions?.caption_tracks ?? []) as CaptionTrack[];

  if (captionTracks.length === 0) {
    throw new Error(`No caption tracks found for video ${videoId}.`);
  }

  const availableLanguages = captionTracks.map((t) => t.language_code);

  // Prefer a non-auto-generated ("standard") track over ASR if both exist
  // for the requested language — manual captions are generally more accurate.
  const matchedTrack =
    captionTracks.find((t) => t.language_code.toLowerCase() === requestedLang && t.kind !== "asr") ||
    captionTracks.find((t) => t.language_code.toLowerCase() === requestedLang) ||
    captionTracks.find((t) => t.language_code.toLowerCase().startsWith(requestedLang));

  if (!matchedTrack) {
    throw new LanguageNotAvailableError(requestedLang, availableLanguages);
  }

  const script = await fetchAndParseTimedText(matchedTrack.base_url);

  if (!script) {
    throw new Error(`Caption track for video ${videoId} returned no usable text.`);
  }

  return {
    success: true,
    videoId,
    script,
    language: matchedTrack.language_code,
  };
}

/**
 * Fetches the actual caption content from a track's base_url and parses it.
 * We request the json3 format (`&fmt=json3`) since it's simpler and more
 * robust to parse than the alternative XML format — no HTML-entity
 * decoding or regex-based XML parsing needed.
 */
async function fetchAndParseTimedText(baseUrl: string): Promise<string> {
  const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;

  const res = await fetch(url, {
    headers: { "User-Agent": TIMEDTEXT_USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Caption track fetch failed with status ${res.status}.`);
  }

  const data: TimedTextResponse = await res.json();
  const events = data.events ?? [];

  const rawText = events
    .flatMap((event) => event.segs ?? [])
    .map((seg) => seg.utf8 ?? "")
    .join("");

  return cleanTranscript(rawText);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanTranscript(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}
