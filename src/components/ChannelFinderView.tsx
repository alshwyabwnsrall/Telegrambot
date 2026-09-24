import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { AiChannelMatch } from '../types/telegram.js';
import {
  Compass,
  Sparkles,
  Search,
  Radio,
  Users,
  ArrowRight,
  Hash,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const ChannelFinderView: React.FC = () => {
  const { findChannelsAi, aiLoading, selectChat, setActiveTab, dialogs } = useTelegram();

  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<AiChannelMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;
    if (targetQuery) setQuery(targetQuery);

    const results = await findChannelsAi(q);
    setMatches(results);
    setHasSearched(true);
  };

  const samplePrompts = [
    'طلع لي كل القنوات المتعلقة بالذهب والتداول والعملات',
    'أريد مجموعات البرمجة وتطوير التطبيقات',
    'أظهر لي قنوات الأخبار والتحليلات الاقتصادية',
    'قنوات الفوركس والصفقات اليومية',
    'مجموعات العملات المشفرة والبيتكوين',
  ];

  const totalChannelsCount = dialogs.filter((d) => d.isChannel || d.isGroup).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-[#0b141a]/95">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>مكتشف القنوات بالذكاء الاصطناعي</span>
                  <span className="text-xs font-semibold bg-sky-500/10 text-sky-400 px-2.5 py-0.5 rounded-full border border-sky-500/20 flex items-center gap-1 font-sans">
                    <Sparkles className="w-3 h-3" /> بيانات MTProto حقيقية
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  تصنيف وبحث دلالي ذكي داخل القنوات والمجموعات المتاحة لحسابك على تيليجرام
                </p>
              </div>
            </div>

            <div className="text-left hidden sm:block">
              <span className="text-xs text-slate-400">إجمالي القنوات والمجموعات:</span>
              <div className="text-sm font-bold text-sky-400 font-mono">{totalChannelsCount} قناة ومجموعة</div>
            </div>
          </div>

          {/* Search Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اكتب ما تبحث عنه باللغة العربية... (مثلاً: طلع لي كل القنوات المتعلقة بالذهب والتداول، أو مجموعات البرمجة)"
              className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-2xl pr-12 pl-32 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner text-right"
            />
            <button
              type="submit"
              disabled={aiLoading || !query.trim()}
              className="absolute left-2 top-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center gap-1.5"
            >
              {aiLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>بحث ذكي</span>
                </>
              )}
            </button>
          </form>

          {/* Suggested queries */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 text-[11px] font-medium">اقتراحات سريعة:</span>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(p)}
                className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {aiLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">جاري فحص وتصنيف القنوات والمجموعات بواسطة Gemini AI...</p>
            </div>
          ) : hasSearched && matches.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">لم يتم العثور على قنوات مطابقة لهذا الوصف</p>
              <p className="text-xs text-slate-500">جرب صياغة أخرى أو كلمات مفتاحية عامة مثل "تداول", "ذهب", "برمجة".</p>
            </div>
          ) : !hasSearched ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/20">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">ابحث عن القنوات والمجموعات بذكاء</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  يقوم الذكاء الاصطناعي بتحليل أسماء ومواضيع قنوات حسابك وتصنيفها وربطها بالموضوع الذي تبحث عنه مباشرة.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between px-1">
                <span>نتائج المطابقة ({matches.length} قناة/مجموعة):</span>
                <span>مرتبة حسب درجة التطابق الموضوعي</span>
              </div>

              {matches.map((item) => {
                const dialog = dialogs.find((d) => d.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-sky-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                            dialog?.isChannel ? 'bg-indigo-600' : 'bg-emerald-600'
                          }`}
                        >
                          {dialog?.isChannel ? <Radio className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white truncate">
                              {safeString(item.title)}
                            </h3>
                            {dialog?.username && (
                              <span className="text-xs text-sky-400 font-mono">@{dialog.username}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{dialog?.isChannel ? 'قناة (Channel)' : 'مجموعة (Group)'}</span>
                            {dialog?.unreadCount ? (
                              <span className="text-emerald-400 font-semibold">
                                • {dialog.unreadCount} رسالة غير مقروءة
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* AI Reason */}
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                        <span className="text-sky-400 font-semibold">سبب المطابقة: </span>
                        {item.reason}
                      </p>

                      {/* Matched Keywords Tags */}
                      {item.matchedKeywords && item.matchedKeywords.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {item.matchedKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Score & Open Button */}
                    <div className="flex sm:flex-col items-center sm:items-start justify-between gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">المطابقة</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          {Math.round(item.matchScore)}%
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          selectChat(item.id);
                          setActiveTab('chats');
                        }}
                        className="px-4 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
                      >
                        <span>فتح القناة</span>
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
