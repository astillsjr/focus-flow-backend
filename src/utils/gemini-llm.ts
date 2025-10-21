/**
 * LLM Integration for FocusFlow
 *
 * Handles prompts using Google's Gemini API.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

export class GeminiLLM {
  constructor(private apiKey: string) {
    this.apiKey = apiKey;
  }

  async executeLLM(prompt: string): Promise<string> {
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });
      // Execute the LLM
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (!text) {
        console.warn("⚠️ Gemini returned empty or blank response:", response);
        throw new Error("LLM response was empty or invalid");
      }
      return text;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }
}