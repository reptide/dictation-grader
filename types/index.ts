// types/index.ts
// Centralized type definitions shared between API routes and the frontend dashboard.

/** A single granular error found when comparing the user's attempt to the master script. */
export interface Correction {
  /** The correct word/phrase from the master script */
  expected: string;
  /** What the user actually typed (empty string if the word was fully omitted) */
  received: string;
  /** Category of mistake — drives the color-coding in the UI */
  errorType: "spelling" | "missing" | "extra" | "punctuation" | "word_order";
  /** Optional 0-indexed position in the master script, for highlighting */
  position?: number;
}

/** The strict JSON contract returned by /api/grade-dictation */
export interface GradingResult {
  score: number; // 0-100 overall score
  accuracyPercentage: number; // % of words matched correctly
  corrections: Correction[];
  summary?: string; // one-line human-readable feedback
}

/** Request body for /api/grade-dictation */
export interface GradeDictationRequest {
  masterScript: string;
  userAttempt: string;
  /** Optional: language hint improves grading accuracy for non-English content */
  language?: string;
}

/** Response from /api/fetch-youtube-script */
export interface YoutubeScriptResponse {
  success: boolean;
  videoId: string;
  script: string;
  /** ISO 639-1 language code of the caption track that was actually returned (e.g. "en", "ar") */
  language?: string;
  /** ISO codes of alternative caption tracks, populated when the requested language wasn't available */
  availableLanguages?: string[];
  error?: string;
}

/** Response from /api/transcribe-mp4 */
export interface TranscribeResponse {
  success: boolean;
  script: string;
  error?: string;
}

/** Response from /api/ocr-handwriting */
export interface OcrResponse {
  success: boolean;
  text: string;
  error?: string;
}

/** Shape of a row in the Supabase `sessions` table */
export interface DictationSession {
  id: string;
  user_id: string;
  source_type: "youtube" | "mp4";
  source_reference: string; // YouTube URL or original filename
  master_script: string;
  user_attempt: string;
  score: number;
  accuracy_percentage: number;
  corrections: Correction[];
  created_at: string;
}

/** Input source mode selected in the dashboard UI */
export type VideoSourceMode = "youtube" | "mp4";

/** Answer input mode selected in the dashboard UI */
export type AnswerInputMode = "type" | "handwriting";
