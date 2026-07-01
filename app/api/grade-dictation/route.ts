// app/api/grade-dictation/route.ts
//
// Accepts the master script (ground truth) and the user's attempt, sends
// both to Gemini with a structured-output schema, and returns a strict
// JSON grading result. All heavy reasoning happens on Google's infrastructure
// — this route is just thin orchestration, so it finishes in 1-3 seconds
// and stays comfortably inside Vercel's free-tier execution limits.
//
// POST body: GradeDictationRequest { masterScript, userAttempt, language? }
// Response:  GradingResult

import { NextRequest, NextResponse } from "next/server";
import { gradeWithGemini } from "@/lib/gemini";
import { normalizeForGrading } from "@/lib/utils";
import type { GradeDictationRequest, GradingResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30; // Gemini Flash-Lite typically responds in 1-3s; generous buffer for retries

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GradeDictationRequest;
    const { masterScript, userAttempt, language } = body;

    // --- Input validation ---
    if (!masterScript || typeof masterScript !== "string" || !masterScript.trim()) {
      return NextResponse.json(
        { error: "Missing or empty 'masterScript'." },
        { status: 400 }
      );
    }
    if (typeof userAttempt !== "string") {
      return NextResponse.json(
        { error: "Missing 'userAttempt' (must be a string, can be empty)." },
        { status: 400 }
      );
    }

    // Guard against pathologically long inputs blowing the Gemini free-tier
    // token budget unnecessarily. Raised from an earlier 8,000-char limit —
    // that was tuned for short clips and broke on real-world videos in the
    // 10-30 minute range. ~20,000 chars covers roughly a 25-30 minute video
    // at normal speaking pace (~120-150 wpm) while still protecting against
    // someone accidentally grading a multi-hour transcript in one call.
    // Raise further if your use case needs longer source material, but
    // remember every extra character counts against Gemini's free-tier
    // tokens-per-minute/day quota on whichever model you've configured.
    const MAX_CHARS = 20000;
    if (masterScript.length > MAX_CHARS || userAttempt.length > MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Input too long (${Math.max(
            masterScript.length,
            userAttempt.length
          )} characters). Please keep scripts under ${MAX_CHARS.toLocaleString()} characters — try a shorter clip, or trim the transcript to the section you want to practice.`,
        },
        { status: 413 }
      );
    }

    const cleanMaster = normalizeForGrading(masterScript);
    const cleanAttempt = normalizeForGrading(userAttempt);

    // Edge case: user submitted nothing at all — skip the LLM call entirely
    // and return a deterministic zero score instead of spending a Gemini quota call.
    if (!cleanAttempt) {
      const emptyResult: GradingResult = {
        score: 0,
        accuracyPercentage: 0,
        corrections: cleanMaster.split(/\s+/).map((word) => ({
          expected: word,
          received: "",
          errorType: "missing" as const,
        })),
        summary: "No answer was submitted.",
      };
      return NextResponse.json<GradingResult>(emptyResult);
    }

    const result = await gradeWithGemini({
      masterScript: cleanMaster,
      userAttempt: cleanAttempt,
      language,
    });

    return NextResponse.json<GradingResult>(result);
  } catch (err: any) {
    console.error("[grade-dictation] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Grading failed due to an unexpected server error." },
      { status: 500 }
    );
  }
}
