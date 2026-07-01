// components/DictationInput.tsx
//
// Right-hand panel of the dashboard. The primary interaction is the large
// monospace textarea where the user types what they hear in real time.
// A secondary "handwriting" mode lets them upload a photo of handwritten
// notes instead, which gets OCR'd via /api/ocr-handwriting before grading.

"use client";

import { useRef, useState } from "react";
import { PenLine, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn, countWords } from "@/lib/utils";
import type { AnswerInputMode } from "@/types";

interface DictationInputProps {
  mode: AnswerInputMode;
  onModeChange: (mode: AnswerInputMode) => void;
  value: string;
  onChange: (value: string) => void;
  onImageUpload: (file: File) => Promise<void>;
  isOcrLoading: boolean;
  disabled?: boolean;
}

export default function DictationInput({
  mode,
  onModeChange,
  value,
  onChange,
  onImageUpload,
  isOcrLoading,
  disabled,
}: DictationInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    await onImageUpload(file);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#2a2d35] bg-[#1a1c22] overflow-hidden">
      {/* Input mode toggle */}
      <div className="flex items-center justify-between border-b border-[#2a2d35] p-1.5">
        <div className="flex gap-1">
          <button
            onClick={() => onModeChange("type")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "type" ? "bg-[#e8a23d] text-[#13151a]" : "text-[#a8a299] hover:bg-[#23262e] hover:text-[#f7f4ed]"
            )}
          >
            <Type size={15} /> Type
          </button>
          <button
            onClick={() => onModeChange("handwriting")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "handwriting" ? "bg-[#e8a23d] text-[#13151a]" : "text-[#a8a299] hover:bg-[#23262e] hover:text-[#f7f4ed]"
            )}
          >
            <PenLine size={15} /> Handwriting
          </button>
        </div>
        <span className="pr-2 text-xs text-[#6b6860]">{countWords(value)} words</span>
      </div>

      {mode === "type" && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Start typing what you hear…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className={cn(
            "flex-1 w-full resize-none bg-transparent p-5 text-[15px] leading-relaxed text-[#f7f4ed] placeholder:text-[#4a4d56]",
            "font-mono focus:outline-none disabled:opacity-50"
          )}
        />
      )}

      {mode === "handwriting" && (
        <div className="flex-1 flex flex-col p-4 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isOcrLoading}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#33363f] py-3 text-sm text-[#a8a299] hover:border-[#e8a23d]/50 hover:text-[#f7f4ed] transition-colors disabled:opacity-50"
          >
            {isOcrLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Reading handwriting…
              </>
            ) : (
              <>
                <ImageIcon size={16} /> Upload a photo of your handwritten answer
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {previewUrl && (
            <div className="relative flex-1 rounded-lg overflow-hidden border border-[#2a2d35] bg-[#0e0f12]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Handwriting upload preview" className="h-full w-full object-contain" />
            </div>
          )}

          <p className="text-xs text-[#6b6860]">
            Extracted text will appear below for you to review before grading.
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="OCR result will appear here — feel free to correct it"
            spellCheck={false}
            className="h-32 resize-none rounded-lg bg-[#0e0f12] border border-[#2a2d35] p-3 text-sm font-mono text-[#f7f4ed] placeholder:text-[#4a4d56] focus:outline-none focus:ring-2 focus:ring-[#e8a23d]/50"
          />
        </div>
      )}
    </div>
  );
}
