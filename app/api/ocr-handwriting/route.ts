// app/api/ocr-handwriting/route.ts
//
// OPTIONAL / STRETCH: Accepts a base64-encoded image of handwritten text
// and extracts text via Google Cloud Vision's free tier (1,000 requests/month).
// We use Vision's DOCUMENT_TEXT_DETECTION feature, which is specifically
// tuned for dense handwritten/printed text blocks (vs. plain TEXT_DETECTION,
// which is better for sparse signage-style text).
//
// POST body: { imageBase64: string }  (no "data:image/..." prefix)
// Response:  OcrResponse

import { NextRequest, NextResponse } from "next/server";
import type { OcrResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      return NextResponse.json<OcrResponse>(
        { success: false, text: "", error: "Server is missing GOOGLE_VISION_API_KEY configuration." },
        { status: 500 }
      );
    }

    const { imageBase64 } = (await req.json()) as { imageBase64?: string };

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json<OcrResponse>(
        { success: false, text: "", error: "Missing 'imageBase64' in request body." },
        { status: 400 }
      );
    }

    // Strip a data URL prefix if the client sent one accidentally
    // (e.g. "data:image/png;base64,....") — Vision wants raw base64 only.
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const visionResponse = await fetch(`${VISION_API_URL}?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: cleanBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    });

    if (!visionResponse.ok) {
      const errorBody = await visionResponse.text();
      console.error("[ocr-handwriting] Vision API error:", visionResponse.status, errorBody);
      return NextResponse.json<OcrResponse>(
        { success: false, text: "", error: "OCR request failed. Check image format and try again." },
        { status: 502 }
      );
    }

    const result = await visionResponse.json();
    const text = result?.responses?.[0]?.fullTextAnnotation?.text?.trim();

    if (!text) {
      return NextResponse.json<OcrResponse>(
        {
          success: false,
          text: "",
          error: "No text detected in the image. Make sure the handwriting is clear and well-lit.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json<OcrResponse>({ success: true, text });
  } catch (err) {
    console.error("[ocr-handwriting] Unexpected error:", err);
    return NextResponse.json<OcrResponse>(
      { success: false, text: "", error: "Unexpected server error during OCR." },
      { status: 500 }
    );
  }
}
