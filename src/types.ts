export interface TamilSyllable {
  word: string;
  phonetics: string;
  meaning?: string;
}

export interface TamilPronunciationDetail {
  spoken: string;
  formal: string;
  transliteration: string;
  syllables?: TamilSyllable[];
  pronunciation_tip?: string;
}

export interface TranslationTurn {
  id: string;
  user_speech: string;
  detected_language: string;
  translations: Record<string, string>;
  pronunciations?: Record<string, string>;
  tamil_detail?: TamilPronunciationDetail;
  context_notes?: string;
  timestamp: string;
}

export interface TranslationResult {
  success: boolean;
  original_text: string;
  detected_language: string;
  translations: Record<string, string>;
  pronunciations?: Record<string, string>;
  tamil_detail?: TamilPronunciationDetail;
  context_notes?: string;
  error?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  description: string;
}

export const ALL_SUPPORTED_LANGUAGES = [
  { name: "English", code: "en", flag: "🇬🇧", region: "International" },
  { name: "Tamil", code: "ta", flag: "🇮🇳", region: "India" },
  { name: "Hindi", code: "hi", flag: "🇮🇳", region: "India" },
  { name: "Telugu", code: "te", flag: "🇮🇳", region: "India" },
  { name: "Malayalam", code: "ml", flag: "🇮🇳", region: "India" },
  { name: "Kannada", code: "kn", flag: "🇮🇳", region: "India" },
  { name: "Bengali", code: "bn", flag: "🇮🇳", region: "India" },
  { name: "Marathi", code: "mr", flag: "🇮🇳", region: "India" },
  { name: "Gujarati", code: "gu", flag: "🇮🇳", region: "India" },
  { name: "Punjabi", code: "pa", flag: "🇮🇳", region: "India" },
  { name: "French", code: "fr", flag: "🇫🇷", region: "Europe" },
  { name: "German", code: "de", flag: "🇩🇪", region: "Europe" },
  { name: "Spanish", code: "es", flag: "🇪🇸", region: "Europe" },
  { name: "Japanese", code: "ja", flag: "🇯🇵", region: "Asia" },
  { name: "Chinese (Mandarin)", code: "zh-CN", flag: "🇨🇳", region: "Asia" },
  { name: "Korean", code: "ko", flag: "🇰🇷", region: "Asia" },
  { name: "Arabic", code: "ar", flag: "🇸🇦", region: "Middle East" },
  { name: "Russian", code: "ru", flag: "🇷🇺", region: "Europe" },
  { name: "Portuguese", code: "pt", flag: "🇵🇹", region: "Europe" },
  { name: "Italian", code: "it", flag: "🇮🇹", region: "Europe" },
];
