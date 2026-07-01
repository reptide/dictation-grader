# DictationLab

AI-powered dictation practice that runs entirely on your own machine. Load a YouTube video or audio file, type what you hear, and get an instant score with granular feedback on every mistake.

## Setup (3 steps)

### 1. Get your free API keys

You need two keys. Both are free with no credit card required.

**Gemini** (powers the grading engine)
→ Go to https://aistudio.google.com/app/apikey → Create API key

**Groq** (powers MP4/audio transcription)
→ Go to https://console.groq.com/keys → Create API Key

### 2. Add your keys

Copy the example env file and fill it in:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and replace the placeholder values with your real keys:

```
GEMINI_API_KEY=AIza...your key here...
GROQ_API_KEY=gsk_...your key here...
```

Leave everything else as-is.

### 3. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser. That's it.

---

## How it works

- **YouTube link** → pastes a URL, the app fetches the caption track and uses it as the master script
- **MP4 / audio upload** → sends the file to Groq Whisper for transcription (up to 25MB)
- **Type your answer** → large textarea where you type what you heard
- **Handwriting photo** → optional, upload a photo of handwritten notes (requires Google Vision API key)
- **Submit** → Gemini compares your attempt to the master script and returns a score out of 100 with every error highlighted
- **History** → past sessions are saved automatically in your browser (localStorage, stays on your machine)

## Supported languages

Caption language can be changed via the dropdown next to the YouTube URL field. Works for any video that has captions in that language. Defaults to English.

## Notes

- Your API keys stay on your machine in `.env.local` — they are never sent anywhere except directly to Gemini/Groq
- History is stored in your browser's localStorage — it stays on your computer and is never uploaded
- YouTube caption fetching can occasionally fail if YouTube rate-limits the request — just try again or use the MP4 upload path instead
- The `.env.local` file is git-ignored so your keys won't be accidentally committed if you push this to GitHub
