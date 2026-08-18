// app/api/ai/generate/route.js
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-3.6-flash";

export async function POST(req) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY is missing in process.env");
      return NextResponse.json({ error: "Server config error: GEMINI_API_KEY missing" }, { status: 500 });
    }

    const body = await req.json();
    const prompt = body?.prompt;
    if (!prompt) return NextResponse.json({ error: "No prompt provided" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    return NextResponse.json({ text, model: MODEL });
  } catch (err) {
    console.error("AI generate error (server):", err);
    const msg = err?.message || "Unknown server error while calling AI";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
