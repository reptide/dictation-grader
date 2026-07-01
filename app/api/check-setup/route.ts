// app/api/check-setup/route.ts
// Returns which required keys are missing so the UI can show a clear
// setup warning instead of cryptic API errors on first run.
import { NextResponse } from "next/server";

export async function GET() {
  const missing: string[] = [];
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_key_here") {
    missing.push("GEMINI_API_KEY");
  }
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_key_here") {
    missing.push("GROQ_API_KEY");
  }
  return NextResponse.json({ ok: missing.length === 0, missing });
}
