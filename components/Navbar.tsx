// components/Navbar.tsx
import Link from "next/link";
import { Headphones } from "lucide-react";

export default function Navbar() {
  return (
    <header className="border-b border-[#2a2d35] bg-[#13151a]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[#f7f4ed]">
          <Headphones size={20} className="text-[#e8a23d]" />
          <span className="font-semibold tracking-tight">DictationLab</span>
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-[#a8a299] hover:text-[#f7f4ed] transition-colors"
        >
          Practice
        </Link>
      </div>
    </header>
  );
}
