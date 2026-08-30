import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Upload, ArrowRight, Sparkles, Volume2, HelpCircle, Sliders, Music, Globe } from "lucide-react";
import { ALL_SUPPORTED_LANGUAGES } from "../types";
import { getAvailableVoices, speakText } from "../utils/audio";

interface SpeechInputPanelProps {
  inputText: string;
  setInputText: (text: string) => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  onTranslate: (customText?: string) => void;
  isLoading: boolean;
  onTranscribeAudioBlob: (blob: Blob) => Promise<void>;
  onAudioTranslateBlob?: (blob: Blob) => Promise<void>;
  tamilStyle?: "spoken" | "formal" | "casual";
  setTamilStyle?: (style: "spoken" | "formal" | "casual") => void;
  speechRate?: number;
  setSpeechRate?: (rate: number) => void;
  speechPitch?: number;
  setSpeechPitch?: (pitch: number) => void;
  preferredVoiceName?: string;
  setPreferredVoiceName?: (name: string) => void;
}

// BCP-47 language tag lookup for speech recognition
const SPEECH_LANG_MAP: Record<string, string> = {
  "English": "en-US",
  "Tamil": "ta-IN",
  "Hindi": "hi-IN",
  "Telugu": "te-IN",
  "Malayalam": "ml-IN",
  "Kannada": "kn-IN",
  "Bengali": "bn-IN",
  "Marathi": "mr-IN",
  "Gujarati": "gu-IN",
  "Punjabi": "pa-IN",
  "French": "fr-FR",
  "German": "de-DE",
  "Spanish": "es-ES",
  "Japanese": "ja-JP",
  "Chinese (Mandarin)": "zh-CN",
  "Korean": "ko-KR",
  "Arabic": "ar-SA",
  "Russian": "ru-RU",
  "Portuguese": "pt-BR",
  "Italian": "it-IT",
};

export const SpeechInputPanel: React.FC<SpeechInputPanelProps> = ({
  inputText,
  setInputText,
  sourceLanguage,
  setSourceLanguage,
  onTranslate,
  isLoading,
  onTranscribeAudioBlob,
  onAudioTranslateBlob,
  tamilStyle = "spoken",
  setTamilStyle,
  speechRate = 0.85,
  setSpeechRate,
  speechPitch = 1.0,
  setSpeechPitch,
  preferredVoiceName = "",
  setPreferredVoiceName,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<"mic" | "file" | "text">("mic");
  const [micStatusMsg, setMicStatusMsg] = useState<string>("");
  const [autoTranslateOnSpeech, setAutoTranslateOnSpeech] = useState<boolean>(true);
  const [liveInterimText, setLiveInterimText] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const latestTranscriptRef = useRef<string>("");
  const autoTranslateTimeoutRef = useRef<any>(null);

  // Load available speech voices for Tamil and other languages
  useEffect(() => {
    getAvailableVoices().then((v) => {
      setAvailableVoices(v);
    });
  }, []);

  // Stop active speech recognition safely
  const stopSpeechRecognition = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.stop();
      } catch (err) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }
  };

  // Stop active media recorder safely
  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      stopMediaRecorder();
      if (autoTranslateTimeoutRef.current) {
        clearTimeout(autoTranslateTimeoutRef.current);
      }
    };
  }, []);

  // Trigger immediate translation if auto-translate is enabled
  const triggerAutoTranslate = (finalText: string) => {
    const trimmed = finalText.trim();
    if (trimmed && trimmed.length > 0) {
      setMicStatusMsg("⚡ Translating recognized speech...");
      onTranslate(trimmed);
    }
  };

  // Toggle Live Microphone with instant low-latency recognition
  const toggleRecording = async () => {
    // If already active or recording, stop cleanly and trigger translation
    if (isRecording || isListeningRef.current) {
      const captured = latestTranscriptRef.current || inputText;
      stopSpeechRecognition();
      stopMediaRecorder();
      setIsRecording(false);
      isListeningRef.current = false;
      setMicStatusMsg("");
      if (captured && captured.trim() && autoTranslateOnSpeech) {
        triggerAutoTranslate(captured);
      }
      return;
    }

    setMicStatusMsg("Listening... Speak clearly.");
    latestTranscriptRef.current = "";
    setLiveInterimText("");

    // 1. Preferred High-Speed Engine: Web Speech API (0ms latency, streams live words)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        stopSpeechRecognition();

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        const targetLangCode =
          sourceLanguage === "Auto-Detect"
            ? (navigator.language || "en-US")
            : (SPEECH_LANG_MAP[sourceLanguage] || "en-US");
        recognition.lang = targetLangCode;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setIsRecording(true);
          setMicStatusMsg(
            sourceLanguage === "Auto-Detect"
              ? "⚡ Live listening... Speak in any language."
              : `⚡ Live listening in ${sourceLanguage}... Speak now.`
          );
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const combined = (finalTranscript + " " + interimTranscript).trim();
          if (combined) {
            setInputText(combined);
            latestTranscriptRef.current = combined;
            setLiveInterimText(interimTranscript);

            // Auto-translate debounce on natural pause in speech (350ms for near real-time response)
            if (autoTranslateOnSpeech && finalTranscript.trim()) {
              if (autoTranslateTimeoutRef.current) {
                clearTimeout(autoTranslateTimeoutRef.current);
              }
              autoTranslateTimeoutRef.current = setTimeout(() => {
                const currentText = latestTranscriptRef.current;
                if (currentText && currentText.trim() && isListeningRef.current) {
                  stopSpeechRecognition();
                  setIsRecording(false);
                  isListeningRef.current = false;
                  triggerAutoTranslate(currentText);
                }
              }, 350);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setIsRecording(false);
            isListeningRef.current = false;
            setMicStatusMsg("Microphone permission denied. Please allow microphone access.");
          } else if (event.error !== "no-speech" && event.error !== "aborted") {
            setMicStatusMsg(`Notice: ${event.error}. You can also type or use audio recording.`);
          }
        };

        recognition.onend = () => {
          const textToTranslate = latestTranscriptRef.current || inputText;
          isListeningRef.current = false;
          setIsRecording(false);
          setMicStatusMsg("");
          recognitionRef.current = null;
          if (textToTranslate && textToTranslate.trim() && autoTranslateOnSpeech) {
            triggerAutoTranslate(textToTranslate);
          }
        };

        recognitionRef.current = recognition;
        isListeningRef.current = true;
        recognition.start();
        return;
      } catch (err: any) {
        console.warn("SpeechRecognition start error, using MediaRecorder:", err);
        stopSpeechRecognition();
      }
    }

    // 2. High-Performance Audio Stream Fallback with Single-Shot Translation
    try {
      stopMediaRecorder();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setMicStatusMsg("⚡ Processing voice translation in one step...");
          if (onAudioTranslateBlob) {
            await onAudioTranslateBlob(audioBlob);
          } else {
            await onTranscribeAudioBlob(audioBlob);
          }
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        isListeningRef.current = false;
        setMicStatusMsg("");
      };

      mediaRecorder.start();
      setIsRecording(true);
      isListeningRef.current = true;
      setMicStatusMsg("Listening... Tap stop as soon as you finish speaking.");
    } catch (err: any) {
      console.error("Mic error:", err);
      setIsRecording(false);
      isListeningRef.current = false;
      setMicStatusMsg("Microphone permission unavailable. You can type sentences directly.");
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMicStatusMsg(`Processing "${file.name}" with Gemini AI...`);
      if (onAudioTranslateBlob) {
        await onAudioTranslateBlob(file);
      } else {
        await onTranscribeAudioBlob(file);
      }
      setMicStatusMsg("");
    }
  };

  return (
    <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header & Source Language Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Input Control & Voice Detection
          </label>
          <span className="text-xs text-slate-400">Speak or enter sentence in any language</span>
        </div>

        {/* Source Language Override */}
        <div className="flex items-center gap-2">
          <label htmlFor="source-lang-select" className="text-xs font-semibold text-slate-400">
            Source:
          </label>
          <select
            id="source-lang-select"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="Auto-Detect">✨ Auto-Detect (Any Language)</option>
            {ALL_SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.name} value={lang.name}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Spoken Language Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 block">
          Select Spoken Language or Auto-Detect:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            id="quick-lang-auto"
            onClick={() => setSourceLanguage("Auto-Detect")}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
              sourceLanguage === "Auto-Detect"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
            }`}
          >
            ✨ Auto-Detect (All Languages)
          </button>
          {["Tamil", "Hindi", "Telugu", "Spanish", "French", "German", "Japanese", "Arabic", "English"].map(
            (langName) => {
              const langObj = ALL_SUPPORTED_LANGUAGES.find((l) => l.name === langName);
              const isSelected = sourceLanguage === langName;
              return (
                <button
                  key={langName}
                  id={`quick-lang-${langName.toLowerCase()}`}
                  onClick={() => setSourceLanguage(langName)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
                  }`}
                >
                  {langObj?.flag} {langName}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Input Mode Tabs & Auto-Translate Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            id="btn-mode-mic"
            onClick={() => setInputMode("mic")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              inputMode === "mic"
                ? "bg-slate-800 text-blue-400 border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Voice</span>
          </button>

          <button
            id="btn-mode-file"
            onClick={() => setInputMode("file")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              inputMode === "file"
                ? "bg-slate-800 text-blue-400 border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio</span>
          </button>

          <button
            id="btn-mode-text"
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              inputMode === "text"
                ? "bg-slate-800 text-blue-400 border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Text</span>
          </button>
        </div>

        {/* Instant Auto-Translate Toggle */}
        <button
          id="toggle-auto-translate-speech"
          onClick={() => setAutoTranslateOnSpeech(!autoTranslateOnSpeech)}
          title="When enabled, speech is translated instantly as soon as you finish speaking"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            autoTranslateOnSpeech
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${autoTranslateOnSpeech ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
          <span>⚡ Auto-Translate</span>
        </button>
      </div>

      {/* Mode-Specific Controls */}
      {inputMode === "mic" && (
        <div className="group">
          <button
            id="btn-microphone-record"
            onClick={toggleRecording}
            className={`w-full py-6 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${
              isRecording
                ? "bg-rose-500/10 border-rose-500/60 text-rose-400 ring-4 ring-rose-500/10"
                : "bg-blue-600/10 border-blue-500/40 group-hover:border-blue-400 group-hover:bg-blue-600/20"
            }`}
          >
            {/* Live Visual Soundwave bars when listening */}
            {isRecording && (
              <div className="flex items-center gap-1 absolute inset-x-0 top-3 justify-center opacity-70">
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-6 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-8 bg-rose-400 rounded-full animate-bounce" />
                <span className="w-1 h-5 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1 h-7 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.35s]" />
                <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
              </div>
            )}

            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isRecording
                  ? "bg-rose-600 text-white shadow-rose-900/60 scale-110 animate-pulse"
                  : "bg-blue-600 text-white shadow-blue-900/50 group-hover:scale-105"
              }`}
            >
              {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7 stroke-[2.5]" />}
            </div>
            <div className="text-center space-y-0.5">
              <span
                className={`text-sm font-bold block ${
                  isRecording ? "text-rose-400" : "text-blue-400"
                }`}
              >
                {isRecording ? "Listening Live... Tap to Finish" : "Tap to Speak (Zero Delay)"}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {isRecording
                  ? autoTranslateOnSpeech
                    ? "Speaks stream in real-time -> Translates automatically"
                    : "Real-time speech capture active"
                  : "Words stream in real-time as you speak"}
              </span>
            </div>
          </button>

          {micStatusMsg && (
            <p className="text-xs text-blue-400 text-center mt-2 font-medium animate-pulse">
              {micStatusMsg}
            </p>
          )}
        </div>
      )}

      {inputMode === "file" && (
        <div className="bg-[#0F172A]/70 border border-slate-800 border-dashed rounded-2xl p-6 text-center space-y-3">
          <Upload className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <label
              htmlFor="audio-file-input"
              className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-md shadow-blue-900/40"
            >
              Choose Audio File (.wav, .mp3, .m4a)
            </label>
            <input
              id="audio-file-input"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <p className="text-xs text-slate-400">Gemini will automatically transcribe and translate.</p>
          {micStatusMsg && <p className="text-xs text-blue-400">{micStatusMsg}</p>}
        </div>
      )}

      {/* Transcript Text Area */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="user-speech-input" className="text-xs font-semibold text-slate-300">
            Recognized Speech / Editable Sentence:
          </label>
          {inputText && (
            <button
              id="btn-clear-input-text"
              onClick={() => setInputText("")}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          id="user-speech-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. Where is the nearest railway station? (or tap microphone to speak)"
          rows={3}
          className="w-full bg-[#0F172A] border border-slate-700/80 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
      </div>

      {/* Multilingual & Context Example Test Pills */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Try Multi-Turn Context & Other Languages:</span>
          </div>
          <span className="text-[10px] text-teal-400 font-medium">Auto-Language Detection</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            id="example-turn-1"
            onClick={() => {
              setInputText("Where is the nearest railway station?");
              setSourceLanguage("Auto-Detect");
            }}
            className="text-left bg-[#0F172A]/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs transition-all"
          >
            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0.5">
              Turn 1 (English)
            </span>
            <span className="text-slate-200 font-medium truncate block">
              "Where is the nearest railway station?"
            </span>
          </button>

          <button
            id="example-turn-2"
            onClick={() => {
              setInputText("How long does it take to walk there?");
              setSourceLanguage("Auto-Detect");
            }}
            className="text-left bg-[#0F172A]/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs transition-all"
          >
            <span className="text-[10px] uppercase font-bold text-teal-300 block mb-0.5">
              Turn 2 (Context Memory)
            </span>
            <span className="text-slate-200 font-medium truncate block">
              "How long does it take to walk there?"
            </span>
          </button>

          <button
            id="example-lang-tamil"
            onClick={() => {
              setInputText("வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?");
              setSourceLanguage("Auto-Detect");
            }}
            className="text-left bg-[#0F172A]/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs transition-all"
          >
            <span className="text-[10px] uppercase font-bold text-orange-400 block mb-0.5">
              Tamil 🇮🇳 (Auto-Detect)
            </span>
            <span className="text-slate-200 font-medium truncate block">
              "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?"
            </span>
          </button>

          <button
            id="example-lang-hindi"
            onClick={() => {
              setInputText("नमस्ते, क्या आप मेरी मदद कर सकते हैं?");
              setSourceLanguage("Auto-Detect");
            }}
            className="text-left bg-[#0F172A]/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs transition-all"
          >
            <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
              Hindi 🇮🇳 (Auto-Detect)
            </span>
            <span className="text-slate-200 font-medium truncate block">
              "नमस्ते, क्या आप मेरी मदद कर सकते हैं?"
            </span>
          </button>
        </div>
      </div>

      {/* Tamil Pronunciation Tuning & Dialect Selector */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-300">
            <span className="text-sm">🗣️</span>
            <span>Tamil Pronunciation & Dialect Style:</span>
          </div>
          <button
            type="button"
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Sliders className="w-3 h-3 text-blue-400" />
            <span>{showVoiceSettings ? "Hide Voice Tuning" : "Voice Tuning"}</span>
          </button>
        </div>

        {/* Dialect / Register Quick Selector */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            id="tamil-style-spoken"
            onClick={() => setTamilStyle?.("spoken")}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center transition-all ${
              tamilStyle === "spoken"
                ? "bg-orange-500/20 border border-orange-500/60 text-orange-200 shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40"
            }`}
          >
            <span>பேச்சுத் தமிழ்</span>
            <span className="text-[10px] opacity-75 font-normal">Spoken Daily</span>
          </button>

          <button
            type="button"
            id="tamil-style-formal"
            onClick={() => setTamilStyle?.("formal")}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center transition-all ${
              tamilStyle === "formal"
                ? "bg-orange-500/20 border border-orange-500/60 text-orange-200 shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40"
            }`}
          >
            <span>எழுத்துத் தமிழ்</span>
            <span className="text-[10px] opacity-75 font-normal">Formal Literary</span>
          </button>

          <button
            type="button"
            id="tamil-style-casual"
            onClick={() => setTamilStyle?.("casual")}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center transition-all ${
              tamilStyle === "casual"
                ? "bg-orange-500/20 border border-orange-500/60 text-orange-200 shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40"
            }`}
          >
            <span>நட்புப் பேச்சு</span>
            <span className="text-[10px] opacity-75 font-normal">Casual / Friendly</span>
          </button>
        </div>

        {/* Detailed Voice Tuning Drawer */}
        {showVoiceSettings && (
          <div className="pt-2 border-t border-slate-700/50 space-y-2.5 text-xs text-slate-300">
            {/* Speed Rate Slider */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-medium">Pronunciation Speed:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="1.2"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate?.(parseFloat(e.target.value))}
                  className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-400"
                />
                <span className="text-[11px] font-mono text-orange-300 w-9 text-right font-bold">
                  {speechRate.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Voice Engine Picker */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">Tamil Audio Voice Engine:</span>
              <select
                value={preferredVoiceName}
                onChange={(e) => setPreferredVoiceName?.(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="">Auto-Detect Native Tamil Engine (Google தமிழ் / Valluvar / Pallavi)</option>
                {availableVoices
                  .filter((v) => v.lang.startsWith("ta") || v.name.toLowerCase().includes("tamil") || v.name.includes("தமிழ்"))
                  .map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
              </select>
            </div>

            {/* Quick Test Audio Voice Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">Preview selected speech pace</span>
              <button
                type="button"
                id="btn-test-tamil-pronounce"
                onClick={() =>
                  speakText(
                    tamilStyle === "formal"
                      ? "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?"
                      : "வணக்கம்! நீங்க எப்படி இருக்கீங்க?",
                    "Tamil",
                    {
                      rate: speechRate,
                      voiceName: preferredVoiceName || undefined,
                      phoneticFallback: "Vanakkam! Neenga eppadi irukkeenga?",
                    }
                  )
                }
                className="flex items-center gap-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 px-2 py-1 rounded text-[11px] font-medium transition-colors"
              >
                <Volume2 className="w-3 h-3" />
                <span>Test Tamil Voice 🔊</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        id="btn-translate-speech-action"
        onClick={onTranslate}
        disabled={isLoading || !inputText.trim()}
        className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-lg ${
          isLoading || !inputText.trim()
            ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 cursor-pointer hover:scale-[1.01]"
        }`}
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Translating with Context Memory...</span>
          </>
        ) : (
          <>
            <span>Translate Across Languages</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};
