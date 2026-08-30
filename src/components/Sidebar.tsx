import React from "react";
import { ALL_SUPPORTED_LANGUAGES } from "../types";
import { Trash2, Check, Sparkles, SlidersHorizontal, Info } from "lucide-react";

interface SidebarProps {
  selectedLanguages: string[];
  onToggleLanguage: (langName: string) => void;
  onSelectAll: () => void;
  onClearLanguages: () => void;
  historyCount: number;
  onClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedLanguages,
  onToggleLanguage,
  onSelectAll,
  onClearLanguages,
  historyCount,
  onClearHistory,
}) => {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0 bg-[#131C31] border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col gap-6">
      {/* Target Languages Multi-select */}
      <section className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Target Languages ({selectedLanguages.length})
          </label>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              id="btn-select-all-langs"
              onClick={onSelectAll}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              All
            </button>
            <span className="text-slate-600">|</span>
            <button
              id="btn-clear-langs"
              onClick={onClearLanguages}
              className="text-slate-400 hover:text-slate-300"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Selected Languages Quick Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedLanguages.slice(0, 6).map((langName) => (
            <span
              key={langName}
              className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 text-xs font-medium"
            >
              {langName}
            </span>
          ))}
          {selectedLanguages.length > 6 && (
            <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 text-xs font-medium">
              +{selectedLanguages.length - 6} more
            </span>
          )}
        </div>

        {/* Scrollable Language Selector List */}
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar flex-1 border border-slate-800/80 rounded-xl p-2 bg-[#0F172A]/50">
          {ALL_SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.name);
            return (
              <button
                key={lang.name}
                id={`lang-btn-${lang.code}`}
                onClick={() => onToggleLanguage(lang.name)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-blue-600/20 border border-blue-500/40 text-blue-300 font-semibold"
                    : "bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">{lang.flag}</span>
                  <span className="truncate">{lang.name}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSelected ? "bg-blue-600 text-white" : "border border-slate-700"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Context Memory & Session Section */}
      <section className="space-y-3">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Session Memory
        </label>
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Context State</span>
            <span className="text-blue-400 font-semibold">
              {historyCount === 0 ? "Empty" : `${historyCount} Turns Active`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span>Resolves conversational flow</span>
          </div>
        </div>

        <button
          id="btn-clear-conversation-context"
          onClick={onClearHistory}
          disabled={historyCount === 0}
          className={`w-full py-3 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 border border-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            historyCount === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Session</span>
        </button>
      </section>

      {/* Technical Stack Pill */}
      <div className="border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span>Streamlit + Gemini 3.7 + gTTS</span>
      </div>
    </aside>
  );
};
