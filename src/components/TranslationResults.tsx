import React, { useState } from "react";
import { TranslationResult, ALL_SUPPORTED_LANGUAGES, TamilSyllable } from "../types";
import { Volume2, VolumeX, Copy, Check, Brain, Globe, Sparkles, Snail, Music, BookOpen, MessageSquare, Info, RefreshCw, Volume1 } from "lucide-react";
import { speakText } from "../utils/audio";

interface TranslationResultsProps {
  result: TranslationResult | null;
  isLoading: boolean;
  tamilStyle?: "spoken" | "formal" | "casual";
  setTamilStyle?: (style: "spoken" | "formal" | "casual") => void;
  speechRate?: number;
  setSpeechRate?: (rate: number) => void;
  speechPitch?: number;
  setSpeechPitch?: (pitch: number) => void;
  preferredVoiceName?: string;
  setPreferredVoiceName?: (name: string) => void;
  onReTranslate?: () => void;
}

export const TranslationResults: React.FC<TranslationResultsProps> = ({
  result,
  isLoading,
  tamilStyle = "spoken",
  setTamilStyle,
  speechRate = 0.85,
  setSpeechRate,
  speechPitch = 1.0,
  preferredVoiceName = "",
  onReTranslate,
}) => {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [activeTamilWord, setActiveTamilWord] = useState<string | null>(null);

  const handlePlayTTS = async (
    text: string,
    langName: string,
    mode: "normal" | "slow" | "custom" = "normal",
    phoneticFallback?: string
  ) => {
    const key = `${langName}-${mode}-${text.slice(0, 10)}`;
    if (playingKey === key) {
      window.speechSynthesis.cancel();
      setPlayingKey(null);
      return;
    }

    setPlayingKey(key);
    let customRate: number | undefined = undefined;
    if (mode === "slow") {
      customRate = langName.toLowerCase() === "tamil" ? 0.65 : 0.72;
    } else if (mode === "custom" && speechRate) {
      customRate = speechRate;
    }

    await speakText(text, langName, {
      slow: mode === "slow",
      rate: customRate,
      pitch: speechPitch,
      voiceName: langName.toLowerCase() === "tamil" && preferredVoiceName ? preferredVoiceName : undefined,
      phoneticFallback,
    });
    setPlayingKey(null);
  };

  const handleSpeakWord = async (word: string, phonetics?: string) => {
    setActiveTamilWord(word);
    await speakText(word, "Tamil", {
      rate: 0.75,
      pitch: speechPitch,
      voiceName: preferredVoiceName || undefined,
      phoneticFallback: phonetics,
    });
    setTimeout(() => setActiveTamilWord(null), 1200);
  };

  const handleCopy = (text: string, langName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLang(langName);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Brain className="w-8 h-8 animate-pulse text-blue-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Translating with Instant Phonetics & Speech Synthesis</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Analyzing speech phonetics, generating native script translations and clear pronunciation guides...
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-[#131C31]/60 border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[380px]">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-300">Ready for Speech Translation & Pronunciation</h3>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Speak into the microphone or enter text to see translations, phonetics, and clear voice pronunciation.
          </p>
        </div>
      </div>
    );
  }

  const entries = Object.entries(result.translations || {});
  const tamilTranslation = result.translations?.["Tamil"] || (result.detected_language?.toLowerCase() === "tamil" ? result.original_text : null);
  const tamilDetail = result.tamil_detail;
  const tamilPronunciation = result.pronunciations?.["Tamil"] || tamilDetail?.transliteration;

  return (
    <div className="space-y-5">
      {/* Original Speech & Language Detection Banner */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2.5 py-0.5 rounded">
              Original Speech
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>
                Detected:{" "}
                {ALL_SUPPORTED_LANGUAGES.find(
                  (l) => l.name.toLowerCase() === (result.detected_language || "").toLowerCase()
                )?.flag}{" "}
                {result.detected_language || "Auto-Detected"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-play-original-tts"
              onClick={() => handlePlayTTS(result.original_text, result.detected_language, "normal")}
              className="flex items-center gap-1.5 text-xs bg-slate-700/80 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              {playingKey?.startsWith(`${result.detected_language}-normal`) ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </>
              )}
            </button>

            <button
              id="btn-play-original-tts-slow"
              onClick={() => handlePlayTTS(result.original_text, result.detected_language, "slow")}
              title="Listen slowly for precise pronunciation"
              className="flex items-center gap-1 text-xs bg-slate-700/60 hover:bg-slate-700 text-amber-300 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
            >
              {playingKey?.startsWith(`${result.detected_language}-slow`) ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Snail className="w-3.5 h-3.5" />
              )}
              <span>Slow</span>
            </button>
          </div>
        </div>

        <div className="text-xl text-slate-100 font-medium leading-relaxed italic">
          "{result.original_text}"
        </div>

        {/* Context Application Badge if available */}
        {result.context_notes && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-200">
            <Brain className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-300 font-bold">Context Memory:</strong>{" "}
              <span>{result.context_notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* DEDICATED TAMIL PRONUNCIATION STUDIO CARD (If Tamil in results or detected) */}
      {tamilTranslation && (
        <div
          id="tamil-pronunciation-studio"
          className="bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl ring-1 ring-amber-500/20"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🇮🇳</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-amber-200">
                    Tamil Pronunciation & Dialect Studio
                  </h3>
                  <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    தமிழ் உச்சரிப்பு
                  </span>
                </div>
                <p className="text-xs text-amber-300/80">
                  Customized audio speech, spoken vs formal variants, and interactive syllable breakdown
                </p>
              </div>
            </div>

            {/* Quick Audio Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                id="btn-tamil-master-tts"
                onClick={() =>
                  handlePlayTTS(
                    tamilTranslation,
                    "Tamil",
                    "custom",
                    tamilPronunciation
                  )
                }
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02]"
              >
                {playingKey?.startsWith("Tamil-custom") ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-900" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Pronounce Tamil ({speechRate.toFixed(2)}x)</span>
                  </>
                )}
              </button>

              <button
                id="btn-tamil-slow-tts"
                onClick={() =>
                  handlePlayTTS(
                    tamilTranslation,
                    "Tamil",
                    "slow",
                    tamilPronunciation
                  )
                }
                title="Super slow syllable-by-syllable pronunciation"
                className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              >
                <Snail className="w-4 h-4 text-amber-300" />
                <span>Slow (0.65x)</span>
              </button>
            </div>
          </div>

          {/* Primary Tamil Script Presentation */}
          <div className="bg-slate-950/60 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-amber-400/90 font-medium">
              <span>Native Tamil Script:</span>
              <button
                onClick={() => handleCopy(tamilTranslation, "Tamil")}
                className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors"
              >
                {copiedLang === "Tamil" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-2xl text-amber-50 font-semibold leading-relaxed tracking-wide">
              {tamilTranslation}
            </p>

            {/* Tanglish Phonetic Romanization */}
            {tamilPronunciation && (
              <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs">
                <Music className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                    Phonetic Romanization (Tanglish):
                  </span>
                  <span className="text-slate-200 font-mono text-sm font-medium tracking-wide">
                    {tamilPronunciation}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Spoken vs Formal Variants Comparison (if available in detail) */}
          {tamilDetail && (tamilDetail.spoken || tamilDetail.formal) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Spoken Colloquial */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>பேச்சுத் தமிழ் (Daily Spoken)</span>
                  </div>
                  <button
                    onClick={() =>
                      handlePlayTTS(
                        tamilDetail.spoken || tamilTranslation,
                        "Tamil",
                        "custom"
                      )
                    }
                    className="p-1 rounded bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 transition-colors"
                    title="Listen to spoken Tamil"
                  >
                    <Volume1 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-slate-200 font-medium">
                  {tamilDetail.spoken || tamilTranslation}
                </p>
                <p className="text-[11px] text-slate-400">
                  Ideal for friendly conversations and natural communication.
                </p>
              </div>

              {/* Formal Literary */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>எழுத்துத் தமிழ் (Formal Literary)</span>
                  </div>
                  <button
                    onClick={() =>
                      handlePlayTTS(
                        tamilDetail.formal || tamilTranslation,
                        "Tamil",
                        "custom"
                      )
                    }
                    className="p-1 rounded bg-slate-800 hover:bg-blue-600/30 text-blue-300 transition-colors"
                    title="Listen to formal Tamil"
                  >
                    <Volume1 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-slate-200 font-medium">
                  {tamilDetail.formal || tamilTranslation}
                </p>
                <p className="text-[11px] text-slate-400">
                  Standard written grammar suitable for official & formal contexts.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Word & Syllable Breakdown (Click to Speak Individual Word!) */}
          {tamilDetail?.syllables && tamilDetail.syllables.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Word & Syllable Pronouncer (Tap any word to hear):</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {tamilDetail.syllables.length} words
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {tamilDetail.syllables.map((item: TamilSyllable, idx: number) => {
                  const isActive = activeTamilWord === item.word;
                  return (
                    <button
                      key={idx}
                      id={`btn-syllable-${idx}`}
                      onClick={() => handleSpeakWord(item.word, item.phonetics)}
                      className={`group flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all border ${
                        isActive
                          ? "bg-amber-500 text-slate-950 border-amber-400 scale-105 shadow-md"
                          : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/70 hover:border-amber-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{item.word}</span>
                        <Volume2 className={`w-3 h-3 ${isActive ? "text-slate-950" : "text-amber-400 opacity-60 group-hover:opacity-100"}`} />
                      </div>
                      <span className={`text-[11px] font-mono ${isActive ? "text-slate-900 font-semibold" : "text-amber-300/90"}`}>
                        [{item.phonetics}]
                      </span>
                      {item.meaning && (
                        <span className={`text-[10px] mt-0.5 ${isActive ? "text-slate-800" : "text-slate-400"}`}>
                          {item.meaning}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pronunciation & Articulation Guidance Tip */}
          {tamilDetail?.pronunciation_tip && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-bold">Pronunciation Key:</strong>{" "}
                <span>{tamilDetail.pronunciation_tip}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multilingual Translation Output Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            All Translation Results ({entries.length})
          </h3>
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>High-Fidelity Audio Pronunciation</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(([langName, rawText]) => {
            const translatedText = String(rawText || "");
            const pronunciation = result.pronunciations?.[langName];
            const langMeta = ALL_SUPPORTED_LANGUAGES.find((l) => l.name === langName);
            const isPlayingNormal = playingKey?.startsWith(`${langName}-normal`);
            const isPlayingSlow = playingKey?.startsWith(`${langName}-slow`);
            const isCopied = copiedLang === langName;
            const isTamil = langName.toLowerCase() === "tamil";

            return (
              <div
                key={langName}
                id={`card-trans-${langName.toLowerCase()}`}
                className={`bg-[#1E293B] border rounded-xl p-5 flex flex-col justify-between transition-all shadow-lg ${
                  isTamil
                    ? "border-amber-500/40 bg-gradient-to-b from-[#1E293B] to-[#1e2336] ring-1 ring-amber-500/20"
                    : "border-slate-700/50 hover:border-blue-500/50"
                }`}
              >
                <div>
                  {/* Language Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{langMeta?.flag || "🌐"}</span>
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        {langName}
                        {isTamil && (
                          <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                            Native Voice Tuned
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Actions: Copy, Listen Normal, Listen Slow */}
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-copy-${langName.toLowerCase()}`}
                        onClick={() => handleCopy(translatedText, langName)}
                        className="w-8 h-8 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                        title="Copy translation"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Normal Cadence Audio */}
                      <button
                        id={`btn-tts-${langName.toLowerCase()}`}
                        onClick={() =>
                          handlePlayTTS(translatedText, langName, "normal", pronunciation)
                        }
                        className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${
                          isPlayingNormal
                            ? "bg-rose-600 text-white animate-pulse"
                            : isTamil
                            ? "bg-amber-600/30 text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-500/40"
                            : "bg-slate-700 text-blue-400 hover:bg-blue-600 hover:text-white"
                        }`}
                        title="Play natural voice pronunciation"
                      >
                        {isPlayingNormal ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isPlayingNormal ? "Stop" : "Speak"}</span>
                      </button>

                      {/* Slow & Clear Pronunciation Audio */}
                      <button
                        id={`btn-tts-slow-${langName.toLowerCase()}`}
                        onClick={() =>
                          handlePlayTTS(translatedText, langName, "slow", pronunciation)
                        }
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                          isPlayingSlow
                            ? "bg-amber-500 text-slate-900 font-bold"
                            : "bg-slate-700/70 text-slate-300 hover:bg-amber-600/30 hover:text-amber-300 hover:border-amber-500/40"
                        }`}
                        title="Slow & Clear Pronunciation (Enunciate each syllable)"
                      >
                        <Snail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Translated Text in Native Script */}
                  <p className="text-lg text-slate-100 mt-3 font-semibold leading-relaxed font-sans">
                    {translatedText}
                  </p>

                  {/* Phonetic Pronunciation Guide */}
                  {pronunciation && (
                    <div className="mt-2.5 bg-slate-900/60 border border-slate-700/60 rounded-lg p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
                        <Music className="w-3 h-3 text-amber-400" />
                        <span>Pronunciation Guide (Tanglish / Phonetics):</span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono tracking-wide leading-relaxed">
                        {pronunciation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400">
                  <span>Region: {langMeta?.region || "Global"}</span>
                  {isTamil && (
                    <span className="text-amber-400/90 font-medium">
                      0.85x Calibrated Speech Cadence
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

