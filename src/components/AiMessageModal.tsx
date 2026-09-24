import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { TelegramMessage } from '../types/telegram.js';
import {
  Sparkles,
  X,
  FileText,
  Languages,
  Wand2,
  Copy,
  Send,
  HelpCircle,
  Hash,
  Link,
  Mail,
  Phone,
  User,
  Calendar,
  Check,
  RefreshCw,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

interface AiMessageModalProps {
  message: TelegramMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onInsertReply?: (text: string) => void;
}

type TabType = 'reply' | 'summarize' | 'translate' | 'rewrite' | 'extract' | 'explain';

export const AiMessageModal: React.FC<AiMessageModalProps> = ({
  message,
  isOpen,
  onClose,
  onInsertReply,
}) => {
  const {
    aiReply,
    summarizeMessage,
    translateMessage,
    rewriteMessage,
    extractEntities,
    explainMessage,
    aiLoading,
    copyToClipboard,
  } = useTelegram();

  const [activeTab, setActiveTab] = useState<TabType>('reply');
  const [resultText, setResultText] = useState<string>('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [tone, setTone] = useState<'brief' | 'official' | 'friendly' | 'professional'>('brief');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [targetLang, setTargetLang] = useState<string>('ar');
  const [rewriteStyle, setRewriteStyle] = useState<'official' | 'friendly' | 'concise' | 'persuasive'>('official');

  if (!isOpen || !message) return null;

  const msgText = message.text || '';

  const handleCopy = (text: string) => {
    copyToClipboard(text, message.senderName || 'AI Tool');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runReply = async () => {
    const res = await aiReply(msgText, tone, language);
    if (res) setResultText(res);
  };

  const runSummarize = async () => {
    const res = await summarizeMessage(msgText);
    if (res) setResultText(res);
  };

  const runTranslate = async () => {
    const res = await translateMessage(msgText, targetLang);
    if (res) setResultText(res);
  };

  const runRewrite = async () => {
    const res = await rewriteMessage(msgText, rewriteStyle);
    if (res) setResultText(res);
  };

  const runExtract = async () => {
    const res = await extractEntities(msgText);
    if (res) {
      setExtractedData(res);
      setResultText('');
    }
  };

  const runExplain = async () => {
    const res = await explainMessage(msgText);
    if (res) setResultText(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>مساعد الذكاء الاصطناعي للرسائل</span>
                <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 font-mono">
                  Gemini Flash
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {safeString(message.senderName || 'رسالة تيليجرام')} • المعرف #{message.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Message Preview */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80" dir="rtl">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">نص الرسالة الأصلية:</div>
          <div className="text-xs text-slate-300 max-h-20 overflow-y-auto whitespace-pre-wrap font-sans bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-right">
            {msgText || '(لا يوجد نص في الرسالة)'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 overflow-x-auto text-xs" dir="rtl">
          <button
            onClick={() => {
              setActiveTab('reply');
              setResultText('');
              setExtractedData(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'reply' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>الرد الذكي</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('summarize');
              setResultText('');
              setExtractedData(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'summarize' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>تلخيص</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('translate');
              setResultText('');
              setExtractedData(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'translate' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>ترجمة</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('rewrite');
              setResultText('');
              setExtractedData(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'rewrite' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>إعادة صياغة</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('extract');
              setResultText('');
              setExtractedData(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'extract' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>استخراج البيانات</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('explain');
              setResultText('');
              setExtractedData(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'explain' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>شرح وتوضيح</span>
          </button>
        </div>

        {/* Tab Controls & Output */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" dir="rtl">
          {/* AI Reply tab controls */}
          {activeTab === 'reply' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">أسلوب ونبرة الرد:</label>
                  <select
                    value={tone}
                    onChange={(e: any) => setTone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="brief">مختصر ومباشر</option>
                    <option value="official">رسمي وفصيح</option>
                    <option value="professional">مهني واحترافي</option>
                    <option value="friendly">ودي ولطيف</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">لغة الرد:</label>
                  <select
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="ar">اللغة العربية</option>
                    <option value="en">English (الإنجليزية)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={runReply}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>توليد الرد بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Summarize tab controls */}
          {activeTab === 'summarize' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                تلخيص محتوى الرسالة بذكاء في نقاط موجزة ومفيدة تركز على النقاط الجوهرية.
              </p>
              <button
                onClick={runSummarize}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>بدء التلخيص الآن</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Translate tab controls */}
          {activeTab === 'translate' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">اللغة المستهدفة للترجمة:</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="ar">اللغة العربية</option>
                  <option value="en">English (الإنجليزية)</option>
                  <option value="fr">الفرنسية (French)</option>
                  <option value="tr">التركية (Turkish)</option>
                  <option value="ru">الروسية (Russian)</option>
                  <option value="de">الألمانية (German)</option>
                </select>
              </div>
              <button
                onClick={runTranslate}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    <span>ترجمة الرسالة الآن</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Rewrite tab controls */}
          {activeTab === 'rewrite' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">أسلوب الصياغة المطلوب:</label>
                <select
                  value={rewriteStyle}
                  onChange={(e: any) => setRewriteStyle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="official">رسمي وفصيح واحترافي</option>
                  <option value="friendly">ودي وجذاب ولطيف</option>
                  <option value="concise">موجز ومكثف بدون حشو</option>
                  <option value="persuasive">إقناعي وتسويقي مؤثر</option>
                </select>
              </div>
              <button
                onClick={runRewrite}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>إعادة صياغة الرسالة</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Extract Entities */}
          {activeTab === 'extract' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                استخراج فوري للروابط، الأرقام الهاتفية، الإيميلات، المعرفات، والتواريخ من الرسالة.
              </p>
              <button
                onClick={runExtract}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Hash className="w-4 h-4" />
                    <span>استخراج جميع البيانات الآن</span>
                  </>
                )}
              </button>

              {extractedData && (
                <div className="space-y-2 pt-2">
                  {extractedData.links?.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5" />
                        <span>الروابط المكتشفة ({extractedData.links.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {extractedData.links.map((link: string, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                            <span className="truncate underline text-sky-400 font-mono" dir="ltr">{link}</span>
                            <button
                              onClick={() => handleCopy(link)}
                              className="p-1 hover:text-white text-slate-400 cursor-pointer"
                              title="نسخ الرابط"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.usernames?.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>معرفات تيليجرام:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5" dir="ltr">
                        {extractedData.usernames.map((u: string, i: number) => (
                          <span
                            key={i}
                            onClick={() => handleCopy(u)}
                            className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono cursor-pointer hover:bg-indigo-500/20"
                            title="انقر للنسخ"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.emails?.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>عناوين البريد الإلكتروني:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5" dir="ltr">
                        {extractedData.emails.map((e: string, i: number) => (
                          <span
                            key={i}
                            onClick={() => handleCopy(e)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono cursor-pointer hover:bg-emerald-500/20"
                            title="انقر للنسخ"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.phoneNumbers?.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>أرقام الهواتف:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5" dir="ltr">
                        {extractedData.phoneNumbers.map((ph: string, i: number) => (
                          <span
                            key={i}
                            onClick={() => handleCopy(ph)}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono cursor-pointer hover:bg-amber-500/20"
                            title="انقر للنسخ"
                          >
                            {ph}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Explain Tab */}
          {activeTab === 'explain' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                شرح وتوضيح المصطلحات الصعبة، الصفقات، التحليلات أو الرسائل الغامضة بلغة واضحة ومبسطة.
              </p>
              <button
                onClick={runExplain}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4" />
                    <span>شرح وتحليل الرسالة</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* AI Output Window */}
          {resultText && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>النتيجة المنفذة بالذكاء الاصطناعي:</span>
                </span>
                <button
                  onClick={() => handleCopy(resultText)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed font-sans max-h-48 overflow-y-auto text-right">
                {resultText}
              </div>

              {activeTab === 'reply' && onInsertReply && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      onInsertReply(resultText);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إدراج في خانة الرد</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
