import React from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  ClipboardList,
  Copy,
  Trash2,
  X,
  Check,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const ClipboardModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { clipboard, copyToClipboard, clearClipboard } = useTelegram();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>سجل الحافظة</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                  {clipboard.length} عناصر
                </span>
              </h2>
              <p className="text-xs text-slate-400">سجل النصوص المنسوخة مؤخرًا للوصول السريع وإعادة الاستخدام</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {clipboard.length > 0 && (
              <button
                onClick={clearClipboard}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="مسح سجل الحافظة بالكامل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {clipboard.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <ClipboardList className="w-8 h-8 mx-auto text-slate-600" />
              <p>لا توجد نصوص منسوخة في سجل الحافظة حتى الآن.</p>
            </div>
          ) : (
            clipboard.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500" dir="ltr">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.copiedAt).toLocaleTimeString()}</span>
                    {item.sourceChat && (
                      <span className="text-sky-400 flex items-center gap-1 truncate" dir="rtl">
                        <MessageSquare className="w-3 h-3" />
                        {safeString(item.sourceChat)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-200 line-clamp-3 whitespace-pre-wrap font-sans text-right">
                    {item.text}
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(item.text, item.sourceChat)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 mt-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ مجدداً</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
