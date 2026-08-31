import React from "react";
import { Mic, Languages, Sparkles, FolderCode } from "lucide-react";

interface HeaderProps {
  historyCount: number;
  onOpenProjectExplorer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ historyCount, onOpenProjectExplorer }) => {
  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-blue-500/20">
          <Mic className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent leading-none">
            AI Multilingual Speech Translator
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-1">
            Speak in any language • Context-aware multi-turn translation
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onOpenProjectExplorer && (
          <button
            id="btn-project-explorer"
            onClick={onOpenProjectExplorer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-xl text-xs font-semibold text-blue-400 hover:text-blue-300 transition-all cursor-pointer shadow-sm"
          >
            <FolderCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Project Source & API</span>
            <span className="sm:hidden">Code</span>
          </button>
        )}

        {historyCount > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-300">
            <Languages className="w-3.5 h-3.5 text-blue-400" />
            <span>{historyCount} Turns in Session</span>
          </div>
        )}

        {/* Gemini Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full">
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          <span className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Gemini 3.7 Flash
          </span>
        </div>
      </div>
    </header>
  );
};


