"""
Speech Recognition Utility Module for AI Multilingual Speech App.
Handles audio capture, microphone input, and speech-to-text conversion.
"""

import os
import io
import tempfile
from typing import Optional, Tuple

try:
    import speech_recognition as sr
except ImportError:
    sr = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None


# NOTE: Backend local microphone capture via PyAudio / sr.Microphone() is disabled
# for server/cloud environments where hardware microphones are not attached to the backend server.
# Audio input should be captured directly in the client browser or via audio file upload.

def recognize_speech_from_mic(timeout: int = 5, phrase_time_limit: int = 15) -> Tuple[bool, str]:
    """
    Disabled: Local backend microphone audio capture relying on PyAudio is disabled.
    Audio is captured on the client side (browser) or via audio file upload.
    """
    return False, "Server-side microphone capture is disabled. Please use the 'Audio File' upload tab or client-side voice input."



def transcribe_audio_bytes(
    audio_bytes: bytes,
    mime_type: str = "audio/wav",
    source_language_hint: Optional[str] = None,
    api_key: Optional[str] = None
) -> Tuple[bool, str, str]:
    """
    Transcribes audio bytes in any spoken language using Gemini 3.7 multimodal transcription
    or local SpeechRecognition fallback, automatically detecting the spoken language.
    
    Args:
        audio_bytes: Raw audio byte data (WAV, MP3, WEBM).
        mime_type: MIME type of the audio.
        source_language_hint: Optional hint for the spoken language.
        api_key: Optional Gemini API key.
        
    Returns:
        Tuple of (success: bool, transcribed_text: str, detected_language: str)
    """
    if not audio_bytes or len(audio_bytes) == 0:
        return False, "Audio recording is empty.", "Unknown"

    # 1. Try Gemini Multimodal transcription (supports 100+ languages with auto-detection)
    resolved_key = api_key or os.getenv("GEMINI_API_KEY")
    if resolved_key and genai is not None:
        try:
            client = genai.Client(api_key=resolved_key)
            prompt = (
                "Listen to this spoken audio carefully.\n"
                "1. Transcribe the exact words spoken by the user in their original language and native script.\n"
                "2. Accurately identify the language spoken (e.g. Tamil, Hindi, Spanish, French, Japanese, etc.).\n"
                f"{f'Language hint: The speaker might be speaking {source_language_hint}.' if source_language_hint and source_language_hint != 'Auto-Detect' else 'Detect the spoken language automatically.'}\n\n"
                "Respond in JSON format: {\"text\": \"transcription in original script\", \"detected_language\": \"Language Name\"}"
            )
            response = client.models.generate_content(
                model="gemini-3.7-flash",
                contents=[
                    types.Part.from_bytes(
                        data=audio_bytes,
                        mime_type=mime_type
                    ),
                    prompt
                ],
                config={"response_mime_type": "application/json"}
            )
            if response and response.text:
                import json
                try:
                    data = json.loads(response.text.strip())
                    return True, data.get("text", "").strip(), data.get("detected_language", "Auto-Detected")
                except Exception:
                    return True, response.text.strip(), "Auto-Detected"
        except Exception:
            pass

    # 2. Fallback to SpeechRecognition
    if sr is not None:
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name

            recognizer = sr.Recognizer()
            with sr.AudioFile(tmp_path) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data)
                
            os.remove(tmp_path)
            return True, text.strip(), "Auto-Detected"
        except Exception as sr_err:
            return False, f"Failed to transcribe audio: {str(sr_err)}", "Unknown"

    return False, "Audio transcription service unavailable.", "Unknown"
