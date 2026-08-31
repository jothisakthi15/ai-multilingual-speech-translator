"""
Audio Recognizer (Speech-to-Text) Web Application
Backend: Python + Flask + Google GenAI SDK (gemini-2.5-flash)
Frontend: HTML5 + JavaScript (MediaRecorder API)

Zero native audio hardware libraries (No pyaudio, no speech_recognition).
Fully compatible with Vercel, Cloud Run, Render, AWS, and serverless runtimes.
"""

import os
import io
import json
import base64
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)


def get_genai_client():
    """Initializes and returns the Google GenAI client using the environment GEMINI_API_KEY."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set. "
            "Please set GEMINI_API_KEY in your environment or .env file."
        )
    return genai.Client(api_key=api_key)


# Frontend UI Template (HTML + Vanilla JavaScript using MediaRecorder API)
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Audio Recognizer - Speech-to-Text with Gemini</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    textarea, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">

  <main class="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
    <!-- Header -->
    <header class="text-center space-y-2">
      <div class="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
        <span>🎙️</span> Gemini 2.5 Flash Speech Recognizer
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold text-white">
        Audio Recognizer (Speech-to-Text)
      </h1>
      <p class="text-xs sm:text-sm text-slate-400">
        Record audio in the browser via MediaRecorder API and transcribe with Gemini 2.5 Flash on the Python backend.
      </p>
    </header>

    <!-- Recording Controls Card -->
    <section class="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div id="recording-pulse" class="w-3.5 h-3.5 rounded-full bg-slate-700 transition-colors"></div>
          <span id="recording-status" class="text-sm font-medium text-slate-300">Ready to record</span>
        </div>
        <span id="timer-display" class="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">00:00</span>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          id="btn-start"
          type="button"
          class="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          <span>Start Recording</span>
        </button>

        <button
          id="btn-stop"
          type="button"
          disabled
          class="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          <span>Stop & Transcribe</span>
        </button>
      </div>

      <!-- Audio Player Preview -->
      <div id="audio-preview-wrap" class="hidden pt-2 border-t border-slate-800">
        <label class="text-xs text-slate-400 block mb-1.5 font-medium">Recorded Audio Playback:</label>
        <audio id="audio-player" controls class="w-full h-9 rounded-lg"></audio>
      </div>
    </section>

    <!-- Loading Spinner -->
    <div id="loading-box" class="hidden flex items-center justify-center gap-3 p-4 bg-blue-950/40 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
      <svg class="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Recognizing speech with Gemini 2.5 Flash on `/api/recognize`...</span>
    </div>

    <!-- Transcription Result Display Area -->
    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="transcript-result" class="text-xs font-bold uppercase tracking-wider text-slate-400">
          Transcription Result:
        </label>
        <button
          id="btn-copy"
          type="button"
          class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          <span id="copy-status">Copy Text</span>
        </button>
      </div>
      <textarea
        id="transcript-result"
        rows="6"
        readonly
        placeholder="Your transcribed text will appear here after recording..."
        class="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed resize-y"
      ></textarea>
    </section>

    <!-- Footer API Info -->
    <footer class="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
      Backend Endpoint: <code class="text-blue-400">POST /api/recognize</code> • Model: <code class="text-indigo-400">gemini-2.5-flash</code> • 100% Cloud-Compatible
    </footer>
  </main>

  <script>
    let mediaRecorder = null;
    let audioChunks = [];
    let timerInterval = null;
    let startTime = 0;

    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnCopy = document.getElementById('btn-copy');
    const copyStatus = document.getElementById('copy-status');
    const recordingPulse = document.getElementById('recording-pulse');
    const recordingStatus = document.getElementById('recording-status');
    const timerDisplay = document.getElementById('timer-display');
    const audioPreviewWrap = document.getElementById('audio-preview-wrap');
    const audioPlayer = document.getElementById('audio-player');
    const loadingBox = document.getElementById('loading-box');
    const transcriptResult = document.getElementById('transcript-result');

    // Choose supported MIME type (prefer audio/webm)
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }

    // 1. Start Recording Button
    btnStart.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop mic stream tracks
          stream.getTracks().forEach(track => track.stop());

          // Build audio blob
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

          // Playback preview
          const audioUrl = URL.createObjectURL(audioBlob);
          audioPlayer.src = audioUrl;
          audioPreviewWrap.classList.remove('hidden');

          // Send to Python backend endpoint /api/recognize
          await sendAudioToRecognize(audioBlob);
        };

        mediaRecorder.start(250);

        // UI state: Recording
        btnStart.disabled = true;
        btnStop.disabled = false;
        recordingStatus.textContent = "Recording microphone audio...";
        recordingStatus.className = "text-sm font-bold text-rose-400";
        recordingPulse.className = "w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping";

        startTime = Date.now();
        timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
          const secs = String(elapsed % 60).padStart(2, '0');
          timerDisplay.textContent = `${mins}:${secs}`;
        }, 500);

      } catch (err) {
        alert("Microphone Access Error: " + err.message);
        console.error(err);
      }
    });

    // 2. Stop & Transcribe Button
    btnStop.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      clearInterval(timerInterval);
      btnStart.disabled = false;
      btnStop.disabled = true;
      recordingStatus.textContent = "Processing audio...";
      recordingStatus.className = "text-sm font-medium text-blue-400";
      recordingPulse.className = "w-3.5 h-3.5 rounded-full bg-blue-500";
    });

    // 3. Send audio Blob to Backend POST /api/recognize
    async function sendAudioToRecognize(blob) {
      loadingBox.classList.remove('hidden');
      transcriptResult.value = "Transcribing with Gemini 2.5 Flash...";

      try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('mime_type', 'audio/webm');

        const response = await fetch('/api/recognize', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        loadingBox.classList.add('hidden');

        if (response.ok && (data.transcript !== undefined || data.text !== undefined)) {
          const resultText = data.transcript || data.text || "";
          transcriptResult.value = resultText || "(No speech detected in audio)";
          recordingStatus.textContent = "Transcription completed successfully";
          recordingStatus.className = "text-sm font-semibold text-emerald-400";
          recordingPulse.className = "w-3.5 h-3.5 rounded-full bg-emerald-500";
        } else {
          transcriptResult.value = "Error: " + (data.error || "Failed to transcribe audio.");
          recordingStatus.textContent = "Transcription failed";
          recordingStatus.className = "text-sm font-semibold text-rose-400";
          recordingPulse.className = "w-3.5 h-3.5 rounded-full bg-rose-500";
        }
      } catch (err) {
        loadingBox.classList.add('hidden');
        transcriptResult.value = "Network / Request Error: " + err.message;
        recordingStatus.textContent = "Network error";
        recordingStatus.className = "text-sm font-semibold text-rose-400";
        recordingPulse.className = "w-3.5 h-3.5 rounded-full bg-rose-500";
        console.error(err);
      }
    }

    // Copy to clipboard
    btnCopy.addEventListener('click', () => {
      if (!transcriptResult.value) return;
      navigator.clipboard.writeText(transcriptResult.value).then(() => {
        copyStatus.textContent = "Copied!";
        setTimeout(() => { copyStatus.textContent = "Copy Text"; }, 2000);
      });
    });
  </script>
</body>
</html>
"""


@app.route("/", methods=["GET"])
def index():
    """Serves the standalone browser audio recording and recognition UI."""
    return render_template_string(HTML_TEMPLATE)


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "online",
        "service": "Audio Recognizer API",
        "model": "gemini-2.5-flash",
        "endpoint": "/api/recognize",
        "cloud_compatible": True
    })


@app.route("/api/recognize", methods=["POST"])
def recognize_audio():
    """
    POST /api/recognize
    Accepts browser-recorded audio (audio/webm) and transcribes using gemini-2.5-flash.
    
    Reads incoming audio bytes, packages them using types.Part.from_bytes(data=audio_bytes, mime_type='audio/webm'),
    and queries Gemini with: "Transcribe the exact spoken words from this audio. Return only the transcription."
    
    Returns JSON: {"transcript": response.text}
    """
    try:
        audio_bytes = None
        mime_type = "audio/webm"

        # 1. Extract audio bytes from multipart/form-data
        if "audio" in request.files:
            file = request.files["audio"]
            audio_bytes = file.read()
            mime_type = request.form.get("mime_type") or file.content_type or "audio/webm"
        elif "file" in request.files:
            file = request.files["file"]
            audio_bytes = file.read()
            mime_type = request.form.get("mime_type") or file.content_type or "audio/webm"

        # 2. Extract audio bytes from JSON base64
        elif request.is_json:
            json_data = request.get_json()
            raw_base64 = json_data.get("audioData") or json_data.get("audio") or json_data.get("audio_bytes")
            if raw_base64:
                if "," in raw_base64:
                    raw_base64 = raw_base64.split(",", 1)[1]
                audio_bytes = base64.b64decode(raw_base64)
                mime_type = json_data.get("mimeType") or json_data.get("mime_type") or "audio/webm"

        # 3. Extract raw binary body
        elif request.data and len(request.data) > 0:
            audio_bytes = request.data
            mime_type = request.content_type or "audio/webm"

        if not audio_bytes or len(audio_bytes) == 0:
            return jsonify({
                "error": "No audio payload received. Please send audio via POST request to /api/recognize."
            }), 400

        # Clean MIME type
        clean_mime_type = mime_type.split(";")[0].strip()
        if not clean_mime_type.startswith("audio/"):
            clean_mime_type = "audio/webm"

        # Initialize Google GenAI client
        client = get_genai_client()

        # Build audio Part from bytes
        audio_part = types.Part.from_bytes(
            data=audio_bytes,
            mime_type=clean_mime_type
        )

        prompt_text = "Transcribe the exact spoken words from this audio. Return only the transcription."

        # Generate content with Gemini 2.5 Flash
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[audio_part, prompt_text],
        )

        transcript_text = response.text.strip() if response.text else ""

        return jsonify({
            "transcript": transcript_text,
            "success": True
        })

    except Exception as e:
        app.logger.error(f"Error in /api/recognize: {str(e)}")
        return jsonify({
            "error": f"Audio recognition failed: {str(e)}",
            "success": False
        }), 500


# Alias route for backwards compatibility with process-audio
@app.route("/api/process-audio", methods=["POST"])
def process_audio_alias():
    return recognize_audio()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
