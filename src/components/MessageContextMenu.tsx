import React, { useState } from 'react';
import {
  CornerUpLeft,
  Copy,
  Scissors,
  Forward,
  Languages,
  Pin,
  Bookmark,
  Sparkles,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { TelegramMessage, TelegramDialog } from '../types/telegram.js';
import { safeString } from '../utils/safeRender.js';

interface MessageContextMenuProps {
  msg: TelegramMessage | null;
  activeChat: TelegramDialog | null;
  isOpen: boolean;
  onClose: () => void;
  onReply: (msg: TelegramMessage) => void;
  onCopy: (text: string, title?: string) => void;
  onForward: (id: number) => void;
  onBookmark: (msg: TelegramMessage) => void;
  onTranslateSingle: (msg: TelegramMessage) => void;
  onOpenAiAssistant: (msg: TelegramMessage) => void;
  onPin: (msg: TelegramMessage) => void;
  onDelete: (msg: TelegramMessage) => void;
  onReact: (msg: TelegramMessage, emoji: string) => void;
  onOpenPartialCopy: (text: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '👏', '😢', '🎉', '🚀', '🤔', '💯'];

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  msg,
  activeChat,
  isOpen,
  onClose,
  onReply,
  onCopy,
  onForward,
  onBookmark,
  onTranslateSingle,
  onOpenAiAssistant,
  onPin,
  onDelete,
  onReact,
  onOpenPartialCopy,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen || !msg) return null;

  const isOut = Boolean(msg.out);

  const handleCopy = () => {
    if (msg.text) {
      onCopy(msg.text, activeChat?.title);
      setCopiedNotification(true);
      setTimeout(() => {
        setCopiedNotification(false);
        onClose();
      }, 500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-sm flex flex-col gap-3.5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Reactions Bar */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(msg, emoji);
                onClose();
              }}
              className="text-2xl p-1.5 hover:scale-135 active:scale-95 hover:bg-slate-800/80 rounded-xl transition-all duration-150 cursor-pointer select-none"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Message Preview Mini Card */}
        <div
          className={`p-3.5 rounded-2xl shadow-lg border max-h-32 overflow-hidden text-ellipsis ${
            isOut
              ? 'bg-sky-600/90 border-sky-500/50 text-white'
              : 'bg-[#182533]/95 border-slate-700 text-slate-100'
          }`}
        >
          {msg.senderName && !isOut && (
            <div className="text-xs font-bold text-sky-300 mb-1">
              {safeString(msg.senderName)}
            </div>
          )}
          <p className="text-xs line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {msg.text || (msg.media ? '📁 وسائط متعددة' : '')}
          </p>
        </div>

        {/* Action Items List Sheet */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden divide-y divide-slate-800/60">
          {/* Reply */}
          <button
            onClick={() => {
              onReply(msg);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <CornerUpLeft className="w-4 h-4" />
            </div>
            <span>رد على الرسالة</span>
          </button>

          {/* Copy Full */}
          {msg.text && (
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                {copiedNotification ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </div>
              <span>{copiedNotification ? 'تم النسخ!' : 'نسخ النص بالكامل'}</span>
            </button>
          )}

          {/* Partial Select & Copy */}
          {msg.text && (
            <button
              onClick={() => {
                onOpenPartialCopy(msg.text || '');
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Scissors className="w-4 h-4" />
              </div>
              <span>تحديد ونسخ جزء محدد</span>
            </button>
          )}

          {/* Forward */}
          <button
            onClick={() => {
              onForward(msg.id);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <Forward className="w-4 h-4" />
            </div>
            <span>إعادة توجيه</span>
          </button>

          {/* Translate Single */}
          {msg.text && (
            <button
              onClick={() => {
                onTranslateSingle(msg);
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Languages className="w-4 h-4" />
              </div>
              <span>ترجمة فورية</span>
            </button>
          )}

          {/* AI Assistant */}
          <button
            onClick={() => {
              onOpenAiAssistant(msg);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>مساعد الذكاء الاصطناعي</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => {
              onBookmark(msg);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <span>حفظ في الرسائل المحفوظة</span>
          </button>

          {/* Pin */}
          <button
            onClick={() => {
              onPin(msg);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <Pin className="w-4 h-4" />
            </div>
            <span>تثبيت في المحادثة</span>
          </button>

          {/* Delete Message */}
          <button
            onClick={() => {
              onDelete(msg);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <span>حذف الرسالة</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-2xl font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          <span>إلغاء</span>
        </button>
      </div>
    </div>
  );
};
