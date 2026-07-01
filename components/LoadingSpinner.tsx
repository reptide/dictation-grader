// components/LoadingSpinner.tsx
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({ label, className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm text-[#a8a299]", className)}>
      <span className="relative flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8a23d] opacity-60" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#e8a23d]" />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}
