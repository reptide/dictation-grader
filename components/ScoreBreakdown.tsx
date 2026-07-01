// components/ScoreBreakdown.tsx
//
// Renders the grading result: an overall score, a "tape meter" style
// accuracy bar (nodding to the dictation/audio theme of the product),
// and a granular, color-coded list of every correction Gemini found.

"use client";

import { CheckCircle2, XCircle, AlertTriangle, ArrowLeftRight, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GradingResult, Correction } from "@/types";

interface ScoreBreakdownProps {
  result: GradingResult;
}

const ERROR_META: Record<
  Correction["errorType"],
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  spelling: {
    label: "Spelling",
    icon: <Type size={13} />,
    color: "text-[#e8a23d]",
    bg: "bg-[#e8a23d]/10 border-[#e8a23d]/30",
  },
  missing: {
    label: "Missing",
    icon: <XCircle size={13} />,
    color: "text-[#c1543c]",
    bg: "bg-[#c1543c]/10 border-[#c1543c]/30",
  },
  extra: {
    label: "Extra",
    icon: <AlertTriangle size={13} />,
    color: "text-[#9b6fd6]",
    bg: "bg-[#9b6fd6]/10 border-[#9b6fd6]/30",
  },
  punctuation: {
    label: "Punctuation",
    icon: <Type size={13} />,
    color: "text-[#6fa8d6]",
    bg: "bg-[#6fa8d6]/10 border-[#6fa8d6]/30",
  },
  word_order: {
    label: "Word order",
    icon: <ArrowLeftRight size={13} />,
    color: "text-[#5b8c5a]",
    bg: "bg-[#5b8c5a]/10 border-[#5b8c5a]/30",
  },
};

function scoreColor(score: number): string {
  if (score >= 90) return "#5b8c5a";
  if (score >= 70) return "#e8a23d";
  return "#c1543c";
}

export default function ScoreBreakdown({ result }: ScoreBreakdownProps) {
  const { score, accuracyPercentage, corrections, summary } = result;
  const meterColor = scoreColor(score);

  // Group corrections by type for the summary chips.
  const counts = corrections.reduce<Record<string, number>>((acc, c) => {
    acc[c.errorType] = (acc[c.errorType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1c22] overflow-hidden">
      {/* Score header */}
      <div className="p-6 border-b border-[#2a2d35]">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#6b6860] mb-1">Your Score</p>
            <p className="text-5xl font-bold tabular-nums" style={{ color: meterColor }}>
              {score}
              <span className="text-2xl text-[#4a4d56]">/100</span>
            </p>
          </div>
          {corrections.length === 0 ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#5b8c5a]">
              <CheckCircle2 size={16} /> Perfect transcription
            </span>
          ) : (
            <span className="text-sm text-[#a8a299]">
              {corrections.length} {corrections.length === 1 ? "issue" : "issues"} found
            </span>
          )}
        </div>

        {/* Tape-meter accuracy bar */}
        <div>
          <div className="flex justify-between text-xs text-[#6b6860] mb-1.5">
            <span>Word accuracy</span>
            <span className="tabular-nums">{accuracyPercentage}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#0e0f12] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${accuracyPercentage}%`, backgroundColor: meterColor }}
            />
          </div>
        </div>

        {summary && <p className="mt-4 text-sm text-[#c9c4b8] italic">"{summary}"</p>}
      </div>

      {/* Error type chip summary */}
      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 border-b border-[#2a2d35]">
          {Object.entries(counts).map(([type, count]) => {
            const meta = ERROR_META[type as Correction["errorType"]];
            return (
              <span
                key={type}
                className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", meta.color, meta.bg)}
              >
                {meta.icon} {meta.label} · {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Granular corrections list */}
      {corrections.length > 0 && (
        <div className="max-h-80 overflow-y-auto divide-y divide-[#2a2d35]">
          {corrections.map((c, i) => {
            const meta = ERROR_META[c.errorType];
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className={cn("flex-shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", meta.color, meta.bg, "border")}>
                  {meta.icon}
                </span>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {c.expected && (
                    <span className="text-[#7cb88f] font-mono truncate">{c.expected}</span>
                  )}
                  {c.expected && c.received && <span className="text-[#4a4d56]">→</span>}
                  {c.received && (
                    <span className="text-[#c1543c] font-mono line-through truncate">{c.received}</span>
                  )}
                  {!c.received && <span className="text-[#6b6860] italic text-xs">(omitted)</span>}
                  {!c.expected && c.received && (
                    <span className="text-[#9b6fd6] font-mono truncate">added: "{c.received}"</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
