import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  Bell,
  Plus,
  Trash2,
  Radio,
  Clock,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const KeywordMonitorView: React.FC = () => {
  const {
    keywords,
    alerts,
    addKeyword,
    removeKeyword,
    markAlertsAsRead,
    selectChat,
    setActiveTab,
  } = useTelegram();

  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim()) return;
    addKeyword(newKeyword.trim());
    setNewKeyword('');
  };

  const presetKeywords = ['ذهب', 'تداول', 'عملات', 'XAUUSD', 'Bitcoin', 'Forex', 'توصيات', 'ETH'];

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-100" dir="rtl">
      {/* Right Sidebar in RTL: Monitored Keywords List */}
      <div className="w-80 border-l border-slate-800 bg-[#0b141a]/95 flex flex-col p-4 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white">رصد الكلمات المفتاحية</h2>
          </div>
          <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">
            {keywords.length} نشطة
          </span>
        </div>

        {/* Add keyword form */}
        <form onSubmit={handleAdd} className="flex gap-1.5">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="أضف كلمة (مثل: ذهب، توصية)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500 transition-colors text-right"
          />
          <button
            type="submit"
            className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl cursor-pointer shadow-sm transition-colors"
            title="إضافة كلمة جديدة"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Preset quick adds */}
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">كلمات شائعة مقترحة:</div>
          <div className="flex flex-wrap gap-1">
            {presetKeywords.map((pk) => {
              const isAdded = keywords.some((k) => k.keyword.toLowerCase() === pk.toLowerCase());
              return (
                <button
                  key={pk}
                  disabled={isAdded}
                  onClick={() => addKeyword(pk)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                    isAdded
                      ? 'bg-slate-800 text-slate-600 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  +{pk}
                </button>
              );
            })}
          </div>
        </div>

        {/* Keywords list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {keywords.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              لا توجد كلمات مرصودة حتى الآن. أضف كلمات لتصلك تنبيهات فورية عند ورودها في المحادثات.
            </div>
          ) : (
            keywords.map((kw) => (
              <div
                key={kw.id}
                className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-sky-300 truncate font-mono">
                    #{kw.keyword}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>تم رصد {kw.matchCount || 0} تطابق</span>
                  </div>
                </div>

                <button
                  onClick={() => removeKeyword(kw.id)}
                  title="حذف الكلمة"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: Live Alerts Feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>تنبيهات الكلمات المفتاحية المباشرة</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </h1>
            <span className="text-xs text-slate-400">
              ({alerts.length} تنبيه وارد)
            </span>
          </div>

          {alerts.length > 0 && (
            <button
              onClick={markAlertsAsRead}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">في انتظار ورود رسائل تحتوي على كلماتك المرصودة</p>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  عند وصول أي رسالة جديدة في محادثاتك أو قنواتك أو مجموعاتك على تيليجرام تتطابق مع الكلمات المحددة، ستظهر هنا فورياً في الوقت الفعلي.
                </p>
              </div>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                  alert.read
                    ? 'bg-slate-900/60 border-slate-800/80'
                    : 'bg-sky-950/20 border-sky-500/30 shadow-lg shadow-sky-500/5'
                }`}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 font-mono font-bold text-xs border border-sky-500/30">
                      #{alert.keyword}
                    </span>
                    <span className="text-slate-400">في</span>
                    <span className="font-semibold text-white">{safeString(alert.chatTitle)}</span>
                    <span className="text-slate-500">بواسطة {safeString(alert.senderName)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[11px]" dir="ltr">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(alert.date * 1000).toLocaleString()}</span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-right">
                  {alert.messageText}
                </div>

                {/* Actions */}
                <div className="flex justify-start pt-1">
                  <button
                    onClick={() => {
                      selectChat(alert.chatId);
                      setActiveTab('chats');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>الانتقال للمحادثة</span>
                    <Radio className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
