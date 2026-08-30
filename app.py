"""
AI Multilingual Speech App
Main Streamlit Application
"Speak once. Understand everywhere."
"""

import os
import streamlit as st
from dotenv import load_dotenv

# Load local environment variables from .env if present
load_dotenv()

# Import project utilities
from utils.translation import translate_with_gemini, SUPPORTED_LANGUAGES
from utils.text_to_speech import text_to_speech_bytes
from utils.speech import recognize_speech_from_mic, transcribe_audio_bytes

# Page configuration
st.set_page_config(
    page_title="AI Multilingual Speech App",
    page_icon="🎙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern UI design and high-contrast styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
    }
    
    .main-title {
        font-size: 2.4rem;
        font-weight: 800;
        background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    
    .subtitle-text {
        font-size: 1.1rem;
        color: #94a3b8;
        margin-bottom: 1.8rem;
    }
    
    .trans-card {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 1.25rem;
        margin-bottom: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    
    .lang-badge {
        display: inline-block;
        background-color: #3b82f6;
        color: white;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }
    
    .original-bubble {
        background-color: #0f172a;
        border-left: 4px solid #38bdf8;
        padding: 1rem;
        border-radius: 0 8px 8px 0;
        margin-bottom: 1.5rem;
    }
    
    .context-notice {
        background-color: rgba(56, 189, 248, 0.1);
        border: 1px dashed #0284c7;
        padding: 0.75rem;
        border-radius: 8px;
        color: #bae6fd;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)


# Initialize Session State
if "history" not in st.session_state:
    st.session_state.history = []

if "current_input_text" not in st.session_state:
    st.session_state.current_input_text = ""

if "last_result" not in st.session_state:
    st.session_state.last_result = None

# Sidebar Configuration
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1589254065878-42c9da997008?w=200&auto=format&fit=crop&q=60", width=100)
    st.title("Settings & Status")
    
    # API Key Handling (Environment variable or Streamlit secrets)
    api_key = os.getenv("GEMINI_API_KEY") or st.secrets.get("GEMINI_API_KEY", "")
    
    if api_key:
        st.success("✅ Google Gemini API Key Connected")
    else:
        st.warning("⚠️ GEMINI_API_KEY not found in environment.")
        custom_key = st.text_input("Enter Gemini API Key (Temporary)", type="password")
        if custom_key:
            api_key = custom_key
            st.info("Using manually entered API key.")

    st.markdown("---")
    
    # Target Language Default Selection
    st.subheader("Target Languages")
    default_targets = ["Tamil", "Hindi", "Telugu", "French", "Spanish", "Japanese"]
    selected_targets = st.multiselect(
        "Select target languages for translation:",
        options=SUPPORTED_LANGUAGES,
        default=default_targets
    )
    
    st.markdown("---")
    st.subheader("Context Memory")
    st.caption(f"Session memory: **{len(st.session_state.history)} messages retained**")
    
    if st.button("🧹 Clear Conversation Context", use_container_width=True):
        st.session_state.history = []
        st.session_state.last_result = None
        st.session_state.current_input_text = ""
        st.success("Conversation context reset!")
        st.rerun()

    st.markdown("---")
    # Portfolio Section
    with st.expander("ℹ️ About This Project"):
        st.markdown("""
        **AI Multilingual Speech App** is a portfolio-grade application demonstrating:
        - **Python & Streamlit**: Reactive frontend and clean modular backend
        - **Google Gemini 3.7**: Context-aware linguistic translation & multimodal reasoning
        - **Speech Recognition**: Voice-to-text conversion with ambient noise calibration
        - **gTTS Audio Engine**: Real-time localized voice synthesis for 20+ languages
        - **Contextual NLP**: Session-based pronoun and conversational memory resolution
        """)


# Main UI Header
st.markdown('<div class="main-title">AI Multilingual Speech App</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle-text">Speak once. Understand everywhere.</div>', unsafe_allow_html=True)

# Main Grid Layout: Left column for Input, Right column for Output
col_input, col_output = st.columns([1.1, 1.4], gap="large")

with col_input:
    st.subheader("1. Spoken or Text Input")
    
    # Source Language Selector
    source_options = ["Auto-Detect"] + SUPPORTED_LANGUAGES
    source_lang = st.selectbox("Source Language:", options=source_options, index=0)
    
    # Input Tabs: Live Microphone vs Audio Upload vs Direct Text
    input_tab1, input_tab2, input_tab3 = st.tabs(["🎙️ Microphone", "📁 Audio File", "⌨️ Text Prompt"])
    
    with input_tab1:
        st.info("Click below to capture speech directly through your local microphone.")
        if st.button("🔴 Record Speech from Microphone", key="btn_mic", use_container_width=True):
            with st.spinner("Listening for speech... Please speak into your microphone."):
                success, speech_text = recognize_speech_from_mic()
                if success:
                    st.session_state.current_input_text = speech_text
                    st.success(f"Recognized: \"{speech_text}\"")
                else:
                    st.error(f"Speech Input Error: {speech_text}")
    
    with input_tab2:
        uploaded_audio = st.file_uploader("Upload an audio recording (.wav, .mp3, .m4a)", type=["wav", "mp3", "m4a", "ogg"])
        if uploaded_audio is not None:
            st.audio(uploaded_audio)
            if st.button("Transcribe Audio File", key="btn_transcribe_file", use_container_width=True):
                with st.spinner("Transcribing audio with AI..."):
                    audio_bytes = uploaded_audio.read()
                    success, transcribed_text = transcribe_audio_bytes(
                        audio_bytes,
                        mime_type=uploaded_audio.type,
                        api_key=api_key
                    )
                    if success:
                        st.session_state.current_input_text = transcribed_text
                        st.success(f"Transcribed: \"{transcribed_text}\"")
                    else:
                        st.error(transcribed_text)
                        
    with input_tab3:
        st.caption("You can also type or edit speech input directly:")

    # Text Input Box (populated by mic or typed manually)
    user_text = st.text_area(
        "Current Sentence to Translate:",
        value=st.session_state.current_input_text,
        height=100,
        placeholder="e.g. Where is the nearest railway station? or My mother was with me."
    )
    
    # Quick Context Demonstration Examples
    st.caption("Try context follow-up examples:")
    ex_col1, ex_col2 = st.columns(2)
    with ex_col1:
        if st.button("Example 1: 'I went to the clinic.'", use_container_width=True):
            st.session_state.current_input_text = "I went to the clinic yesterday."
            st.rerun()
    with ex_col2:
        if st.button("Example 2: 'My mother was with me.'", use_container_width=True):
            st.session_state.current_input_text = "My mother was with me."
            st.rerun()

    st.markdown("---")
    
    # Translation Action Button
    translate_clicked = st.button("🚀 Translate Speech", type="primary", use_container_width=True)
    if translate_clicked:
        if not user_text.strip():
            st.warning("Please record speech or enter text before translating.")
        elif not selected_targets:
            st.warning("Please select at least one target language from the sidebar.")
        else:
            with st.spinner("Translating with Gemini AI & Context Memory..."):
                result = translate_with_gemini(
                    text=user_text,
                    target_languages=selected_targets,
                    conversation_history=st.session_state.history,
                    source_language_override=source_lang,
                    api_key=api_key
                )
                
                if result.get("success"):
                    st.session_state.last_result = result
                    # Append to context history
                    st.session_state.history.append({
                        "user_speech": result.get("original_text"),
                        "detected_language": result.get("detected_language"),
                        "translations": result.get("translations"),
                        "context_notes": result.get("context_notes")
                    })
                    st.rerun()
                else:
                    st.error(result.get("error", "An unknown error occurred during translation."))


with col_output:
    st.subheader("2. AI Multilingual Translations")
    
    if st.session_state.last_result:
        res = st.session_state.last_result
        orig = res.get("original_text", "")
        detected = res.get("detected_language", "Auto")
        notes = res.get("context_notes", "")
        translations = res.get("translations", {})
        
        # Original speech summary bubble
        st.markdown(f"""
        <div class="original-bubble">
            <span class="lang-badge">Detected: {detected}</span>
            <div style="font-size: 1.15rem; font-weight: 600; color: #f8fafc; margin-top: 0.25rem;">
                "{orig}"
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Context note indicator if context memory resolved references
        if notes:
            st.markdown(f"""
            <div class="context-notice">
                🧠 <b>Context Memory:</b> {notes}
            </div>
            """, unsafe_allow_html=True)
            
        # Display Translation Cards for each selected language
        for lang_name, trans_text in translations.items():
            with st.container():
                st.markdown(f"""
                <div class="trans-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span class="lang-badge" style="background-color: #6366f1;">{lang_name}</span>
                    </div>
                    <div style="font-size: 1.25rem; font-weight: 600; color: #ffffff; line-height: 1.5; margin-bottom: 0.75rem;">
                        {trans_text}
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                # Text-to-Speech Audio Playback
                tts_success, audio_data, tts_msg = text_to_speech_bytes(trans_text, lang_name)
                if tts_success and audio_data:
                    st.audio(audio_data, format="audio/mp3")
                else:
                    st.caption(f"Audio playback: {tts_msg}")
                    
                st.markdown("<br>", unsafe_allow_html=True)
                
    else:
        st.info("🎙️ Speak into your microphone or type a sentence on the left to view real-time context-aware translations.")


# Conversation History Section
st.markdown("---")
st.subheader("📜 Session Conversation History (Context Memory)")

if st.session_state.history:
    for idx, turn in enumerate(reversed(st.session_state.history), start=1):
        with st.expander(f"Turn #{len(st.session_state.history) - idx + 1}: \"{turn.get('user_speech')}\" ({turn.get('detected_language')})"):
            st.markdown(f"**Original Input:** {turn.get('user_speech')}")
            st.markdown(f"**Detected Language:** `{turn.get('detected_language')}`")
            if turn.get("context_notes"):
                st.markdown(f"**Context Applied:** *{turn.get('context_notes')}*")
            st.markdown("**Translations:**")
            for l_name, t_text in turn.get("translations", {}).items():
                st.markdown(f"- **{l_name}:** {t_text}")
else:
    st.caption("No messages recorded in current session. Conversation context will appear here as you translate.")
