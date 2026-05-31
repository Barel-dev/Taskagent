import { GoogleGenAI } from '@google/genai'

// Lazily-constructed, cached Google Gen AI client. Constructed on first real
// use (not at import) so demo mode — which never calls Gemini — works fine
// without a GEMINI_API_KEY set.
const globalForGemini = globalThis as unknown as { gemini?: GoogleGenAI }

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }
  globalForGemini.gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return globalForGemini.gemini
}

// Gemini Flash is on the free tier and is plenty for short, structured task
// breakdowns. Get a free key (no card) at https://aistudio.google.com.
export const GEMINI_MODEL = 'gemini-2.5-flash'
