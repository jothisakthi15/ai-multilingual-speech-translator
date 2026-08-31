import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON body parsing with generous payload limit for audio data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper for invoking Gemini with automatic retry and rapid model fallback
async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  fallbackModels: string[],
  requestPayload: any,
  maxRetries = 2
) {
  const modelsToTry = [primaryModel, ...fallbackModels];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...requestPayload,
          model,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || "";
        const isUnavailable =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("429");

        if (isUnavailable && attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        if (isUnavailable) {
          console.warn(`[Gemini] ${model} unavailable, failing over immediately...`);
          break;
        }
        throw error;
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Translation API endpoint - Ultra Low-Latency Multilingual Translator
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguages, history = [], sourceLanguageOverride, tamilStyle = "spoken" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, error: "Text to translate is required." });
    }

    if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return res.status(400).json({ success: false, error: "At least one target language must be specified." });
    }

    const ai = getGeminiClient();

    const historyContext = history.length > 0
      ? `Prior context:\n` + history.slice(-2).map((t: any) => `"${t.user_speech || t.original_text || ""}"`).join(" | ")
      : "";

    const userPrompt = `Translate: "${text.trim()}"
Source hint: ${sourceLanguageOverride && sourceLanguageOverride !== "Auto-Detect" ? sourceLanguageOverride : "Auto-detect"}
Targets: ${JSON.stringify(targetLanguages)}
Tamil Style preference: ${tamilStyle}
${historyContext}

Requirements:
- Translate accurately with natural phrasing.
- If Tamil is involved (in source or target):
  * Deliver the requested style: "${tamilStyle}" (spoken colloquial like "வணக்கம்! நீங்க எப்படி இருக்கீங்க?" vs formal like "வணக்கம்! நீங்கள் எப்படி இருக்கிறீர்கள்?").
  * Provide syllable-by-syllable breakdown, Tanglish pronunciation, and authentic pronunciation tips (e.g. curling tongue for 'ழ' / 'ள').
- Provide a clear phonetic pronunciation guide in "pronunciations" for non-Latin scripts.

Respond ONLY with valid JSON:
{
  "detected_language": "Detected language name",
  "translations": {
    "<Target Language>": "Natural translation in native script"
  },
  "pronunciations": {
    "<Target Language>": "Phonetic Romanization / Tanglish pronunciation guide"
  },
  "tamil_detail": {
    "spoken": "Natural spoken colloquial Tamil",
    "formal": "Formal standard literary Tamil",
    "transliteration": "Clear Tanglish phonetic Romanization",
    "syllables": [
      { "word": "தமிழ் வார்த்தை", "phonetics": "Ta-mizh vaar-thai", "meaning": "English meaning" }
    ],
    "pronunciation_tip": "Specific tongue placement or sound articulation tip"
  }
}`;

    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-3.1-flash-lite",
      ["gemini-flash-latest", "gemini-3.7-flash"],
      {
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      2
    );

    const responseText = response.text?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    let detected = parsed.detected_language || "Auto-Detected";
    if (sourceLanguageOverride && sourceLanguageOverride !== "Auto-Detect") {
      detected = parsed.detected_language || sourceLanguageOverride;
    }

    return res.json({
      success: true,
      original_text: text.trim(),
      detected_language: detected,
      context_notes: "Real-time instant translation",
      translations: parsed.translations || {},
      pronunciations: parsed.pronunciations || {},
      tamil_detail: parsed.tamil_detail || undefined,
    });
  } catch (error: any) {
    console.error("Translation error:", error);
    let message = error?.message || "Failed to process translation.";
    if (message.includes("API_KEY_INVALID") || message.includes("403")) {
      message = "Invalid or missing Gemini API Key. Please verify settings.";
    } else if (message.includes("503") || message.includes("UNAVAILABLE") || message.includes("high demand")) {
      message = "The translation service is experiencing temporary high demand. Please retry in a moment.";
    }
    return res.status(500).json({ success: false, error: message });
  }
});

// Audio Transcription API endpoint (Low Latency Audio Transcription)
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType = "audio/webm", sourceLanguageHint } = req.body;

    if (!audioData) {
      return res.status(400).json({ success: false, error: "Audio data is required." });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioData.replace(/^data:audio\/\w+;base64,/, "");

    const prompt = `Transcribe this speech accurately in its original language and script.
Hint: ${sourceLanguageHint || "Auto-detect"}

Respond ONLY in JSON:
{
  "text": "Transcribed text",
  "detected_language": "Language name"
}`;

    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-3.1-flash-lite",
      ["gemini-flash-latest", "gemini-3.7-flash"],
      {
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      2
    );

    const responseText = response.text?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      text: parsed.text || "",
      detected_language: parsed.detected_language || "Auto-Detected",
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    let message = error?.message || "Failed to transcribe audio.";
    return res.status(500).json({ success: false, error: message });
  }
});

// Dedicated /api/recognize endpoint (Accepts audio recorded in browser and transcribes exact words via Gemini 2.5 Flash)
app.post("/api/recognize", async (req, res) => {
  try {
    let audioData = req.body.audioData || req.body.audio || req.body.audio_bytes;
    let mimeType = req.body.mimeType || req.body.mime_type || "audio/webm";

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: "Audio payload required (audioData base64 string).",
      });
    }

    const ai = getGeminiClient();
    const cleanBase64 = String(audioData).replace(/^data:audio\/\w+;base64,/, "").trim();
    const cleanMimeType = String(mimeType).split(";")[0].trim() || "audio/webm";

    const promptText彻底 = "Transcribe the exact spoken words from this audio. Return only the transcription.";

    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-2.5-flash",
      ["gemini-3.1-flash-lite", "gemini-flash-latest"],
      {
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: cleanMimeType,
              },
            },
            {
              text: promptText彻底,
            },
          ],
        },
      },
      2
    );

    const transcript = response.text?.trim() || "";

    return res.json({
      success: true,
      transcript: transcript,
      text: transcript,
    });
  } catch (error: any) {
    console.error("Recognize audio error:", error);
    let message = error?.message || "Failed to recognize audio with Gemini 2.5 Flash.";
    return res.status(500).json({ success: false, error: message });
  }
});

// Dedicated /api/process-audio endpoint (Accepts audio recorded in browser and processes via Gemini 2.5 Flash)
app.post("/api/process-audio", async (req, res) => {
  try {
    let audioData = req.body.audioData || req.body.audio || req.body.audio_bytes;
    let mimeType = req.body.mimeType || req.body.mime_type || "audio/webm";

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: "Audio payload required (audioData base64 string).",
      });
    }

    const ai = getGeminiClient();
    const cleanBase64 = String(audioData).replace(/^data:audio\/\w+;base64,/, "").trim();
    const cleanMimeType = String(mimeType).split(";")[0].trim() || "audio/webm";

    const promptInstruction = `Listen to this audio recording carefully.
1. Provide an exact transcription of all spoken words.
2. Identify the language spoken.
3. Analyze the key message, tone/sentiment, and concise semantic summary.

Respond in valid JSON format:
{
  "transcription": "Exact transcription of the spoken audio",
  "detected_language": "Detected language (e.g. English, Tamil, Spanish, French)",
  "analysis": "Concise bullet-point semantic analysis, key topics discussed, and intent/tone",
  "summary": "One-sentence executive summary of the speech"
}`;

    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-2.5-flash",
      ["gemini-3.1-flash-lite", "gemini-flash-latest"],
      {
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: cleanMimeType,
              },
            },
            {
              text: promptInstruction,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      },
      2
    );

    const responseText = response.text?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      transcription: parsed.transcription || "",
      detected_language: parsed.detected_language || "Auto-Detected",
      analysis: parsed.analysis || "",
      summary: parsed.summary || "",
      raw_text: parsed.transcription || "",
    });
  } catch (error: any) {
    console.error("Process audio error:", error);
    let message = error?.message || "Failed to process audio with Gemini 2.5 Flash.";
    return res.status(500).json({ success: false, error: message });
  }
});

// Single-Shot Direct Audio-to-Translation endpoint (Zero-delay Speech-to-Multilingual Translation)
app.post("/api/audio-translate", async (req, res) => {
  try {
    const { audioData, mimeType = "audio/webm", targetLanguages, sourceLanguageHint, tamilStyle = "spoken" } = req.body;

    if (!audioData) {
      return res.status(400).json({ success: false, error: "Audio data is required." });
    }

    if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return res.status(400).json({ success: false, error: "Target languages are required." });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioData.replace(/^data:audio\/\w+;base64,/, "");

    const prompt = `Transcribe speech accurately and translate directly to: ${JSON.stringify(targetLanguages)}.
Language hint: ${sourceLanguageHint || "Auto-detect"}
Tamil Style: ${tamilStyle}

Requirements:
- Ensure natural phrasing and authentic grammar.
- For Tamil: provide ${tamilStyle} style, word syllables, phonetic Romanization, and pronunciation guide.
- Provide phonetic Romanization for all non-Latin scripts.

Respond ONLY in JSON:
{
  "original_text": "Exact transcription in original script",
  "detected_language": "Detected language name",
  "translations": {
    "<Target Language>": "Translated text in native script"
  },
  "pronunciations": {
    "<Target Language>": "Phonetic Romanization / Tanglish guide"
  },
  "tamil_detail": {
    "spoken": "Natural spoken colloquial Tamil",
    "formal": "Formal standard literary Tamil",
    "transliteration": "Clear Tanglish phonetic Romanization",
    "syllables": [
      { "word": "தமிழ் வார்த்தை", "phonetics": "Ta-mizh vaar-thai", "meaning": "English meaning" }
    ],
    "pronunciation_tip": "Specific guidance on tongue placement or sound articulation"
  }
}`;

    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-3.1-flash-lite",
      ["gemini-flash-latest", "gemini-3.7-flash"],
      {
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      2
    );

    const responseText = response.text?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      original_text: parsed.original_text || "",
      detected_language: parsed.detected_language || "Auto-Detected",
      context_notes: "Single-shot voice translation",
      translations: parsed.translations || {},
      pronunciations: parsed.pronunciations || {},
      tamil_detail: parsed.tamil_detail || undefined,
    });
  } catch (error: any) {
    console.error("Audio translate error:", error);
    let message = error?.message || "Failed to process audio translation.";
    return res.status(500).json({ success: false, error: message });
  }
});

// Source Code & Project Files API endpoint for Python Streamlit export
app.get("/api/project-files", (req, res) => {
  try {
    const files = [
      { path: "app.py", description: "Main Streamlit user interface" },
      { path: "utils/translation.py", description: "Gemini context-aware translation module" },
      { path: "utils/speech.py", description: "Speech-to-text recognition module" },
      { path: "utils/text_to_speech.py", description: "gTTS multi-language audio synthesis" },
      { path: "requirements.txt", description: "Python pip package dependencies" },
      { path: ".env.example", description: "Environment configuration template" },
      { path: "README.md", description: "Complete documentation & deployment guide" },
      { path: ".gitignore", description: "Git ignore configuration" },
    ];

    const fileContents: Record<string, { content: string; description: string }> = {};

    for (const f of files) {
      const fullPath = path.join(process.cwd(), f.path);
      if (fs.existsSync(fullPath)) {
        fileContents[f.path] = {
          content: fs.readFileSync(fullPath, "utf-8"),
          description: f.description,
        };
      }
    }

    res.json({ success: true, files: fileContents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server & mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Multilingual Speech App running on http://localhost:${PORT}`);
  });
}

startServer();
