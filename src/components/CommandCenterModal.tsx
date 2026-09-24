import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  Terminal,
  Sparkles,
  Send,
  X,
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Languages,
  Forward,
  Trash2,
  Bookmark,
  Search,
  Compass,
} from 'lucide-react';

export const CommandCenterModal: React.FC = () => {
  const {
    commandCenterOpen,
    setCommandCenterOpen,
    executeCommand,
    aiLoading,
    selectedMessageIds,
    messages,
    activeChat,
    copyToClipboard,
    forwardMessagesTo,
    deleteSelectedMessages,
    addBookmark,
    setActiveTab,
    setSearchQuery,
    showNotification,
  } = useTelegram();

  const [inputCommand, setInputCommand] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    prompt: string;
    action: () => Promise<void>;
  } | null>(null);

  if (!commandCenterOpen) return null;

  const handleRunCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = inputCommand.trim();
    if (!cmd) return;

    const result = await executeCommand(cmd);
    setLastResult(result);

    if (!result) return;

    if (result.isSensitive && result.confirmationPrompt) {
      // Prompt user confirmation before executing sensitive action
      if (result.intent === 'forward') {
        setPendingConfirmation({
          prompt: result.confirmationPrompt,
          action: async () => {
            const targetChat = result.parameters?.targetChat;
            if (targetChat) {
              await forwardMessagesTo(targetChat);
            } else {
              showNotification('info', 'الرجاء تحديد المحادثة المستهدفة للتحويل');
            }
          },
        });
      } else if (result.intent === 'delete') {
        setPendingConfirmation({
          prompt: result.confirmationPrompt,
          action: async () => {
            await deleteSelectedMessages(true);
          },
        });
      }
      return;
    }

    // Execute non-sensitive intents directly
    if (result.intent === 'copy') {
      if (selectedMessageIds.length > 0) {
        const selectedMsgs = messages
          .filter((m) => selectedMessageIds.includes(m.id))
          .map((m) => m.text)
          .join('\n\n');
        copyToClipboard(selectedMsgs, activeChat?.title);
      } else if (messages.length > 0) {
        copyToClipboard(messages[0].text, activeChat?.title);
      }
    } else if (result.intent === 'search') {
      const q = result.parameters?.searchQuery || cmd.replace(/ابحث عن|find/i, '').trim();
      setSearchQuery(q);
      setActiveTab('chats');
      setCommandCenterOpen(false);
    } else if (result.intent === 'find_channels') {
      setActiveTab('channel_finder');
      setCommandCenterOpen(false);
    } else if (result.intent === 'save') {
      if (selectedMessageIds.length > 0) {
        const msg = messages.find((m) => m.id === selectedMessageIds[0]);
        if (msg) addBookmark(msg, result.parameters?.category || 'Favorites');
      }
    }
  };

  const sampleCommands = [
    'طلع لي كل القنوات المتعلقة بالذهب والتداول',
    'لخص المحادثة الحالية',
    'انسخ آخر رسالة',
    'استخرج كل الروابط والأرقام',
    'ابحث عن XAUUSD في كل الرسائل',
    'حول الرسائل المحددة',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>مركز الأوامر الذكية</span>
                <span className="text-[10px] font-semibold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 flex items-center gap-1 font-sans">
                  <Sparkles className="w-2.5 h-2.5" /> ذكاء اصطناعي لغوي
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                اكتب أي أمر باللغة العربية أو الإنجليزية لتنفيذه بذكاء على بيانات تيليجرام الحقيقية
              </p>
            </div>
          </div>
          <button
            onClick={() => setCommandCenterOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sensitive Action Confirmation Prompt */}
        {pendingConfirmation && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/30 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-bold text-rose-300">تأكيد عملية حساسة</div>
              <p className="text-xs text-rose-200 mt-1">{pendingConfirmation.prompt}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    await pendingConfirmation.action();
                    setPendingConfirmation(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> تأكيد ومتابعة
                </button>
                <button
                  onClick={() => setPendingConfirmation(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleRunCommand} className="p-4 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              placeholder="اكتب أمرك هنا... (مثال: طلع لي كل القنوات المتعلقة بالذهب، أو لخص الرسائل المحددة)"
              className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-2xl py-3.5 pr-4 pl-12 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner text-right"
            />
            <button
              type="submit"
              disabled={aiLoading || !inputCommand.trim()}
              className="absolute left-2 top-2 p-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition-all shadow-md shadow-sky-600/30 cursor-pointer"
              title="تنفيذ الأمر"
            >
              {aiLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 -scale-x-100" />
              )}
            </button>
          </div>
        </form>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {lastResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> تفسير الذكاء الاصطناعي:
                </span>
                <span className="font-mono text-slate-500 uppercase" dir="ltr">{lastResult.intent}</span>
              </div>
              <p className="text-xs text-slate-300">{lastResult.explanation}</p>
            </div>
          )}

          {/* Quick Suggestions */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              أمثلة أوامر سريعة مقترحة:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sampleCommands.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputCommand(sc);
                  }}
                  className="p-3 text-right rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-sky-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:scale-125 transition-transform" />
                  <span className="flex-1 truncate">{sc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 px-5">
          <span>العمليات الحساسة (التحويل / الحذف) تخضع لتأكيد مسبق تلقائيًا.</span>
          <span className="font-sans">اضغط ESC للإغلاق</span>
        </div>
      </div>
    </div>
  );
};
