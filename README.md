# 🎙️ AI Multilingual Speech App
> **"Speak once. Understand everywhere."**

An AI-powered multilingual speech translation application that accepts spoken or written input, performs automatic language detection, translates into multiple target languages simultaneously with **conversational context memory**, and provides synchronized text-to-speech (TTS) audio playback.

Powered by **Google Gemini 3.7**, **Python**, **Streamlit**, and **Speech Recognition**.

---

## 🌟 Key Features

1. **🎙️ Speech & Voice Input**
   - Live microphone capture with automatic ambient noise cancellation.
   - Support for audio file uploads (`.wav`, `.mp3`, `.m4a`, `.ogg`).
   - Manual text typing fallback with real-time editing.

2. **🌐 Automatic Language Detection & Override**
   - Automatically detects the spoken language using Gemini and speech heuristics.
   - Allows manual selection to override the source language when needed.

3. **🌍 Multilingual Target Support (20+ Languages)**
   - Supports simultaneous translation to:
     - **Indian Languages**: Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi
     - **International Languages**: French, German, Spanish, Japanese, Chinese (Mandarin), Arabic, Russian, Portuguese, Italian, Korean, English

4. **🧠 Context-Aware AI Translation (Google Gemini)**
   - Preserves conversational context across consecutive sentences (e.g. *User 1:* "I went to the hospital yesterday." -> *User 2:* "My mother was with me." -> correctly binds *mother* to the hospital visit context).
   - Preserves colloquial tone, emotional nuance, and idioms.
   - Prevents incorrect literal translation of proper names and brand names.

5. **🔊 Text-to-Speech (TTS) Audio Playback**
   - High quality speech generation for each translated language card using Google TTS (`gTTS`).
   - In-app playback controls for each card.

6. **📜 Session History & Memory Management**
   - Real-time conversation context timeline.
   - One-click **"Clear Conversation Context"** button to reset conversational state.

7. **🛡️ Robust Error Handling**
   - Gracefully handles microphone permission issues, silence timeouts, invalid API keys, rate limits, and network errors without crashing.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **Python 3.10+** | Core programming language |
| **Google Gemini API** (`gemini-3.7-flash`) | Context-aware translation, reasoning, and NLP |
| **Streamlit** | Modern, reactive web application frontend |
| **SpeechRecognition / PyAudio** | Microphone input processing & audio decoding |
| **gTTS (Google Text-to-Speech)** | Multi-language voice synthesis |
| **python-dotenv** | Environment variable security & configuration |

---

## 📁 Project Structure

```text
ai-multilingual-speech-app/
│
├── app.py                     # Main Streamlit user interface and application workflow
├── requirements.txt           # Python dependencies list
├── .env.example               # Example environment variable template
├── .gitignore                 # Files excluded from git
├── README.md                  # Comprehensive documentation and setup guide
│
└── utils/
    ├── speech.py              # Microphone audio capture and Speech-to-Text conversion
    ├── translation.py         # Gemini API context-aware translation engine
    └── text_to_speech.py      # Multi-language TTS audio synthesis
```

---

## 🚀 Quickstart & Installation

### 1. Clone or Download the Repository
```bash
git clone https://github.com/your-username/ai-multilingual-speech-app.git
cd ai-multilingual-speech-app
```

### 2. Create and Activate a Virtual Environment
```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

> **Note for PyAudio on Linux/macOS:**
> If you encounter build issues with `PyAudio`, install system audio dependencies first:
> - **Ubuntu/Debian:** `sudo apt-get install portaudio19-dev python3-pyaudio`
> - **macOS (Homebrew):** `brew install portaudio`

---

## 🔑 Google Gemini API Configuration

1. Visit [Google AI Studio](https://aistudio.google.com/) and generate an API key.
2. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
3. Add your Gemini API key to `.env`:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```

---

## ▶️ Running the Application

Execute the following command in your terminal:
```bash
streamlit run app.py
```

The application will launch in your browser at `http://localhost:8501`.

---

## 💡 How Context-Aware Speech Translation Works

```text
[User Spoken Input]
         │
         ▼
[Speech-to-Text (SpeechRecognition / Gemini Multimodal)]
         │
         ▼
[Context Resolver Engine] ◄── [Session Conversation History Memory]
         │
         ▼
[Google Gemini 3.7 Flash Model]
  - Language Detection
  - Idiom & Nuance Preservation
  - Pronoun & Entity Disambiguation
         │
         ▼
[Multilingual Output Cards]
  ├── Tamil + Audio Synthesis (gTTS)
  ├── Hindi + Audio Synthesis (gTTS)
  ├── Telugu + Audio Synthesis (gTTS)
  ├── French + Audio Synthesis (gTTS)
  └── Spanish + Audio Synthesis (gTTS)
```

### Example Context Walkthrough

1. **Turn 1**: User says: *"I went to the hospital yesterday."*
   - Target languages translated accurately. History records the location and event.
2. **Turn 2**: User says: *"My mother was with me."*
   - Without context, a translator might translate ambiguously.
   - **With Gemini Context Memory**: The model recognizes that the mother was accompanying the speaker to the hospital, adjusting gender forms, honorifics, and relational terms appropriately in languages like Tamil, Telugu, and Hindi.

---

## ☁️ Deployment to Streamlit Community Cloud

1. Push your repository to **GitHub**.
2. Go to [share.streamlit.io](https://share.streamlit.io/) and log in with GitHub.
3. Click **"New App"** and select your repository and `app.py`.
4. Under **Advanced Settings > Secrets**, configure:
   ```toml
   GEMINI_API_KEY = "your_actual_gemini_api_key_here"
   ```
5. Click **Deploy!** Your app is live with zero server maintenance.

---

## 💼 Portfolio Highlights

This project demonstrates software engineering proficiency in:
- **Full-Stack Generative AI Integration**: Prompt engineering with structured JSON schema outputs.
- **Multimodal AI**: Combining audio perception, text generation, and speech synthesis.
- **Context Retention Algorithms**: Stateful conversational memory across interaction turns.
- **Production Code Architecture**: Separation of concerns between UI (`app.py`), speech I/O (`speech.py`), translation logic (`translation.py`), and audio synthesis (`text_to_speech.py`).
- **Defensive Error Handling**: Safe fallbacks and descriptive UI messaging.

---

## 📄 License
MIT License. Created with Google AI Studio & Gemini.
