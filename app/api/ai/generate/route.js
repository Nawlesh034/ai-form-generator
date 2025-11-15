// app/api/ai/generate/route.js
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Tries a list of candidate model names until one works.
 * If none work, optionally calls ListModels to help debugging.
 *
 * IMPORTANT:
 * - Ensure process.env.GEMINI_API_KEY is set (server-only)
 * - Do NOT expose API key to client
 */

const FALLBACK_MODELS = [
  // try modern Gemini 2.5 family first (common names)
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  // some providers expose shorter aliases; try these too
  "gemini-2.5",
  // last-resort older ones (may be retired)
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

const SHOULD_CALL_LISTMODELS_ON_FAIL = true; // flip to false if you don't want listModels auto-call

export async function POST(req) {
  try {
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY is missing in process.env");
      return NextResponse.json({ error: "Server config error: GEMINI_API_KEY missing" }, { status: 500 });
    }

    const body = await req.json();
    const prompt = body?.prompt;
    if (!prompt) return NextResponse.json({ error: "No prompt provided" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(key);

    // Try each candidate model until one works
    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);

        // Normalize extraction of text
        let text = "";
        try {
          if (typeof result?.response?.text === "function") {
            text = await result.response.text();
          } else {
            text = result?.response?.text ?? "";
          }
        } catch (e) {
          console.warn("Could not extract text from result.response, stringifying result", e);
          text = JSON.stringify(result);
        }

        // Success — return text and the model used (helpful for debugging)
        return NextResponse.json({ text, model: modelName });
      } catch (innerErr) {
        // If model not found or unsupported you may get 404/NotFound from Google — log and continue to next
        console.warn(`Model "${modelName}" failed:`, innerErr?.message || innerErr);
        // continue to try next model
      }
    }

    // If reached here, all fallback models failed.
    let extra = null;
    if (SHOULD_CALL_LISTMODELS_ON_FAIL) {
      try {
        // Call List Models to help debugging — returns array of available model names
        // Use raw fetch to models endpoint with key
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
        const listJson = await listRes.json();
        // extract names if available
        const names = Array.isArray(listJson?.models) ? listJson.models.map(m => m.name) : listJson;
        extra = { availableModels: names };
        console.info("Available models (ListModels):", names);
      } catch (listErr) {
        console.warn("Failed to call ListModels:", listErr);
      }
    }

    console.error("All fallback models failed for generateContent.");
    return NextResponse.json({
      error: "No compatible model found for generateContent. Check server logs and ListModels output.",
      details: extra
    }, { status: 500 });

  } catch (err) {
    console.error("AI generate error (server):", err);
    const msg = err?.message || "Unknown server error while calling AI";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
