import React, { useState } from 'react';
import {
  Languages,
  Copy,
  Check,
  RotateCw,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { MessageTranslation } from '../types/telegram.js';

interface MessageTranslationBlockProps {
  translation?: MessageTranslation;
  isOut: boolean;
  onRetry: () => void;
  showOriginal?: boolean;
}

export const MessageTranslationBlock: React.FC<MessageTranslationBlockProps> = ({
  translation,
  isOut,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!translation) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!translation.translatedText) return;
    try {
      await navigator.clipboard.writeText(translation.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (translation.status === 'loading') {
    return (
      <div
        className={`mt-2 pt-2 border-t rounded-xl p-2.5 flex items-center gap-2.5 text-xs animate-pulse ${
          isOut
            ? 'border-sky-500/30 bg-sky-700/30 text-sky-200'
            : 'border-slate-700/50 bg-slate-900/50 text-slate-300'
        }`}
      >
        <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
        <span className="font-medium text-[11px]">جاري الترجمة بواسطة AI إلى {translation.targetLanguage}...</span>
      </div>
    );
  }

  if (translation.status === 'error') {
    return (
      <div
        className={`mt-2 pt-2 border-t rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs ${
          isOut
            ? 'border-red-500/30 bg-red-950/40 text-red-200'
            : 'border-red-500/30 bg-red-950/40 text-red-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-[11px] truncate">{translation.error || 'تعذر إتمام الترجمة'}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1"
        >
          <RotateCw className="w-3 h-3" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div
      className={`mt-2.5 pt-2 border-t transition-all ${
        isOut
          ? 'border-sky-400/25 bg-sky-700/20 rounded-xl p-2.5'
          : 'border-slate-700/60 bg-slate-900/60 rounded-xl p-2.5'
      }`}
    >
      {/* Header bar of translation */}
      <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-sky-400">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span className="bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded-md border border-sky-500/20">
            {translation.targetLanguage}
          </span>
          {translation.detectedSourceLanguage && translation.detectedSourceLanguage !== 'Auto' && (
            <span className="text-slate-400 text-[10px]">
              (من {translation.detectedSourceLanguage})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="نسخ النص المترجم"
            className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            title={isCollapsed ? 'إظهار الترجمة' : 'إخفاء الترجمة'}
            className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Translated Body */}
      {!isCollapsed && (
        <p
          dir="auto"
          className="text-xs sm:text-[13px] leading-relaxed select-text font-normal whitespace-pre-wrap break-words text-slate-100"
        >
          {translation.translatedText}
        </p>
      )}
    </div>
  );
};
