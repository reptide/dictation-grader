// app/dashboard/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { Sparkles, AlertCircle, RotateCcw, History, ChevronDown, ChevronUp } from "lucide-react";
import VideoPanel from "@/components/VideoPanel";
import DictationInput from "@/components/DictationInput";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import LoadingSpinner from "@/components/LoadingSpinner";
import type {
  VideoSourceMode,
  AnswerInputMode,
  GradingResult,
  YoutubeScriptResponse,
  TranscribeResponse,
  OcrResponse,
  DictationSession,
} from "@/types";

type FlowStage = "setup" | "ready" | "grading" | "graded";

const HISTORY_KEY = "dictation_grader_history";
const MAX_HISTORY = 20; // cap stored sessions so localStorage doesn't grow unbounded

// Locally there is no platform proxy capping request bodies,
// so we can go up to Groq's own 25MB limit directly.
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export default function DashboardPage() {
  // --- Source state ---
  const [videoMode, setVideoMode] = useState<VideoSourceMode>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mp4File, setMp4File] = useState<File | null>(null);

  // --- Script state ---
  const [masterScript, setMasterScript] = useState("");
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [captionLanguage, setCaptionLanguage] = useState("en");
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [loadedLanguage, setLoadedLanguage] = useState<string | null>(null);

  // --- Answer input state ---
  const [answerMode, setAnswerMode] = useState<AnswerInputMode>("type");
  const [userAttempt, setUserAttempt] = useState("");
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // --- Grading state ---
  const [stage, setStage] = useState<FlowStage>("setup");
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);

  // --- Local history state ---
  const [history, setHistory] = useState<DictationSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const hasScript = masterScript.trim().length > 0;

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // Corrupt storage — start fresh
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  // ───────────────────────────── Script loading ─────────────────────────────

  const handleYoutubeSubmit = useCallback(
    async (languageOverride?: string) => {
      const lang = languageOverride || captionLanguage;
      setIsLoadingScript(true);
      setScriptError(null);
      setAvailableLanguages([]);
      setMasterScript("");
      try {
        const res = await fetch("/api/fetch-youtube-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl, language: lang }),
        });
        const data: YoutubeScriptResponse = await res.json();
        if (!data.success) {
          setScriptError(data.error || "Failed to load the transcript for this video.");
          if (data.availableLanguages?.length) setAvailableLanguages(data.availableLanguages);
          return;
        }
        setMasterScript(data.script);
        setLoadedLanguage(data.language || lang);
        setCaptionLanguage(lang);
        setStage("ready");
      } catch {
        setScriptError("Network error while fetching the transcript. Please try again.");
      } finally {
        setIsLoadingScript(false);
      }
    },
    [youtubeUrl, captionLanguage]
  );

  const handleMp4FileChange = useCallback(async (file: File | null) => {
    setMp4File(file);
    setMasterScript("");
    setScriptError(null);
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setScriptError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
          `Groq's free tier accepts files up to 25MB. Try trimming the clip or extracting just the audio.`
      );
      return;
    }

    setIsLoadingScript(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/transcribe-mp4", { method: "POST", body: formData });
      const data: TranscribeResponse = await res.json();
      if (!data.success) {
        setScriptError(data.error || "Failed to transcribe this file.");
        return;
      }
      setMasterScript(data.script);
      setStage("ready");
    } catch {
      setScriptError("Network error while transcribing the file. Please try again.");
    } finally {
      setIsLoadingScript(false);
    }
  }, []);

  // ───────────────────────────── Handwriting OCR ─────────────────────────────

  const handleImageUpload = useCallback(async (file: File) => {
    setIsOcrLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/ocr-handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data: OcrResponse = await res.json();
      if (data.success) setUserAttempt(data.text);
      else setGradingError(data.error || "Could not read the handwriting in that image.");
    } catch {
      setGradingError("Network error while processing the image.");
    } finally {
      setIsOcrLoading(false);
    }
  }, []);

  // ───────────────────────────── Grading ─────────────────────────────

  const handleSubmitForGrading = useCallback(async () => {
    if (!hasScript || !userAttempt.trim()) return;
    setStage("grading");
    setGradingError(null);
    setGradingResult(null);

    try {
      const res = await fetch("/api/grade-dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterScript, userAttempt }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Grading failed (status ${res.status}).`);
      }
      const result: GradingResult = await res.json();
      setGradingResult(result);
      setStage("graded");

      // Save to localStorage history
      saveToLocalHistory({
        sourceType: videoMode,
        sourceReference: videoMode === "youtube" ? youtubeUrl : mp4File?.name || "uploaded file",
        masterScript,
        userAttempt,
        result,
        onSaved: (sessions) => setHistory(sessions),
      });
    } catch (err: any) {
      setGradingError(err?.message || "Something went wrong while grading. Please try again.");
      setStage("ready");
    }
  }, [hasScript, userAttempt, masterScript, videoMode, youtubeUrl, mp4File]);

  function handleRetry() {
    setUserAttempt("");
    setGradingResult(null);
    setGradingError(null);
    setStage("ready");
  }

  function handleClearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  const canSubmit = hasScript && userAttempt.trim().length > 0 && stage !== "grading";

  return (
    <div className="min-h-screen bg-[#13151a] text-[#f7f4ed]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Dictation Practice</h1>
          <p className="text-sm text-[#a8a299] mt-1">
            Load a video, listen closely, and type exactly what you hear.
          </p>
        </div>

        {scriptError && (
          <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-[#c1543c]/30 bg-[#c1543c]/10 px-4 py-3 text-sm text-[#e08a78]">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {scriptError}
            </div>
            {availableLanguages.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-6">
                <span className="text-xs text-[#c9897c]">Try:</span>
                {availableLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleYoutubeSubmit(lang)}
                    className="rounded-md border border-[#c1543c]/40 px-2 py-1 text-xs font-medium text-[#f7f4ed] hover:bg-[#c1543c]/20 transition-colors"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loadedLanguage && loadedLanguage.toLowerCase() !== "en" && stage !== "setup" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#e8a23d]/30 bg-[#e8a23d]/10 px-4 py-2.5 text-xs text-[#e8a23d]">
            <AlertCircle size={14} className="flex-shrink-0" />
            Loaded captions in "{loadedLanguage}" — not English. Double-check this is the language you want to practice.
          </div>
        )}

        {/* Main split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch" style={{ minHeight: "480px" }}>
          <VideoPanel
            mode={videoMode}
            onModeChange={(m) => { setVideoMode(m); setScriptError(null); }}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={setYoutubeUrl}
            onYoutubeSubmit={() => handleYoutubeSubmit()}
            captionLanguage={captionLanguage}
            onCaptionLanguageChange={setCaptionLanguage}
            mp4File={mp4File}
            onMp4FileChange={handleMp4FileChange}
            isLoadingScript={isLoadingScript}
            hasScript={hasScript}
          />
          <DictationInput
            mode={answerMode}
            onModeChange={setAnswerMode}
            value={userAttempt}
            onChange={setUserAttempt}
            onImageUpload={handleImageUpload}
            isOcrLoading={isOcrLoading}
            disabled={stage === "grading"}
          />
        </div>

        {/* Submit bar */}
        <div className="mt-5 flex flex-col items-center gap-3">
          {isLoadingScript && <LoadingSpinner label="Fetching script…" />}

          {stage !== "graded" && (
            <button
              onClick={handleSubmitForGrading}
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-xl bg-[#e8a23d] px-6 py-3 text-sm font-semibold text-[#13151a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0b557] transition-colors"
            >
              {stage === "grading" ? (
                <><Sparkles size={16} className="animate-pulse" /> Grading your attempt…</>
              ) : (
                <><Sparkles size={16} /> Submit for Grading</>
              )}
            </button>
          )}

          {!hasScript && (
            <p className="text-xs text-[#6b6860]">Load a YouTube link or upload a file to get started.</p>
          )}

          {gradingError && (
            <div className="flex items-center gap-2 text-sm text-[#e08a78]">
              <AlertCircle size={14} /> {gradingError}
            </div>
          )}
        </div>

        {/* Results */}
        {gradingResult && stage === "graded" && (
          <div className="mt-6 space-y-4">
            <ScoreBreakdown result={gradingResult} />
            <div className="flex justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 rounded-lg border border-[#2a2d35] px-4 py-2 text-sm text-[#a8a299] hover:text-[#f7f4ed] hover:border-[#3a3d47] transition-colors"
              >
                <RotateCcw size={14} /> Try this clip again
              </button>
            </div>
          </div>
        )}

        {/* History panel */}
        {history.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-2 text-sm text-[#a8a299] hover:text-[#f7f4ed] transition-colors mb-3"
            >
              <History size={15} />
              Past sessions ({history.length})
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHistory && (
              <div className="rounded-2xl border border-[#2a2d35] bg-[#1a1c22] overflow-hidden">
                <div className="divide-y divide-[#2a2d35]">
                  {history.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-[#f7f4ed] truncate">{s.source_reference}</p>
                        <p className="text-xs text-[#6b6860] mt-0.5">{formatDate(s.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-xs text-[#a8a299]">{s.accuracy_percentage}% accuracy</span>
                        <span
                          className="text-lg font-bold tabular-nums"
                          style={{ color: scoreColor(s.score) }}
                        >
                          {s.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#2a2d35] px-4 py-2 flex justify-end">
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-[#6b6860] hover:text-[#c1543c] transition-colors"
                  >
                    Clear history
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Helpers ─────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function scoreColor(score: number): string {
  if (score >= 90) return "#5b8c5a";
  if (score >= 70) return "#e8a23d";
  return "#c1543c";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface SaveParams {
  sourceType: VideoSourceMode;
  sourceReference: string;
  masterScript: string;
  userAttempt: string;
  result: GradingResult;
  onSaved: (sessions: DictationSession[]) => void;
}

function saveToLocalHistory({ sourceType, sourceReference, masterScript, userAttempt, result, onSaved }: SaveParams) {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    const existing: DictationSession[] = stored ? JSON.parse(stored) : [];

    const newSession: DictationSession = {
      id: crypto.randomUUID(),
      user_id: "local",
      source_type: sourceType,
      source_reference: sourceReference,
      master_script: masterScript,
      user_attempt: userAttempt,
      score: result.score,
      accuracy_percentage: result.accuracyPercentage,
      corrections: result.corrections,
      created_at: new Date().toISOString(),
    };

    // Prepend newest first, cap at MAX_HISTORY entries
    const updated = [newSession, ...existing].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    onSaved(updated);
  } catch (err) {
    console.warn("[dashboard] Could not save to localStorage:", err);
  }
}
