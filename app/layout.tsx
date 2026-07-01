// app/layout.tsx
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DictationLab — Free Language Dictation Grading",
  description: "Practice listening and transcription skills with AI-graded dictation exercises.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#13151a] antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
