// app/api/transcribe-mp4/route.ts
//
// Accepts an uploaded MP4/audio file as multipart/form-data and forwards it
// DIRECTLY to Groq's Whisper Large v3 Turbo endpoint. The file is held only
// in memory for the duration of this request — it is never written to disk
// and never persisted — keeping this compatible with Vercel's ephemeral
// serverless filesystem and avoiding any storage cost.
//
// IMPORTANT FREE-TIER CONSTRAINTS:
//  - Groq's free tier accepts files up to 25MB via direct upload (100MB via
//    URL is a paid-tier-only feature), plus 2,000 requests/day and 7,200
//    audio-seconds/hour.
//  - HOWEVER: Vercel's Hobby (free) plan enforces a hard 4.5MB request body
//    limit at the platform/proxy level for ALL serverless functions —
//    this is NOT configurable via next.config.mjs (that file's
//    serverActions.bodySizeLimit only affects React Server Actions, not
//    Route Handlers like this one). 4.5MB is therefore the REAL ceiling
//    for this route on Vercel's free tier, not Groq's 25MB.
//  - Because of that mismatch, we enforce a 4MB guard here (leaving a small
//    safety margin) and the dashboard UI nudges users toward short clips or
//    audio-only extraction. For longer source material, the practical
//    free-tier workaround is to have the browser extract just the audio
//    track client-side (e.g. via the Web Audio API / MediaRecorder) before
//    upload, since audio-only files are dramatically smaller than video at
//    the same duration — or self-host on a platform without this proxy cap.
//
// POST body: multipart/form-data with a "file" field (audio or video file)
// Response:  TranscribeResponse

import { NextRequest, NextResponse } from "next/server";
import type { TranscribeResponse } from "@/types";

export const runtime = "nodejs";
// Allow a bit more time than default since Whisper Turbo is fast (~228x
// real-time) but network upload of the file itself takes a moment.
export const maxDuration = 60; // seconds — within Vercel Hobby's allowance for Node functions

// Running locally means there is no platform-level proxy cap on request
// bodies (that 4.5MB ceiling only applied to Vercel's hosted functions).
// Groq's own direct-upload limit is 25MB, so we use that here.
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB — Groq's direct-upload cap
const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json<TranscribeResponse>(
        { success: false, script: "", error: "Server is missing GROQ_API_KEY configuration." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json<TranscribeResponse>(
        { success: false, script: "", error: "No file found in upload. Expected a 'file' field." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json<TranscribeResponse>(
        {
          success: false,
          script: "",
          error: `File is too large (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Groq's free tier accepts files up to 25MB. Try trimming the clip or extracting just the audio track.`,
        },
        { status: 413 }
      );
    }

    // Build a fresh FormData to forward to Groq, matching their
    // OpenAI-compatible /audio/transcriptions schema.
    const groqForm = new FormData();
    groqForm.append("file", file, file.name);
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "json");
    // language is intentionally omitted so Whisper auto-detects — pass one
    // explicitly here (e.g. groqForm.append("language", "en")) if you want
    // to lock the app to a single target language for faster/more accurate results.

    const groqResponse = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error("[transcribe-mp4] Groq API error:", groqResponse.status, errorBody);

      const message =
        groqResponse.status === 429
          ? "Transcription quota reached for today (Groq free tier limit). Please try again later."
          : "Transcription failed. The file format may be unsupported — try MP4, MP3, or WAV.";

      return NextResponse.json<TranscribeResponse>(
        { success: false, script: "", error: message },
        { status: groqResponse.status === 429 ? 429 : 502 }
      );
    }

    const result = await groqResponse.json();
    const script = (result.text as string)?.trim();

    if (!script) {
      return NextResponse.json<TranscribeResponse>(
        { success: false, script: "", error: "Transcription returned empty text. Try a clearer audio source." },
        { status: 422 }
      );
    }

    return NextResponse.json<TranscribeResponse>({ success: true, script });
  } catch (err) {
    console.error("[transcribe-mp4] Unexpected error:", err);
    return NextResponse.json<TranscribeResponse>(
      { success: false, script: "", error: "Unexpected server error while transcribing." },
      { status: 500 }
    );
  }
}
