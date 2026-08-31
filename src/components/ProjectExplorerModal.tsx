import React, { useState } from "react";
import { FolderCode, Terminal, Download, Copy, Check, ExternalLink, Play, Server, Layers, FileCode } from "lucide-react";

export const ProjectExplorerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"quickstart" | "app_py" | "requirements" | "vercel" | "curl">("quickstart");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const appPyCode = `import os
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
app = Flask(__name__)
CORS(app)

def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return genai.Client(api_key=api_key)

@app.route("/api/recognize", methods=["POST"])
def recognize_audio():
    try:
        audio_bytes = None
        if "audio" in request.files:
            audio_bytes = request.files["audio"].read()
        elif request.data:
            audio_bytes = request.data

        if not audio_bytes:
            return jsonify({"error": "No audio payload received"}), 400

        client = get_genai_client()
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type="audio/webm")
        prompt = "Transcribe the exact spoken words from this audio. Return only the transcription."

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[audio_part, prompt],
        )

        return jsonify({"transcript": response.text.strip() if response.text else "", "success": True})
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)`;

  const requirementsTxt = `flask>=3.0.0
flask-cors>=4.0.0
google-genai>=0.1.1
python-dotenv>=1.0.1`;

  const vercelJson = `{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}`;

  const curlExample = `# Test the /api/recognize endpoint with any webm audio recording:
curl -X POST https://your-domain.com/api/recognize \\
  -H "Content-Type: multipart/form-data" \\
  -F "audio=@recording.webm;type=audio/webm"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FolderCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Project Code & Architecture Viewer
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-medium border border-emerald-500/30">
                  Ready to Export
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                View files, test endpoints, or copy the pure-Python & React codebase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-slate-950/50 border-b border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-all ${
              activeTab === "quickstart"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Quickstart (Run Locally)</span>
          </button>

          <button
            onClick={() => setActiveTab("app_py")}
            className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-all ${
              activeTab === "app_py"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>app.py (Flask Backend)</span>
          </button>

          <button
            onClick={() => setActiveTab("requirements")}
            className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-all ${
              activeTab === "requirements"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>requirements.txt</span>
          </button>

          <button
            onClick={() => setActiveTab("vercel")}
            className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-all ${
              activeTab === "vercel"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>vercel.json</span>
          </button>

          <button
            onClick={() => setActiveTab("curl")}
            className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-all ${
              activeTab === "curl"
                ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>cURL / API Test</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans text-sm text-slate-300">
          {activeTab === "quickstart" && (
            <div className="space-y-4">
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-4 text-xs text-blue-300 space-y-1.5">
                <p className="font-semibold text-blue-200 text-sm">💡 Standalone Project Overview</p>
                <p>This project uses <strong>pure Python</strong> (<code className="text-white bg-slate-900 px-1 py-0.5 rounded">flask</code>, <code className="text-white bg-slate-900 px-1 py-0.5 rounded">google-genai</code>) with zero C-dependencies (no PyAudio / speech_recognition). It runs anywhere instantly.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">1. Clone / Create Directory & Install:</h4>
                <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400">
                  <pre>{`pip install -r requirements.txt`}</pre>
                  <button
                    onClick={() => copyToClipboard("pip install -r requirements.txt", "step1")}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded bg-slate-900 border border-slate-700"
                  >
                    {copiedKey === "step1" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">2. Configure Gemini API Key (.env):</h4>
                <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400">
                  <pre>{`echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env`}</pre>
                  <button
                    onClick={() => copyToClipboard('echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env', "step2")}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded bg-slate-900 border border-slate-700"
                  >
                    {copiedKey === "step2" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">3. Run the App:</h4>
                <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400">
                  <pre>{`python app.py`}</pre>
                  <button
                    onClick={() => copyToClipboard("python app.py", "step3")}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded bg-slate-900 border border-slate-700"
                  >
                    {copiedKey === "step3" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "app_py" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">app.py (Flask Audio Recognizer & Gemini API)</span>
                <button
                  onClick={() => copyToClipboard(appPyCode, "app_py")}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {copiedKey === "app_py" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "app_py" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto max-h-[350px]">
                {appPyCode}
              </pre>
            </div>
          )}

          {activeTab === "requirements" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">requirements.txt</span>
                <button
                  onClick={() => copyToClipboard(requirementsTxt, "reqs")}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {copiedKey === "reqs" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "reqs" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400">
                {requirementsTxt}
              </pre>
            </div>
          )}

          {activeTab === "vercel" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">vercel.json (Serverless Configuration)</span>
                <button
                  onClick={() => copyToClipboard(vercelJson, "vercel")}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {copiedKey === "vercel" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "vercel" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-purple-300">
                {vercelJson}
              </pre>
            </div>
          )}

          {activeTab === "curl" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">cURL API Testing Example</span>
                <button
                  onClick={() => copyToClipboard(curlExample, "curl")}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {copiedKey === "curl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "curl" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-300 overflow-x-auto">
                {curlExample}
              </pre>
            </div>
          )}
        </div>

        {/* Footer info & Export Guide */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>📦 To download entire project:</span>
            <span className="text-slate-300 font-medium">Use AI Studio Settings Menu ➔ "Export to ZIP"</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
