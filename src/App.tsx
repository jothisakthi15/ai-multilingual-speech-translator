import React, { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { SpeechInputPanel } from "./components/SpeechInputPanel";
import { TranslationResults } from "./components/TranslationResults";
import { ConversationHistory } from "./components/ConversationHistory";
import { TranslationResult, TranslationTurn, ALL_SUPPORTED_LANGUAGES } from "./types";
import { blobToBase64 } from "./utils/audio";
import { AlertCircle, X } from "lucide-react";

export default function App() {
  // Default target languages requested by user
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    "Tamil",
    "Hindi",
    "Telugu",
    "French",
    "Spanish",
    "Japanese",
  ]);

  const [sourceLanguage, setSourceLanguage] = useState<string>("Auto-Detect");
  const [inputText, setInputText] = useState<string>("");
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<TranslationTurn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tamil Pronunciation & Speech Customization
  const [tamilStyle, setTamilStyle] = useState<"spoken" | "formal" | "casual">("spoken");
  const [speechRate, setSpeechRate] = useState<number>(0.85);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [preferredVoiceName, setPreferredVoiceName] = useState<string>("");

  // Toggle language selection
  const handleToggleLanguage = (langName: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langName)
        ? prev.filter((l) => l !== langName)
        : [...prev, langName]
    );
  };

  const handleSelectAllLanguages = () => {
    setSelectedLanguages(ALL_SUPPORTED_LANGUAGES.map((l) => l.name));
  };

  const handleClearLanguages = () => {
    setSelectedLanguages(["Tamil", "Hindi", "Telugu", "Spanish", "French", "Japanese"]);
  };

  // Reset conversation context memory
  const handleClearHistory = () => {
    setHistory([]);
    setLastResult(null);
    setInputText("");
    setErrorMessage(null);
  };

  // Process Translation Request (supports direct text parameter for zero-latency speech recognition completion)
  const handleTranslate = async (customText?: string) => {
    const textToTranslate = typeof customText === "string" ? customText.trim() : inputText.trim();

    if (!textToTranslate) {
      setErrorMessage("Please enter or record a sentence to translate.");
      return;
    }

    if (selectedLanguages.length === 0) {
      setErrorMessage("Please select at least one target language from the sidebar.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToTranslate,
          targetLanguages: selectedLanguages,
          history: history,
          sourceLanguageOverride: sourceLanguage,
          tamilStyle: tamilStyle,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Translation request failed.");
      }

      const newResult: TranslationResult = {
        success: true,
        original_text: data.original_text,
        detected_language: data.detected_language,
        context_notes: data.context_notes,
        translations: data.translations,
        pronunciations: data.pronunciations,
        tamil_detail: data.tamil_detail,
      };

      setLastResult(newResult);

      // Append to session context history
      const newTurn: TranslationTurn = {
        id: Math.random().toString(36).substring(2, 9),
        user_speech: data.original_text,
        detected_language: data.detected_language,
        translations: data.translations,
        pronunciations: data.pronunciations,
        tamil_detail: data.tamil_detail,
        context_notes: data.context_notes,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setHistory((prev) => [newTurn, ...prev]);
    } catch (err: any) {
      console.error("Translation error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during translation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Single-Shot Direct Audio Translation (Speech -> Multi-Language Translation in 1 request)
  const handleAudioTranslate = async (blob: Blob) => {
    if (selectedLanguages.length === 0) {
      setErrorMessage("Please select at least one target language from the sidebar.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const base64Data = await blobToBase64(blob);
      const res = await fetch("/api/audio-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: base64Data,
          mimeType: blob.type || "audio/webm",
          targetLanguages: selectedLanguages,
          history: history,
          sourceLanguageHint: sourceLanguage,
          tamilStyle: tamilStyle,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Speech translation failed.");
      }

      if (data.original_text) {
        setInputText(data.original_text);
      }

      const newResult: TranslationResult = {
        success: true,
        original_text: data.original_text,
        detected_language: data.detected_language,
        context_notes: data.context_notes,
        translations: data.translations,
        pronunciations: data.pronunciations,
        tamil_detail: data.tamil_detail,
      };

      setLastResult(newResult);

      const newTurn: TranslationTurn = {
        id: Math.random().toString(36).substring(2, 9),
        user_speech: data.original_text,
        detected_language: data.detected_language,
        translations: data.translations,
        pronunciations: data.pronunciations,
        tamil_detail: data.tamil_detail,
        context_notes: data.context_notes,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setHistory((prev) => [newTurn, ...prev]);
    } catch (err: any) {
      console.error("Audio translation error:", err);
      setErrorMessage(err.message || "Failed to process audio translation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Audio Blob transcription fallback
  const handleTranscribeAudioBlob = async (blob: Blob) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const base64Data = await blobToBase64(blob);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: base64Data,
          mimeType: blob.type || "audio/webm",
          sourceLanguageHint: sourceLanguage,
        }),
      });

      const data = await res.json();
      if (data.success && data.text) {
        setInputText(data.text);
        if (data.detected_language && data.detected_language !== "Auto-Detected") {
          if (sourceLanguage === "Auto-Detect") {
            const matched = ALL_SUPPORTED_LANGUAGES.find(
              (l) => l.name.toLowerCase() === data.detected_language.toLowerCase()
            );
            if (matched) {
              setSourceLanguage(matched.name);
            }
          }
        }
        // Immediately trigger translation on recognized text
        handleTranslate(data.text);
      } else {
        setErrorMessage(data.error || "Could not transcribe spoken audio.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process audio recording.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Top Header */}
      <Header historyCount={history.length} />

      {/* Main Body Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          selectedLanguages={selectedLanguages}
          onToggleLanguage={handleToggleLanguage}
          onSelectAll={handleSelectAllLanguages}
          onClearLanguages={handleClearLanguages}
          historyCount={history.length}
          onClearHistory={handleClearHistory}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#0F172A]">
          {/* Error Notification Alert */}
          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 flex items-center justify-between gap-3 text-red-200 text-xs shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:bg-red-900/50 rounded-lg text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Interactive Live App */}
          <div className="space-y-8">
            {/* Header Title in Main Area */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Current Translation</h2>
                <p className="text-xs text-slate-400">Contextual Multilingual Speech Translation Engine</p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Session ID: #AI-{Math.abs(history.length * 1337 + 9942).toString().slice(0, 5)}
              </div>
            </div>

            {/* 2-Column Responsive Layout for Input & Translation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-6">
                <SpeechInputPanel
                  inputText={inputText}
                  setInputText={setInputText}
                  sourceLanguage={sourceLanguage}
                  setSourceLanguage={setSourceLanguage}
                  onTranslate={handleTranslate}
                  isLoading={isLoading}
                  onTranscribeAudioBlob={handleTranscribeAudioBlob}
                  onAudioTranslateBlob={handleAudioTranslate}
                  tamilStyle={tamilStyle}
                  setTamilStyle={setTamilStyle}
                  speechRate={speechRate}
                  setSpeechRate={setSpeechRate}
                  speechPitch={speechPitch}
                  setSpeechPitch={setSpeechPitch}
                  preferredVoiceName={preferredVoiceName}
                  setPreferredVoiceName={setPreferredVoiceName}
                />
              </div>

              <div className="lg:col-span-7 space-y-6">
                <TranslationResults
                  result={lastResult}
                  isLoading={isLoading}
                  tamilStyle={tamilStyle}
                  setTamilStyle={setTamilStyle}
                  speechRate={speechRate}
                  setSpeechRate={setSpeechRate}
                  speechPitch={speechPitch}
                  setSpeechPitch={setSpeechPitch}
                  preferredVoiceName={preferredVoiceName}
                  setPreferredVoiceName={setPreferredVoiceName}
                  onReTranslate={() => handleTranslate()}
                />
              </div>
            </div>

            {/* Session Conversation Context History */}
            <ConversationHistory
              history={history}
              onClearHistory={handleClearHistory}
            />
          </div>
        </main>
      </div>

      {/* Sleek Interface Footer */}
      <footer className="h-12 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between px-6 lg:px-8 text-[11px] text-slate-500 z-20">
        <div>
          Powered by <span className="text-blue-400 font-semibold uppercase tracking-tight">Google Gemini 3.7 Flash</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span>Context: {history.length} Turns Retained</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Microphone:</span>
            <span className="text-slate-300 font-medium">Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
