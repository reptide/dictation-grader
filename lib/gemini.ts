// lib/gemini.ts
// Centralizes all Gemini API interaction: client init, prompt construction,
// and response parsing/validation. Keeping this out of the route handler
// makes the route itself a thin, readable orchestrator.

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { GradingResult } from "@/types";
import { clampScore } from "./utils";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Thrown at import time on the server only — never reaches the client bundle.
  console.warn(
    "[gemini.ts] GEMINI_API_KEY is not set. /api/grade-dictation will fail until it is."
  );
}

const genAI = new GoogleGenerativeAI(apiKey ?? "");

// NOTE: gemini-2.0-flash was deprecated June 1, 2026. Use 2.5-flash-lite
// (cheapest, free-tier eligible) as primary, with 2.5-flash as a fallback
// for cases where the lite model produces malformed JSON or low-confidence
// grading. Override via env vars without touching code.
const PRIMARY_MODEL = process.env.GEMINI_MODEL_PRIMARY || "gemini-2.5-flash-lite";
const FALLBACK_MODEL = process.env.GEMINI_MODEL_FALLBACK || "gemini-2.5-flash";

// Structured output schema — forces Gemini to return valid JSON matching
// our GradingResult shape, removing the need for fragile regex/markdown
// stripping on the response.
const gradingResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    score: {
      type: SchemaType.NUMBER,
      description: "Overall score from 0 to 100, weighting accuracy, omissions, and severity of mistakes.",
    },
    accuracyPercentage: {
      type: SchemaType.NUMBER,
      description: "Percentage (0-100) of words from the master script that were correctly transcribed.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "One short, encouraging sentence summarizing performance.",
    },
    corrections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          expected: { type: SchemaType.STRING, description: "The correct word/phrase from the master script." },
          received: { type: SchemaType.STRING, description: "What the user actually wrote. Empty string if omitted entirely." },
          errorType: {
            type: SchemaType.STRING,
            enum: ["spelling", "missing", "extra", "punctuation", "word_order"],
            description: "Category of the mistake.",
          },
        },
        required: ["expected", "received", "errorType"],
      },
    },
  },
  required: ["score", "accuracyPercentage", "corrections"],
};

const SYSTEM_INSTRUCTION = `You are a strict but fair dictation grading engine for language learners.
You compare a "master script" (ground truth, transcribed from audio/video) against a "user attempt"
(what a student typed or wrote while listening).

Grading rules:
1. Score 0-100 based on overall fidelity to the master script. Minor punctuation/capitalization slips
   should cost very little. Missing words, wrong words, and word-order errors should cost more.
2. accuracyPercentage = percentage of master script words correctly reproduced in the right place.
3. Produce a "corrections" array capturing EVERY discrepancy, no matter how small:
   - "spelling": word present but misspelled/mistyped.
   - "missing": a word/phrase in the master script that the user omitted entirely (received = "").
   - "extra": a word/phrase the user added that doesn't exist in the master script (expected = "").
   - "punctuation": punctuation-only mismatch (e.g. missing comma, wrong terminal punctuation).
   - "word_order": correct words but in the wrong sequence.
4. Be deterministic: given the same two inputs, always return the same scoring logic and structure.
5. Never include commentary outside the JSON structure. Output must conform exactly to the provided schema.`;

interface GradeParams {
  masterScript: string;
  userAttempt: string;
  language?: string;
}

/**
 * Calls Gemini to grade a dictation attempt, with automatic fallback to a
 * stronger model if the primary (lite) model fails or returns invalid JSON.
 */
export async function gradeWithGemini({
  masterScript,
  userAttempt,
  language,
}: GradeParams): Promise<GradingResult> {
  const prompt = buildPrompt(masterScript, userAttempt, language);

  try {
    return await callModel(PRIMARY_MODEL, prompt);
  } catch (primaryError) {
    console.error(`[gemini.ts] Primary model (${PRIMARY_MODEL}) failed:`, primaryError);
    try {
      return await callModel(FALLBACK_MODEL, prompt);
    } catch (fallbackError) {
      console.error(`[gemini.ts] Fallback model (${FALLBACK_MODEL}) also failed:`, fallbackError);
      throw new Error(
        "Grading failed on both primary and fallback Gemini models. Please try again shortly."
      );
    }
  }
}

async function callModel(modelName: string, prompt: string): Promise<GradingResult> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: gradingResponseSchema as any,
      temperature: 0.1, // low temperature for deterministic, consistent grading
    },
  });

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();

  let parsed: GradingResult;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Model ${modelName} returned non-JSON output: ${rawText.slice(0, 200)}`);
  }

  // Defensive normalization in case the model drifts slightly from the schema.
  return {
    score: clampScore(Number(parsed.score) || 0),
    accuracyPercentage: clampScore(Number(parsed.accuracyPercentage) || 0),
    corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
  };
}

function buildPrompt(masterScript: string, userAttempt: string, language?: string): string {
  return `Master Script (ground truth)${language ? ` [language: ${language}]` : ""}:
"""
${masterScript}
"""

User Attempt (what the student typed while listening):
"""
${userAttempt}
"""

Compare these two texts and return the grading JSON as instructed.`;
}
