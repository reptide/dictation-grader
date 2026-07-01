/** @type {import('next').NextConfig} */
const nextConfig = {
  // We never download or proxy actual video bytes through Next.js,
  // so no special rewrites/streaming config is needed.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" }, // YouTube thumbnails
      { protocol: "https", hostname: "*.supabase.co" }, // avatars/assets if used later
    ],
  },

  // NOTE: We deliberately do NOT set `serverActions.bodySizeLimit` here.
  // That option only governs React Server Action payloads — it has no
  // effect on Route Handlers (our /app/api/* files), which is what
  // actually receives the MP4/audio upload via fetch() + FormData.
  // Route Handlers read the raw request stream directly, so the real
  // upload ceiling in this app is enforced explicitly in
  // /api/transcribe-mp4/route.ts (MAX_FILE_BYTES) plus whatever your
  // hosting platform's own request body limit is (e.g. Vercel's).
};

export default nextConfig;
