
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];
export async function generateFormJson(prompt) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is missing in process.env");
  }

  const genAI = new GoogleGenerativeAI(key);

  for (const modelName of MODELS) {
    try {
      console.log(`Trying model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const result = await model.generateContent(prompt);

      console.log(`Success with model: ${modelName}`);

      return result.response.text();
    } catch (error) {
      console.error(
        `Model ${modelName} failed:`,
        error.message
      );
    }
  }

  throw new Error("All models failed to generate content.");
}
