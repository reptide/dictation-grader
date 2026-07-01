# DictationLab

AI-powered dictation practice that runs on your own computer. Load a YouTube video or audio file, type what you hear, and get an instant score with feedback on every mistake.

---

## Before you start

You need two free accounts. No credit card required for either.

1. **Google AI Studio** — for grading your answers
   → Sign up at https://aistudio.google.com

2. **Groq** — for transcribing audio/video files
   → Sign up at https://console.groq.com

You also need **Node.js** installed on your computer (it's free software that lets this app run). If you're not sure whether you have it, skip to the "Install Node.js" section below.

---

## Step 1 — Download the project

Download the zip file from this GitHub page:

1. Click the green **"Code"** button near the top of this page
2. Click **"Download ZIP"**
3. Find the downloaded zip file (usually in your Downloads folder)
4. Extract/unzip it:
   - **Mac**: double-click the zip file
   - **Windows**: right-click → "Extract All"

You'll get a folder called `dictation-grader`. Move it somewhere easy to find, like your Desktop.

---

## Step 2 — Install Node.js (if you don't have it)

Open your terminal (see below for how) and type:

```
node -v
```

If you see something like `v22.0.0` — you already have it, skip to Step 3.

If you get an error, download and install Node.js from https://nodejs.org — click the big "LTS" button and run the installer. Once installed, close and reopen your terminal, then check again with `node -v`.

---

## Step 3 — Open a terminal in the project folder

### On Mac

1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Type `cd ` (with a space after it — don't press Enter yet)
3. Open **Finder** and navigate to your `dictation-grader` folder
4. Drag the `dictation-grader` folder directly into the Terminal window
5. Press **Enter**

You should now see something like:
```
your-name@Mac dictation-grader %
```

### On Windows

1. Open **File Explorer** and navigate to your `dictation-grader` folder
2. Click on the address bar at the top (where the folder path is shown)
3. Type `cmd` and press **Enter**

A black Command Prompt window will open already inside that folder. You should see something like:
```
C:\Users\YourName\Desktop\dictation-grader>
```

---

## Step 4 — Get your API keys

### Gemini key (for grading)

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API key"**
4. Click **"Create API key in new project"**
5. Your key will appear — it starts with `AIza...`
6. Click the copy icon to copy it. **Keep this somewhere safe** — you'll need it in the next step

### Groq key (for audio transcription)

1. Go to https://console.groq.com/keys
2. Sign in (or create a free account)
3. Click **"Create API Key"**
4. Give it a name like `dictation-grader`
5. Your key will appear — it starts with `gsk_...`
6. Copy it and save it somewhere. **It only shows once**, so don't close the page until you've saved it

---

## Step 5 — Add your keys to the app

The app reads your keys from a file called `.env.local`. You need to create this file.

### On Mac

In your Terminal (make sure you're still in the `dictation-grader` folder from Step 3), run:

```
cp .env.local.example .env.local
```

Now open the file in TextEdit:

```
open -e .env.local
```

You'll see this:

```
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL_PRIMARY=gemini-2.5-flash-lite
GEMINI_MODEL_FALLBACK=gemini-2.5-flash

GROQ_API_KEY=your_groq_key_here

GOOGLE_VISION_API_KEY=optional_leave_blank_if_not_needed
```

Replace `your_gemini_key_here` with your Gemini key (the one starting with `AIza...`).
Replace `your_groq_key_here` with your Groq key (the one starting with `gsk_...`).

Leave everything else exactly as it is.

Save the file with **Cmd + S**, then close TextEdit.

### On Windows

In your Command Prompt (from Step 3), run:

```
copy .env.local.example .env.local
```

Now open the file in Notepad:

```
notepad .env.local
```

You'll see this:

```
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL_PRIMARY=gemini-2.5-flash-lite
GEMINI_MODEL_FALLBACK=gemini-2.5-flash

GROQ_API_KEY=your_groq_key_here

GOOGLE_VISION_API_KEY=optional_leave_blank_if_not_needed
```

Replace `your_gemini_key_here` with your Gemini key.
Replace `your_groq_key_here` with your Groq key.

Leave everything else exactly as it is.

Save with **Ctrl + S**, then close Notepad.

> ⚠️ **Important**: Make sure Notepad didn't save it as `.env.local.txt` instead of `.env.local`. In Notepad, when saving, set "Save as type" to "All Files (*.*)" before clicking Save.

---

## Step 6 — Install the app

In your terminal, run:

```
npm install
```

This downloads everything the app needs. It takes about 30–60 seconds. You'll see a lot of text scroll by — that's normal. Wait until you see something like `added 399 packages`.

---

## Step 7 — Run the app

```
npm run dev
```

Wait a few seconds until you see:

```
▲ Next.js
- Local: http://localhost:3000
✓ Ready
```

Now open your browser and go to:

**http://localhost:3000**

You should see the DictationLab home page with a green "API keys configured" message. If you see an orange warning instead, go back to Step 5 and check that your keys were saved correctly.

---

## How to use it

1. **Paste a YouTube link** into the left panel and click "Load" — the app fetches the video's captions as the master script
2. **Watch/listen** to the video on the left
3. **Type what you hear** in the large text area on the right
4. Click **"Submit for Grading"**
5. See your score out of 100 with every mistake highlighted

**Or upload an audio/video file** (MP4, MP3, WAV — up to 25MB) instead of a YouTube link. The app will transcribe it automatically using Groq.

Past sessions are saved in your browser automatically and shown at the bottom of the page.

---

## Stopping and restarting

To **stop** the app: go to your terminal and press **Ctrl + C**

To **start it again** next time:
1. Open a terminal in the `dictation-grader` folder (same as Step 3)
2. Run `npm run dev`
3. Go to http://localhost:3000

You don't need to run `npm install` again — only the first time.

---

## Troubleshooting

**"command not found: npm"**
→ Node.js isn't installed. Go back to Step 2.

**"Cannot find module" or similar errors after npm install**
→ Try deleting the `node_modules` folder and running `npm install` again.

**Orange warning on the home page saying keys are missing**
→ Your `.env.local` file either wasn't created or has the wrong values. Go back to Step 5.

**YouTube video loads but says "couldn't fetch captions"**
→ Some videos don't have captions, or YouTube is temporarily rate-limiting the request. Try a different video, or use the MP4 upload option instead.

**Grading says "API key invalid" or similar**
→ Your Gemini key might have been copied incorrectly. Go back to Step 5, open `.env.local`, and make sure the key starts with `AIza` and has no extra spaces.

---

## Your API keys are private

Your keys are stored only in `.env.local` on your own computer. This file is intentionally excluded from GitHub (it's in `.gitignore`) — so even if you push this project to your own GitHub account, your keys will never be uploaded. They stay on your machine only.
