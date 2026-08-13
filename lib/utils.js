import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// AI responses wrap the JSON in prose/markdown fences and sometimes add trailing commas.
export function extractJson(rawText) {
  try {
    const jsonStartIndex = rawText.indexOf('{');
    const jsonEndIndex = rawText.lastIndexOf('}') + 1;
    let jsonString = rawText.substring(jsonStartIndex, jsonEndIndex);
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1'); // trailing commas
    jsonString = jsonString.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // comments
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error extracting and parsing JSON:', error);
    return null;
  }
}
