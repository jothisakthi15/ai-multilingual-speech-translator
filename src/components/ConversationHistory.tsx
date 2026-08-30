import React from "react";
import { TranslationTurn } from "../types";
import { Clock, Brain, Trash2 } from "lucide-react";

interface ConversationHistoryProps {
  history: TranslationTurn[];
  onClearHistory: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  history,
  onClearHistory,
}) => {
  if (history.length === 0) {
    return (
      <div className="bg-[#131C31]/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
        <Clock className="w-5 h-5 mx-auto mb-2 text-slate-600" />
        <p>No conversation history in this session. Prior spoken turns will be recorded here to maintain conversational context memory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Session Context Timeline ({history.length} Turns)
          </h3>
        </div>
        <button
          id="btn-clear-history-timeline"
          onClick={onClearHistory}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Context</span>
        </button>
      </div>

      <div className="space-y-3">
        {history.map((turn, index) => (
          <div
            key={turn.id}
            id={`history-turn-${turn.id}`}
            className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-5 space-y-3 transition-all hover:border-blue-500/40 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                  #{history.length - index}
                </span>
                <span className="text-xs font-bold text-blue-400">
                  Detected: {turn.detected_language}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{turn.timestamp}</span>
            </div>

            {/* Spoken input */}
            <div className="text-sm font-semibold text-slate-100 pl-3 border-l-2 border-blue-500 italic">
              "{turn.user_speech}"
            </div>

            {/* Context resolution note */}
            {turn.context_notes && (
              <div className="text-[11px] text-blue-200 bg-blue-950/40 border border-blue-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>{turn.context_notes}</span>
              </div>
            )}

            {/* Translations summary chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(turn.translations).map(([lang, trans]) => (
                <div
                  key={lang}
                  className="bg-[#0F172A] border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-300 flex items-center gap-1.5 max-w-full truncate"
                >
                  <strong className="text-blue-400">{lang}:</strong>
                  <span className="truncate">{trans}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
