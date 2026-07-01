# Project File Structure

```
dictation-grader/
├── app/
│   ├── api/
│   │   ├── fetch-youtube-script/
│   │   │   └── route.ts          # Fetches native YouTube captions (server-side, no video download)
│   │   ├── transcribe-mp4/
│   │   │   └── route.ts          # Sends uploaded MP4/audio to Groq Whisper for transcription
│   │   ├── grade-dictation/
│   │   │   └── route.ts          # Compares masterScript vs userAttempt via Gemini, returns JSON score
│   │   └── ocr-handwriting/
│   │       └── route.ts          # (Stretch) Google Cloud Vision OCR for handwritten answers
│   │
│   ├── dashboard/
│   │   └── page.tsx              # Main interactive grading dashboard (client component)
│   │
│   ├── history/
│   │   └── page.tsx              # Lists past graded sessions from Supabase
│   │
│   ├── login/
│   │   └── page.tsx              # Supabase magic-link / OAuth login screen
│   │
│   ├── layout.tsx                # Root layout (fonts, nav, Supabase session provider)
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Tailwind base styles
│
├── components/
│   ├── VideoPanel.tsx            # Handles YouTube iframe OR <video> tag + MP4 upload
│   ├── DictationInput.tsx        # Textarea + handwriting image upload toggle
│   ├── ScoreBreakdown.tsx        # Visual score chart + granular error list
│   ├── Navbar.tsx                # Top navigation bar
│   └── LoadingSpinner.tsx        # Shared loading indicator
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client (route handlers)
│   ├── gemini.ts                 # Gemini client init + grading prompt builder
│   ├── youtube.ts                # YouTube URL parsing + ID extraction helpers
│   └── utils.ts                  # Generic helpers (text normalization, diffing)
│
├── types/
│   └── index.ts                  # Shared TypeScript types (GradingResult, Correction, etc.)
│
├── supabase/
│   └── schema.sql                # SQL schema for `sessions` table + RLS policies
│
├── public/
│   └── (static assets)
│
├── .env.local.example            # Template for required free-tier API keys
├── next.config.mjs                # Next.js config (allow YouTube/Groq domains if needed)
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

## Why this structure works within the constraints

- **No video files ever touch the server filesystem.** The MP4 the user "uploads" is sent directly from the
  browser to `/api/transcribe-mp4` as a `multipart/form-data` stream that is immediately forwarded to Groq's
  API and discarded — Vercel's serverless functions never write it to disk, which keeps us inside the
  free tier's ephemeral, memory-only execution model and avoids the 4.5MB body-size ceiling becoming a
  blocker for larger files (we chunk/guard for that below).
- **YouTube captions are fetched server-side** via a lightweight scraping package, not via `ytdl-core` style
  full video downloads — this keeps the serverless function fast (well under Vercel's free-tier 10s
  execution limit) since we're only pulling a small JSON/XML caption track, not media.
- **All heavy AI inference is delegated to third-party free APIs** (Groq, Gemini) so the Vercel function
  itself only does thin orchestration: receive request → call external API → return JSON. This is what
  keeps every route comfortably inside Vercel Hobby's 10-second timeout.
