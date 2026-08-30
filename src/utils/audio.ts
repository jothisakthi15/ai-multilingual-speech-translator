/**
 * Browser Audio and Speech Synthesis Utilities with Enhanced Multilingual & Tamil Pronunciation
 */

// Cached voices
let cachedVoices: SpeechSynthesisVoice[] = [];

export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }

    const onVoicesChanged = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        cachedVoices = v;
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(v);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 400);
  });
}

// Pre-warm voices
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  getAvailableVoices();
}

export interface SpeakOptions {
  slow?: boolean;
  rate?: number;
  pitch?: number;
  voiceName?: string;
  phoneticFallback?: string;
}

// Speech synthesis helper with native pronunciation tuning
export async function speakText(
  text: string,
  languageName: string,
  options: SpeakOptions = {}
): Promise<void> {
  return new Promise(async (resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Speech synthesis not supported in this browser.");
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Map language name to standard locale
    const localeMap: Record<string, string> = {
      English: 'en-US',
      Tamil: 'ta-IN',
      Hindi: 'hi-IN',
      Telugu: 'te-IN',
      Malayalam: 'ml-IN',
      Kannada: 'kn-IN',
      Bengali: 'bn-IN',
      Marathi: 'mr-IN',
      French: 'fr-FR',
      German: 'de-DE',
      Spanish: 'es-ES',
      Japanese: 'ja-JP',
      Gujarati: 'gu-IN',
      Punjabi: 'pa-IN',
      Arabic: 'ar-SA',
      'Chinese (Mandarin)': 'zh-CN',
      Russian: 'ru-RU',
      Portuguese: 'pt-BR',
      Italian: 'it-IT',
      Korean: 'ko-KR',
    };

    const targetLocale = localeMap[languageName] || 'en-US';
    const voices = await getAvailableVoices();

    let textToSpeak = text;
    let selectedVoice: SpeechSynthesisVoice | null = null;

    // If explicit voice requested
    if (options.voiceName) {
      selectedVoice = voices.find(v => v.name === options.voiceName) || null;
    }

    if (!selectedVoice) {
      if (languageName.toLowerCase() === "tamil") {
        // High-precision Tamil Voice Selection (Google தமிழ், Microsoft Valluvar, Pallavi, ta-IN, ta)
        selectedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith("ta") ||
              v.name.toLowerCase().includes("tamil") ||
              v.name.includes("தமிழ்") ||
              v.name.toLowerCase().includes("valluvar")
          ) || null;

        // If no native Tamil voice on this device, use Indian English voice to pronounce phonetic Tanglish
        if (!selectedVoice && options.phoneticFallback) {
          selectedVoice =
            voices.find(
              (v) => v.lang === "en-IN" || v.lang.startsWith("hi") || v.lang.startsWith("en")
            ) || null;
          textToSpeak = options.phoneticFallback;
        }
      } else {
        selectedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase() === targetLocale.toLowerCase() ||
              v.lang.toLowerCase().startsWith(targetLocale.slice(0, 2).toLowerCase())
          ) || null;
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = targetLocale;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Pronunciation Rate & Pitch Tuning
    if (options.rate !== undefined && options.rate > 0) {
      utterance.rate = options.rate;
    } else if (options.slow) {
      utterance.rate = languageName.toLowerCase() === "tamil" ? 0.70 : 0.75;
    } else if (languageName.toLowerCase() === "tamil") {
      utterance.rate = 0.85; // Clear, articulate Tamil cadence
    } else {
      utterance.rate = 0.95;
    }

    utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

// Convert audio blob to Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
