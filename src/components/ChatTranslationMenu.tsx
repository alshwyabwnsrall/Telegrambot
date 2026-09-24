import React, { useState, useRef, useEffect } from 'react';
import {
  Languages,
  Check,
  ChevronDown,
  Sparkles,
  Zap,
  Bot,
  Eye,
  Trash2,
  X,
  Globe,
} from 'lucide-react';
import { useTranslation, SUPPORTED_LANGUAGES, LanguageOption } from '../context/TranslationContext.js';
import { TelegramMessage } from '../types/telegram.js';

interface ChatTranslationMenuProps {
  chatId: string;
  chatTitle: string;
  messages: TelegramMessage[];
}

export const ChatTranslationMenu: React.FC<ChatTranslationMenuProps> = ({
  chatId,
  chatTitle,
  messages,
}) => {
  const {
    getChatConfig,
    updateChatConfig,
    translateFullChat,
    clearChatTranslations,
    batchProgress,
  } = useTranslation();

  const config = getChatConfig(chatId);
  const [isOpen, setIsOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsLangDropdownOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === config.targetLanguage) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (lang: LanguageOption) => {
    updateChatConfig(chatId, { targetLanguage: lang.code });
    setIsLangDropdownOpen(false);
  };

  const handleStartFullChatTranslate = () => {
    setIsOpen(false);
    translateFullChat(chatId, messages, config.targetLanguage);
  };

  const handleToggleAutoTranslate = () => {
    updateChatConfig(chatId, { autoTranslateNew: !config.autoTranslateNew });
  };

  const handleToggleShowOriginal = () => {
    updateChatConfig(chatId, { showOriginal: !config.showOriginal });
  };

  const handleClear = () => {
    clearChatTranslations(chatId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Translation Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="ترجمة المحادثة والرسائل (Chat & Message Translation)"
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
          config.autoTranslateNew || config.enabled
            ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 hover:bg-sky-500/25'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
        }`}
      >
        <Languages className="w-4 h-4 text-sky-400" />
        <span className="hidden md:inline font-semibold">ترجمة</span>
        <span className="text-[11px] opacity-80 hidden lg:inline">
          {selectedLangObj.flag}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />

        {/* Active badge indicator */}
        {config.autoTranslateNew && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">ترجمة المحادثة بالذكاء الاصطناعي</h4>
                <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{chatTitle}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Target Language Selection */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              لغة الهدف (Target Language):
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/90 border border-slate-700 hover:border-slate-600 rounded-xl text-xs text-white cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{selectedLangObj.flag}</span>
                  <span className="font-medium">{selectedLangObj.name}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Languages List */}
              {isLangDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-800/50">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-sky-500/20 cursor-pointer text-right ${
                        lang.code === config.targetLanguage
                          ? 'bg-sky-500/10 text-sky-400 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                      {lang.code === config.targetLanguage && <Check className="w-4 h-4 text-sky-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action 1: Full Chat Translation */}
          <div className="space-y-2 mb-3">
            <button
              onClick={handleStartFullChatTranslate}
              disabled={batchProgress.isTranslating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>ترجمة المحادثة كاملة ({messages.length} رسالة)</span>
            </button>

            {/* Toggle: Auto-translate incoming new messages */}
            <button
              onClick={handleToggleAutoTranslate}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                config.autoTranslateNew
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className={`w-4 h-4 ${config.autoTranslateNew ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div className="text-right">
                  <div className="font-semibold text-[11px]">ترجمة الرسائل الجديدة تلقائيًا</div>
                  <div className="text-[10px] text-slate-400">تترجم أي رسالة واردة فور وصولها</div>
                </div>
              </div>
              <div
                className={`w-8 h-4 rounded-full transition-colors relative ${
                  config.autoTranslateNew ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                    config.autoTranslateNew ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </div>
            </button>

            {/* Toggle: Show original text along with translation */}
            <button
              onClick={handleToggleShowOriginal}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-800 bg-slate-800/40 text-xs text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px]">إظهار الترجمة مع النص الأصلي</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full transition-colors relative ${
                  config.showOriginal ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                    config.showOriginal ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Footer Action: Clear Cache */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">بدون تعديل رسائل Telegram</span>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>مسح الترجمات</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
