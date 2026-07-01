// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Headphones, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  const [setup, setSetup] = useState<{ ok: boolean; missing: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/check-setup")
      .then((r) => r.json())
      .then(setSetup)
      .catch(() => setSetup(null));
  }, []);

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-6 text-center bg-[#13151a] text-[#f7f4ed]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8a23d]/10 text-[#e8a23d]">
        <Headphones size={28} />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">
        Train your ear. Grade your transcription.
      </h1>
      <p className="mt-3 max-w-md text-[#a8a299]">
        Drop in a YouTube video or audio clip, type what you hear, and get an instant,
        granular breakdown of every mistake — powered by Gemini and Groq, running locally.
      </p>

      {/* Setup status banner */}
      {setup && !setup.ok && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-[#e8a23d]/30 bg-[#e8a23d]/10 px-5 py-4 text-sm text-[#e8a23d] max-w-md text-left">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} /> Setup required
          </div>
          <p className="text-[#c9a06a]">
            Add the following to your <code className="bg-[#23262e] px-1 py-0.5 rounded text-xs">.env.local</code> file:
          </p>
          <ul className="space-y-1">
            {setup.missing.map((key) => (
              <li key={key} className="font-mono text-xs text-[#f7f4ed] bg-[#23262e] px-2 py-1 rounded">
                {key}=your_key_here
              </li>
            ))}
          </ul>
          <p className="text-[#c9a06a] text-xs mt-1">
            See README.md for where to get each key (all free, no credit card).
          </p>
        </div>
      )}

      {setup?.ok && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-[#5b8c5a]">
          <CheckCircle2 size={14} /> API keys configured — you&apos;re ready to go
        </div>
      )}

      <Link
        href="/dashboard"
        className="mt-7 flex items-center gap-2 rounded-xl bg-[#e8a23d] px-6 py-3 text-sm font-semibold text-[#13151a] hover:bg-[#f0b557] transition-colors"
      >
        Start practicing <ArrowRight size={16} />
      </Link>
    </main>
  );
}
