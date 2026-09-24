import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  CreditCard,
  Sparkles,
  Zap,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Star,
  QrCode,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const PaymentsView: React.FC = () => {
  const { transactions, createPayment, copyToClipboard } = useTelegram();

  const [activeGateway, setActiveGateway] = useState<'stars' | 'ton' | 'crypto' | 'stripe'>('stars');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'vip'>('pro');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('250');
  const [creating, setCreating] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  const plans = [
    {
      id: 'pro',
      name: 'Telegram AI Pro',
      price: '$12',
      stars: '500 Stars',
      ton: '2.5 TON',
      period: 'شهريًا',
      features: [
        'AI Reply & Summarize غير محدود',
        'مراقبة حتى 25 كلمة مفتاحية حية',
        'AI Channel Finder فائق السرعة',
        'تصدير المحادثات والرسائل بجميع الصيغ (TXT, CSV, JSON)',
        'بحث دلالي ذكي عبر Gemini 2.5 Flash',
      ],
      popular: true,
    },
    {
      id: 'vip',
      name: 'Trader & Signals Elite',
      price: '$29',
      stars: '1,200 Stars',
      ton: '6.0 TON',
      period: 'شهريًا',
      features: [
        'كل مميزات باقة Pro السابقة',
        'تنبيهات فورية لصفقات الذهب والعملات (XAUUSD, BTC)',
        'استخراج الصفقات والأهداف ووقف الخسارة تلقائيًا',
        'مراقبة قنوات غير محدودة مع تنبيهات صوتية',
        'دعم فني خاص وتحليل فني للرسائل عبر Gemini',
      ],
      popular: false,
    },
  ];

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text, label);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleCheckout = async (planId: 'pro' | 'vip', method: string) => {
    setCreating(true);
    const plan = plans.find((p) => p.id === planId)!;
    const amount = method === 'stars' ? (planId === 'pro' ? 500 : 1200) : (planId === 'pro' ? 12 : 29);
    const currency = method === 'stars' ? 'XTR' : method === 'ton' ? 'TON' : 'USD';

    const inv = await createPayment(amount, currency, method, plan.name);
    if (inv) {
      setActiveInvoice(inv);
      setShowInvoiceModal(true);
    }
    setCreating(false);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 text-slate-100 p-6 sm:p-8 space-y-8" dir="rtl">
      {/* Invoice Modal */}
      {showInvoiceModal && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">فاتورة الدفع</h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
              <div className="text-xs text-slate-400 font-mono">معرف الطلب: #{activeInvoice.id.slice(0, 10)}</div>
              <div className="text-2xl font-bold text-sky-400 font-mono" dir="ltr">
                {activeInvoice.amount} {activeInvoice.currency}
              </div>
              <div className="text-xs text-slate-300 font-semibold">{activeInvoice.description}</div>
            </div>

            {/* Method instructions */}
            {activeInvoice.method === 'stars' && (
              <div className="space-y-3 text-xs text-slate-300">
                <p>
                  يتم الدفع بواسطة <span className="font-bold text-amber-400">Telegram Stars (نجوم تيليجرام)</span> مباشرة من خلال حسابك الموثق.
                </p>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span>انقر على الرابط لإتمام الدفع بواسطة تيليجرام الرسمي:</span>
                </div>
                <a
                  href={`https://t.me/PremiumBot?start=stars_${activeInvoice.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <span>الدفع عبر نجوم تيليجرام</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {activeInvoice.method === 'ton' && (
              <div className="space-y-3 text-xs text-slate-300">
                <p>حول المبلغ المطلوب إلى عنوان محفظة TON Network أدناه:</p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs text-left" dir="ltr">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">TON Wallet Address:</div>
                  <div className="break-all text-sky-300">EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N</div>
                  <button
                    onClick={() => handleCopy('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', 'TON Wallet')}
                    className="mt-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedAddress ? 'تم النسخ!' : 'نسخ عنوان المحفظة'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeInvoice.method === 'crypto' && (
              <div className="space-y-3 text-xs text-slate-300">
                <p>حول المبلغ عبر شبكة USDT (TRC-20) إلى المحفظة المعتمدة:</p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs text-left" dir="ltr">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">USDT TRC20 Address:</div>
                  <div className="break-all text-emerald-400">TX7a93KLW8P1VmnmQRtxY321Uo9ZbN3XbM</div>
                  <button
                    onClick={() => handleCopy('TX7a93KLW8P1VmnmQRtxY321Uo9ZbN3XbM', 'USDT Address')}
                    className="mt-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedAddress ? 'تم النسخ!' : 'نسخ عنوان المحفظة'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeInvoice.method === 'stripe' && (
              <div className="space-y-3 text-xs text-slate-300">
                <p>بوابة الدفع الإلكتروني المعتمدة عبر Stripe الرسمية:</p>
                <a
                  href="https://buy.stripe.com/test_placeholder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <span>الانتقال للدفع عبر Stripe</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            <button
              onClick={() => setShowInvoiceModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              تم / إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">المدفوعات والاشتراكات</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            قسم الدفع والترقيات الموديلار (Telegram Stars, TON, Crypto, Stripe) غير مرتبط بتسجيل الدخول
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>بوابات دفع حقيقية دون حفظ بطاقات</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Gateway Selection Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveGateway('stars')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeGateway === 'stars'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-300" />
            <span>نجوم تيليجرام (Telegram Stars)</span>
          </button>

          <button
            onClick={() => setActiveGateway('ton')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeGateway === 'ton'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>شبكة TON</span>
          </button>

          <button
            onClick={() => setActiveGateway('crypto')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeGateway === 'crypto'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>العملات الرقمية (USDT TRC20)</span>
          </button>

          <button
            onClick={() => setActiveGateway('stripe')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeGateway === 'stripe'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Stripe الإلكتروني</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-6 sm:p-8 border transition-all flex flex-col justify-between ${
                  p.popular
                    ? 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-900 border-sky-500/50 shadow-xl shadow-sky-500/10'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    الأكثر طلباً
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white" dir="ltr">
                        {activeGateway === 'stars' ? p.stars : activeGateway === 'ton' ? p.ton : p.price}
                      </span>
                      <span className="text-xs text-slate-400">/{p.period}</span>
                    </div>
                  </div>

                  <div className="h-px bg-slate-800" />

                  {/* Feature list */}
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/80">
                  <button
                    disabled={creating}
                    onClick={() => handleCheckout(p.id as any, activeGateway)}
                    className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      p.popular
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <span>اشترك الآن بواسطة {activeGateway.toUpperCase()}</span>
                    <ArrowRight className="w-4 h-4 -scale-x-100" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transactions History */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">فواتير ومعاملات الدفع السابقة</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{transactions.length} سجلات</span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              لا توجد سجلات دفع مسجلة حتى الآن في مساحة العمل هذه.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{tx.planName || tx.description || 'باقة مساحة العمل'}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-sky-400">#{tx.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</span>
                      <span>•</span>
                      <span className="uppercase text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        {tx.provider || tx.method || 'payment'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left" dir="ltr">
                    <div className="font-mono font-bold text-white">
                      {tx.amount} {tx.currency}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        tx.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {tx.status === 'completed' ? 'مكتمل' : 'معلق'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
