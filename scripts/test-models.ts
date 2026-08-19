import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const modelsToTest = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];

async function testAll() {
  console.log("Testing API Key length:", apiKey.length);
  for (const m of modelsToTest) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: "Say hello in Korean in 1 word",
      });
      console.log(`✅ [${m}] Success:`, res.text?.trim());
    } catch (err: any) {
      console.log(`❌ [${m}] Error (${err.status || err.code || "FAIL"}):`, err.message?.substring(0, 100));
    }
  }
}

testAll();
