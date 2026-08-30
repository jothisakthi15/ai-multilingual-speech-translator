"""
AI Multilingual Translation Engine using Google Gemini API.
Handles context-aware translation, automatic language detection, and cultural nuances.
"""

import os
import json
from typing import List, Dict, Any, Optional

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

# Comprehensive list of supported languages
SUPPORTED_LANGUAGES = [
    "English",
    "Tamil",
    "Hindi",
    "Telugu",
    "Malayalam",
    "Kannada",
    "Bengali",
    "Marathi",
    "French",
    "German",
    "Spanish",
    "Japanese",
    "Gujarati",
    "Punjabi",
    "Arabic",
    "Chinese (Mandarin)",
    "Russian",
    "Portuguese",
    "Italian",
    "Korean"
]


def build_system_instruction() -> str:
    """
    Constructs the system prompt that ensures high-fidelity translation,
    context retention, and culturally accurate nuances.
    """
    return (
        "You are an expert multilingual AI translator and linguist with deep context awareness.\n"
        "Your task is to take spoken/written user input and:\n"
        "1. Automatically identify the source language accurately if not provided.\n"
        "2. Translate the input into all requested target languages.\n"
        "3. CRITICAL - CONTEXT RETENTION: Maintain continuity from the conversation history. "
        "Pronouns, omitted subjects, follow-up phrases, and references to previous sentences "
        "must be resolved accurately using the provided chat history.\n"
        "4. Tone and Idioms: Preserve the natural conversational tone, emotional intent, and colloquial expressions.\n"
        "5. Proper Nouns: Do not awkwardly translate names of people, places, brands, or medical terms unless a standard localized version exists.\n"
        "6. Output: You MUST return a strictly valid JSON object matching the requested schema without any surrounding markdown formatting."
    )


def translate_with_gemini(
    text: str,
    target_languages: List[str],
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    source_language_override: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Translates input text into multiple target languages using Google Gemini API with conversation context.
    
    Args:
        text: The source text to translate.
        target_languages: List of target language names.
        conversation_history: List of past turns with format:
            [{ 'user_speech': str, 'detected_language': str, 'translations': {lang: str} }]
        source_language_override: If specified and not 'Auto-Detect', forces the source language.
        api_key: Optional Gemini API key (otherwise reads GEMINI_API_KEY from environment).
        
    Returns:
        Dict containing:
        - success: bool
        - detected_language: str
        - original_text: str
        - translations: Dict[str, str] (key: language name, value: translated text)
        - context_notes: str (brief note on how context resolved pronouns/ambiguity)
        - error: Optional[str]
    """
    if not text or not text.strip():
        return {
            "success": False,
            "error": "Input text cannot be empty.",
            "translations": {},
            "detected_language": "Unknown",
            "original_text": ""
        }

    if not target_languages:
        return {
            "success": False,
            "error": "Please select at least one target language.",
            "translations": {},
            "detected_language": "Unknown",
            "original_text": text
        }

    resolved_api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not resolved_api_key:
        return {
            "success": False,
            "error": (
                "Google Gemini API key is missing. "
                "Please configure GEMINI_API_KEY in your environment variables or Streamlit secrets."
            ),
            "translations": {},
            "detected_language": "Unknown",
            "original_text": text
        }

    if genai is None:
        return {
            "success": False,
            "error": "The google-genai Python library is not installed. Please run: pip install -r requirements.txt",
            "translations": {},
            "detected_language": "Unknown",
            "original_text": text
        }

    # Format conversation history for context injection
    history_summary = []
    if conversation_history:
        for idx, turn in enumerate(conversation_history[-5:], start=1):
            history_summary.append(
                f"Turn {idx}:\n"
                f"  Input: \"{turn.get('user_speech', '')}\" ({turn.get('detected_language', 'Auto')})\n"
                f"  Translations: {json.dumps(turn.get('translations', {}), ensure_ascii=False)}"
            )

    history_prompt_str = "\n".join(history_summary) if history_summary else "No prior conversation history in this session."

    user_prompt = f"""
Current User Input to translate:
"{text.strip()}"

Source Language Hint:
{source_language_override if (source_language_override and source_language_override != 'Auto-Detect') else 'Detect automatically'}

Requested Target Languages:
{json.dumps(target_languages)}

Recent Conversation History for Context Resolution:
{history_prompt_str}

Please generate the translation for each target language in the following exact JSON schema:
{{
  "detected_language": "Source language name (e.g. English, Tamil, Hindi, Spanish)",
  "context_applied": "Short explanation of how context was used (e.g. 'Resolved reference to the previous hospital visit')",
  "translations": {{
    "<Target Language 1>": "Translated text preserving exact meaning and tone",
    "<Target Language 2>": "Translated text preserving exact meaning and tone"
  }}
}}
"""

    try:
        client = genai.Client(api_key=resolved_api_key)
        
        response = client.models.generate_content(
            model="gemini-3.7-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=build_system_instruction(),
                response_mime_type="application/json",
                temperature=0.2,
            )
        )

        response_text = response.text
        if not response_text:
            return {
                "success": False,
                "error": "Empty response received from Gemini API.",
                "translations": {},
                "detected_language": "Unknown",
                "original_text": text
            }

        parsed = json.loads(response_text)
        
        detected_lang = parsed.get("detected_language", "Auto-Detected")
        if source_language_override and source_language_override != "Auto-Detect":
            detected_lang = source_language_override

        return {
            "success": True,
            "original_text": text.strip(),
            "detected_language": detected_lang,
            "context_notes": parsed.get("context_applied", ""),
            "translations": parsed.get("translations", {}),
            "error": None
        }

    except json.JSONDecodeError as json_err:
        return {
            "success": False,
            "error": f"Failed to parse Gemini response format: {str(json_err)}",
            "translations": {},
            "detected_language": "Unknown",
            "original_text": text
        }
    except Exception as e:
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "403" in error_msg:
            user_friendly_error = "Invalid Gemini API Key. Please verify your GEMINI_API_KEY in .env or secrets."
        elif "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            user_friendly_error = "Rate limit reached for Gemini API. Please wait a moment and retry."
        else:
            user_friendly_error = f"Gemini API translation error: {error_msg}"

        return {
            "success": False,
            "error": user_friendly_error,
            "translations": {},
            "detected_language": "Unknown",
            "original_text": text
        }
