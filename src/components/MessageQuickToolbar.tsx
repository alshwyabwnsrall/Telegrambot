import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { useTranslation } from '../context/TranslationContext.js';
import { TelegramMessage } from '../types/telegram.js';
import {
  Copy,
  Forward,
  Bookmark,
  Sparkles,
  Languages,
  FileText,
  Trash2,
  X,
  Check,
  Share2,
  FolderPlus,
  Download,
  CheckSquare,
  Zap,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const MessageQuickToolbar: React.FC<{
  onOpenAiDrawer?: (type: 'summarize' | 'translate' | 'extract' | 'reply', msg?: TelegramMessage) => void;
}> = ({ onOpenAiDrawer }) => {
  const {
    isMultiSelectMode,
    selectedMessageIds,
    clearSelection,
    selectAllMessages,
    messages,
    activeChat,
    selectedChatId,
    copyToClipboard,
    setForwardModalOpen,
    setMessagesToForward,
    deleteSelectedMessages,
    addBookmark,
    showNotification,
  } = useTelegram();

  const { translateSelectedMessages, batchProgress } = useTranslation();

  const [collectionInputOpen, setCollectionInputOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('Trading');
  const [showExportOptions, setShowExportOptions] = useState(false);

  if (!isMultiSelectMode || selectedMessageIds.length === 0) return null;

  const selectedMessages = messages.filter((m) => selectedMessageIds.includes(m.id));

  // Translate selected messages in-place
  const handleTranslateSelected = async () => {
    if (!selectedChatId) return;
    await translateSelectedMessages(selectedChatId, selectedMessages);
  };

  // Copy all selected text in order
  const handleCopyAll = () => {
    // preserve chronological order (ascending date)
    const sorted = [...selectedMessages].sort((a, b) => a.date - b.date);
    const combined = sorted
      .map((m) => {
        const time = new Date(m.date * 1000).toLocaleString();
        const sender = m.senderName || (m.out ? 'Me' : 'User');
        return `[${time}] ${sender}:\n${m.text || '[Media]'}`;
      })
      .join('\n\n---\n\n');

    copyToClipboard(combined, activeChat?.title);
  };

  // Copy only text payloads joined
  const handleCopyRawText = () => {
    const sorted = [...selectedMessages].sort((a, b) => a.date - b.date);
    const combined = sorted
      .map((m) => m.text)
      .filter(Boolean)
      .join('\n\n');
    copyToClipboard(combined, activeChat?.title);
  };

  // Forward selected
  const handleForwardSelected = () => {
    setMessagesToForward(selectedMessageIds);
    setForwardModalOpen(true);
  };

  // Bookmark selected
  const handleSaveSelected = async () => {
    for (const msg of selectedMessages) {
      await addBookmark(msg, collectionName);
    }
    setCollectionInputOpen(false);
  };

  // Export messages to file (TXT, CSV, JSON)
  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    const sorted = [...selectedMessages].sort((a, b) => a.date - b.date);
    let blob: Blob;
    let filename = `telegram_export_${Date.now()}.${format}`;

    if (format === 'json') {
      const data = sorted.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        sender: m.senderName || (m.out ? 'Me' : 'User'),
        date: new Date(m.date * 1000).toISOString(),
        text: m.text,
      }));
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    } else if (format === 'csv') {
      const headers = ['ID', 'Date', 'Sender', 'Text'];
      const rows = sorted.map((m) => [
        m.id,
        `"${new Date(m.date * 1000).toISOString()}"`,
        `"${(m.senderName || (m.out ? 'Me' : 'User')).replace(/"/g, '""')}"`,
        `"${(m.text || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } else {
      const textContent = sorted
        .map((m) => {
          const time = new Date(m.date * 1000).toLocaleString();
          const sender = m.senderName || (m.out ? 'Me' : 'User');
          return `----------------------------------------\nDate: ${time}\nSender: ${sender}\n\n${m.text || '[Media]'}\n`;
        })
        .join('\n');
      blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', `Exported ${sorted.length} message(s) as ${format.toUpperCase()}`);
    setShowExportOptions(false);
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2 max-w-2xl animate-fade-in text-xs text-white">
      {/* Selected Counter & Clear */}
      <div className="flex items-center gap-2 pl-3 border-l border-slate-700 font-medium">
        <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
          {selectedMessageIds.length}
        </span>
        <span className="hidden sm:inline text-slate-300">محددة</span>
        <button
          onClick={selectAllMessages}
          title="تحديد الكل"
          className="text-sky-400 hover:text-sky-300 mr-1 cursor-pointer"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={clearSelection}
          title="إلغاء التحديد"
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Copy Options */}
        <button
          onClick={handleCopyRawText}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          title="نسخ النصوص المحددة"
        >
          <Copy className="w-3.5 h-3.5 text-sky-400" />
          <span>نسخ</span>
        </button>

        {/* Forward */}
        <button
          onClick={handleForwardSelected}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          title="تحويل الرسائل المحددة"
        >
          <Forward className="w-3.5 h-3.5 text-blue-400" />
          <span>تحويل</span>
        </button>

        {/* Save / Bookmarks with Collection selector */}
        <div className="relative">
          <button
            onClick={() => setCollectionInputOpen(!collectionInputOpen)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="حفظ في المفضلة والمجموعات"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>حفظ</span>
          </button>

          {collectionInputOpen && (
            <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-700 p-3 rounded-2xl shadow-xl w-56 space-y-2 z-50 text-right" dir="rtl">
              <div className="text-[11px] font-semibold text-slate-400">اختر تصنيف الحفظ:</div>
              <select
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
              >
                <option value="المفضلة">⭐ المفضلة</option>
                <option value="التداول">📈 التداول / Trading</option>
                <option value="الذهب">🥇 الذهب / Gold</option>
                <option value="البرمجة">💻 البرمجة / Development</option>
                <option value="أفكار">💡 أفكار / Ideas</option>
                <option value="هام">🔥 هام / Important</option>
                <option value="روابط">🔗 روابط / Links</option>
              </select>
              <button
                onClick={handleSaveSelected}
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> حفظ المحدد
              </button>
            </div>
          )}
        </div>

        {/* Direct Translate Selected Messages */}
        <button
          onClick={handleTranslateSelected}
          disabled={batchProgress.isTranslating}
          className="px-2.5 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-sky-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          title="ترجمة الرسائل المحددة مباشرة أسفل كل رسالة"
        >
          <Languages className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold">ترجمة المحدد ({selectedMessageIds.length})</span>
        </button>

        {/* AI Summarize */}
        {onOpenAiDrawer && (
          <button
            onClick={() => onOpenAiDrawer('summarize')}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="تلخيص ذكي بواسطة Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>تلخيص AI</span>
          </button>
        )}

        {/* AI Translate */}
        {onOpenAiDrawer && (
          <button
            onClick={() => onOpenAiDrawer('translate')}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="ترجمة الرسائل بالذكاء الاصطناعي"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>ترجمة AI</span>
          </button>
        )}

        {/* AI Extract */}
        {onOpenAiDrawer && (
          <button
            onClick={() => onOpenAiDrawer('extract')}
            className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="استخراج الروابط والأرقام بالذكاء الاصطناعي"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>استخراج بيانات</span>
          </button>
        )}

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="تصدير الرسائل كملف"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>تصدير</span>
          </button>

          {showExportOptions && (
            <div className="absolute bottom-10 left-0 bg-slate-900 border border-slate-700 p-2 rounded-2xl shadow-xl w-44 space-y-1 z-50 text-right" dir="rtl">
              <button
                onClick={() => handleExport('txt')}
                className="w-full p-2 text-right hover:bg-slate-800 rounded-xl text-xs flex items-center justify-between cursor-pointer"
              >
                <span>نصي (.txt)</span>
                <span className="text-[10px] text-slate-500 font-mono">TXT</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full p-2 text-right hover:bg-slate-800 rounded-xl text-xs flex items-center justify-between cursor-pointer"
              >
                <span>جدول بيانات (.csv)</span>
                <span className="text-[10px] text-slate-500 font-mono">CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full p-2 text-right hover:bg-slate-800 rounded-xl text-xs flex items-center justify-between cursor-pointer"
              >
                <span>ملف بيانات (.json)</span>
                <span className="text-[10px] text-slate-500 font-mono">JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => {
            if (window.confirm(`حذف ${selectedMessageIds.length} رسالة لدى الجميع؟`)) {
              deleteSelectedMessages(true);
            }
          }}
          className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors mr-auto cursor-pointer"
          title="حذف الرسائل المحددة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
