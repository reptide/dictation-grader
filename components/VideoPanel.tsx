// components/VideoPanel.tsx
//
// Left-hand panel of the dashboard. Handles two source modes:
//  1. YouTube — renders the official IFrame player via react-youtube (free,
//     client-side, no API quota) and lets the parent fetch captions server-side.
//  2. MP4 — renders a native <video> element from a local object URL, so the
//     file itself never leaves the browser except when explicitly sent to
//     /api/transcribe-mp4 for transcription.

"use client";

import { useRef, useState } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import { Link2, Upload, Film, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidYoutubeUrl, getThumbnailUrl, extractVideoId } from "@/lib/youtube";
import type { VideoSourceMode } from "@/types";

interface VideoPanelProps {
  mode: VideoSourceMode;
  onModeChange: (mode: VideoSourceMode) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  onYoutubeSubmit: () => void;
  captionLanguage: string;
  onCaptionLanguageChange: (lang: string) => void;
  mp4File: File | null;
  onMp4FileChange: (file: File | null) => void;
  isLoadingScript: boolean;
  hasScript: boolean;
}

export default function VideoPanel({
  mode,
  onModeChange,
  youtubeUrl,
  onYoutubeUrlChange,
  onYoutubeSubmit,
  captionLanguage,
  onCaptionLanguageChange,
  mp4File,
  onMp4FileChange,
  isLoadingScript,
  hasScript,
}: VideoPanelProps) {
  const [mp4ObjectUrl, setMp4ObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoId = extractVideoId(youtubeUrl);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mp4ObjectUrl) URL.revokeObjectURL(mp4ObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setMp4ObjectUrl(objectUrl);
    onMp4FileChange(file);
  }

  function clearMp4() {
    if (mp4ObjectUrl) URL.revokeObjectURL(mp4ObjectUrl);
    setMp4ObjectUrl(null);
    onMp4FileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const youtubeOpts: YouTubeProps["opts"] = {
    width: "100%",
    height: "100%",
    playerVars: { rel: 0, modestbranding: 1 },
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#2a2d35] bg-[#1a1c22] overflow-hidden">
      {/* Source mode toggle */}
      <div className="flex border-b border-[#2a2d35] p-1.5 gap-1">
        <button
          onClick={() => onModeChange("youtube")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            mode === "youtube"
              ? "bg-[#e8a23d] text-[#13151a]"
              : "text-[#a8a299] hover:bg-[#23262e] hover:text-[#f7f4ed]"
          )}
        >
          <Link2 size={15} /> YouTube Link
        </button>
        <button
          onClick={() => onModeChange("mp4")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            mode === "mp4"
              ? "bg-[#e8a23d] text-[#13151a]"
              : "text-[#a8a299] hover:bg-[#23262e] hover:text-[#f7f4ed]"
          )}
        >
          <Upload size={15} /> Upload MP4
        </button>
      </div>

      {/* Source input area */}
      {mode === "youtube" && (
        <div className="border-b border-[#2a2d35] p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => onYoutubeUrlChange(e.target.value)}
              placeholder="Paste a YouTube URL…"
              className="flex-1 rounded-lg bg-[#23262e] border border-[#33363f] px-3 py-2 text-sm text-[#f7f4ed] placeholder:text-[#6b6860] focus:outline-none focus:ring-2 focus:ring-[#e8a23d]/50"
              onKeyDown={(e) => e.key === "Enter" && isValidYoutubeUrl(youtubeUrl) && onYoutubeSubmit()}
            />
            <button
              onClick={() => onYoutubeSubmit()}
              disabled={!isValidYoutubeUrl(youtubeUrl) || isLoadingScript}
              className="rounded-lg bg-[#e8a23d] px-4 py-2 text-sm font-semibold text-[#13151a] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0b557] transition-colors whitespace-nowrap"
            >
              {isLoadingScript ? "Loading…" : "Load"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="caption-lang" className="text-xs text-[#6b6860]">
              Caption language:
            </label>
            <select
              id="caption-lang"
              value={captionLanguage}
              onChange={(e) => onCaptionLanguageChange(e.target.value)}
              className="rounded-md bg-[#23262e] border border-[#33363f] px-2 py-1 text-xs text-[#f7f4ed] focus:outline-none focus:ring-2 focus:ring-[#e8a23d]/50"
            >
              <option value="en">English (en)</option>
              <option value="ar">Arabic (ar)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="ko">Korean (ko)</option>
              <option value="zh-Hans">Chinese, Simplified (zh-Hans)</option>
              <option value="pt">Portuguese (pt)</option>
              <option value="ru">Russian (ru)</option>
              <option value="hi">Hindi (hi)</option>
            </select>
            <span className="text-xs text-[#6b6860]">— if unavailable, we'll show what languages exist instead</span>
          </div>
        </div>
      )}

      {mode === "mp4" && !mp4File && (
        <div className="border-b border-[#2a2d35] p-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#33363f] py-3 text-sm text-[#a8a299] hover:border-[#e8a23d]/50 hover:text-[#f7f4ed] transition-colors"
          >
            <Film size={16} /> Choose an MP4, MP3, or WAV file (max 25MB)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,audio/mpeg,audio/wav,audio/mp3,video/*,audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {mode === "mp4" && mp4File && (
        <div className="border-b border-[#2a2d35] p-3 flex items-center justify-between gap-2">
          <span className="text-sm text-[#a8a299] truncate flex items-center gap-2">
            <Film size={15} className="text-[#e8a23d] flex-shrink-0" />
            {mp4File.name} <span className="text-[#6b6860]">({(mp4File.size / 1024 / 1024).toFixed(1)}MB)</span>
          </span>
          <button onClick={clearMp4} className="text-[#6b6860] hover:text-[#c1543c] transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Player area */}
      <div className="relative flex-1 bg-[#0e0f12] flex items-center justify-center min-h-[220px]">
        {mode === "youtube" && videoId && (
          <YouTube videoId={videoId} opts={youtubeOpts} className="h-full w-full" iframeClassName="h-full w-full" />
        )}
        {mode === "youtube" && !videoId && (
          <EmptyState
            icon={<Link2 size={28} />}
            text="Paste a YouTube link above to load the video"
          />
        )}
        {mode === "mp4" && mp4ObjectUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={mp4ObjectUrl} controls className="h-full w-full object-contain" />
        )}
        {mode === "mp4" && !mp4ObjectUrl && (
          <EmptyState icon={<Upload size={28} />} text="Upload a file to preview it here" />
        )}
      </div>

      {hasScript && (
        <div className="border-t border-[#2a2d35] bg-[#1f3a2e]/40 px-3 py-2 text-xs text-[#7cb88f] flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7cb88f]" />
          Master script ready — listen carefully and type what you hear
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-[#4a4d56] px-6 text-center">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}
