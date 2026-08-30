"""
Text-to-Speech (TTS) Utility Module for AI Multilingual Speech App.
Converts translated text into audible spoken speech using gTTS.
"""

import io
from typing import Optional, Tuple

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

# Mapping of supported application language names to ISO 639-1 language codes for gTTS
LANGUAGE_CODE_MAP = {
    "English": "en",
    "Tamil": "ta",
    "Hindi": "hi",
    "Telugu": "te",
    "Malayalam": "ml",
    "Kannada": "kn",
    "Bengali": "bn",
    "Marathi": "mr",
    "French": "fr",
    "German": "de",
    "Spanish": "es",
    "Japanese": "ja",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Arabic": "ar",
    "Chinese (Mandarin)": "zh-CN",
    "Russian": "ru",
    "Portuguese": "pt",
    "Italian": "it",
    "Korean": "ko"
}


def text_to_speech_bytes(text: str, language_name: str) -> Tuple[bool, Optional[bytes], str]:
    """
    Synthesizes speech from text for the given language name.
    
    Args:
        text: The text to be converted to speech.
        language_name: Name of the language (e.g., 'Tamil', 'Hindi', 'English', 'French').
        
    Returns:
        Tuple of (success: bool, audio_bytes: Optional[bytes], message: str)
    """
    if not text or not text.strip():
        return False, None, "Text is empty, cannot generate speech."

    if gTTS is None:
        return False, None, "gTTS library is not installed. Please install it via requirements.txt."

    # Resolve ISO code from language name
    lang_code = LANGUAGE_CODE_MAP.get(language_name)
    if not lang_code:
        # Fallback to English if exact mapping is not found
        lang_code = "en"

    try:
        # Create gTTS instance
        tts = gTTS(text=text.strip(), lang=lang_code, slow=False)
        
        # Write MP3 audio to in-memory byte buffer
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        
        return True, fp.getvalue(), f"Speech generated successfully in {language_name}."
        
    except Exception as e:
        return False, None, f"Text-to-speech error for {language_name}: {str(e)}"
