// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner used throughout the components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes text before sending it to Gemini for comparison.
 * Collapses whitespace and strips characters that don't affect
 * dictation accuracy (we keep case and punctuation since Gemini
 * is instructed to grade those — this just removes noise like
 * stray newlines/tabs from textarea input or OCR output).
 */
export function normalizeForGrading(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Clamp a number into the 0–100 range, rounding to the nearest integer. */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Simple word counter used for client-side stats while typing. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Formats an ISO timestamp for the history list. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
