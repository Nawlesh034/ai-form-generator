import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

export async function generateFormJson(prompt) {
  const key = process.env.GEMINI_API_KEY;
  
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing in process.env");
  }

  const genAI = new GoogleGenerativeAI(key);

  for (const model of MODELS){
    try {
      const result = await generateWithModel(genAI, model, prompt);
      return result;
    } catch (error) {
      console.error(`Error generating with model ${model}:`, error);
    }
  }

  throw new Error("All models failed to generate content.");
}

async function generateWithModel(genAI, MODEL, prompt) {        
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  console.log(result,"in gemini.js")
  return result.response.text();
}
