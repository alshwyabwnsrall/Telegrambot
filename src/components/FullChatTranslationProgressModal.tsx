import React from 'react';
import { Languages, RotateCw, XCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext.js';

export const FullChatTranslationProgressModal: React.FC = () => {
  const { batchProgress, cancelFullChatTranslation } = useTranslation();

  if (!batchProgress.isTranslating && !batchProgress.statusText) return null;

  return (
    <div
      dir="rtl"
      className="px-4 py-2.5 bg-gradient-to-r from-sky-900/90 via-slate-900/95 to-sky-900/90 border-b border-sky-500/30 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-30 transition-all duration-200"
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
          {batchProgress.isTranslating ? (
            <RotateCw className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">مترجم المحادثات الفوري (AI Translator)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300">
              {batchProgress.percent}%
            </span>
          </div>
          <div className="text-[11px] text-slate-300 truncate">
            {batchProgress.statusText}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {/* Progress bar */}
        <div className="w-32 sm:w-44 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60 shrink-0">
          <div
            className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${batchProgress.percent}%` }}
          />
        </div>

        {/* Cancel button */}
        {batchProgress.isTranslating && (
          <button
            onClick={cancelFullChatTranslation}
            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>إيقاف</span>
          </button>
        )}
      </div>
    </div>
  );
};
