import React, { useState, useEffect } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  QrCode,
  Lock,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const ConnectTelegramView: React.FC = () => {
  const {
    status,
    startQrLogin,
    submit2FA,
  } = useTelegram();

  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [submitting2fa, setSubmitting2fa] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);

  // Automatically start QR login on mount only if NO saved session exists and not currently connecting
  useEffect(() => {
    if (
      !status?.isAuthenticated &&
      !status?.sessionExists &&
      !status?.isConnecting &&
      !status?.qrState?.active &&
      !status?.qrState?.qrUrl
    ) {
      startQrLogin();
    }
  }, [
    status?.isAuthenticated,
    status?.sessionExists,
    status?.isConnecting,
    status?.qrState?.active,
    status?.qrState?.qrUrl,
    startQrLogin,
  ]);

  // QR expiration countdown timer & auto-refresh
  useEffect(() => {
    if (status?.qrState?.expiresAt && !status?.sessionExists) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((status.qrState!.expiresAt! - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining === 0 && !status.qrState?.requires2fa) {
          // Auto refresh QR when expired
          startQrLogin(true);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [status?.qrState?.expiresAt, status?.qrState?.requires2fa, status?.sessionExists, startQrLogin]);

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaPassword) return;
    setSubmitting2fa(true);
    await submit2FA(twoFaPassword);
    setSubmitting2fa(false);
  };

  const is2FA = Boolean(status?.qrState?.requires2fa);

  return (
    <div className="min-h-screen w-screen bg-[#0b141a] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Subtle Telegram Ambient Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden z-10 flex flex-col">
        {/* Header Branding */}
        <div className="pt-8 pb-4 px-8 text-center flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#24A1DE] to-[#0088cc] flex items-center justify-center shadow-xl shadow-sky-500/25 ring-4 ring-sky-500/20">
            <svg className="w-9 h-9 text-white translate-x-[-1px] translate-y-[1px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span>تسجيل الدخول إلى تيليجرام</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ربط الحساب عبر مسح الرمز من تطبيق تيليجرام على الهاتف
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-8 pb-8 pt-2 flex flex-col items-center">
          {status?.sessionExists && (status?.isConnecting || !status?.qrState?.qrUrl) ? (
            /* Restoring Session View */
            <div className="w-full max-w-sm py-8 space-y-5 animate-fade-in text-center" dir="rtl">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/10">
                <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">جاري استعادة جلسة تيليجرام...</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  تم العثور على جلسة محفوظة مسبقاً. جاري إعادة الاتصال الآمن بخوادم Telegram واستعادة المحادثات تلقائياً...
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => startQrLogin(true)}
                  className="px-4 py-2.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
                >
                  مسح رمز QR جديد بدلاً من ذلك
                </button>
              </div>
            </div>
          ) : is2FA ? (
            /* 2FA Password Screen */
            <div className="w-full max-w-sm py-4 space-y-5 animate-fade-in text-center" dir="rtl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Lock className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">التحقق بخطوتين (2FA)</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  حسابك محمي بكلمة مرور التحقق بخطوتين. أدخل كلمة المرور السحابية لتأكيد الربط.
                </p>
                {status?.qrState?.hint && (
                  <div className="mt-2.5 text-xs text-sky-300 font-mono bg-sky-950/60 py-1.5 px-3 rounded-xl inline-block border border-sky-800/60">
                    تلميح: {status.qrState.hint}
                  </div>
                )}
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-3 text-right">
                <input
                  type="password"
                  value={twoFaPassword}
                  onChange={(e) => setTwoFaPassword(e.target.value)}
                  placeholder="كلمة المرور السحابية لتيليجرام"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-sm font-medium text-right"
                />

                <button
                  type="submit"
                  disabled={submitting2fa || !twoFaPassword}
                  className="w-full py-3 bg-[#24A1DE] hover:bg-[#0088cc] disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting2fa ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <span>تأكيد وتسجيل الدخول</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* QR CODE LOGIN ONLY */
            <div className="w-full flex flex-col items-center space-y-6">
              {/* QR Code Container */}
              <div className="relative group p-4 bg-white rounded-3xl shadow-2xl shadow-sky-950/50 border-4 border-slate-800/80 transition-transform duration-300">
                {status?.qrState?.qrUrl ? (
                  <div className="relative flex items-center justify-center">
                    <img
                      src={status.qrState.qrUrl}
                      alt="رمز الاستجابة السريعة لتيليجرام"
                      className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl"
                    />

                    {/* Central Telegram Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-2xl bg-[#24A1DE] shadow-xl flex items-center justify-center border-4 border-white">
                        <svg className="w-8 h-8 text-white translate-x-[-1px] translate-y-[1px]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 sm:w-72 sm:h-72 flex flex-col items-center justify-center bg-slate-100 rounded-xl text-slate-600 gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
                    <span className="text-xs font-semibold text-slate-700 font-sans">جاري إنشاء رمز QR لتيليجرام...</span>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 shadow-inner" dir="rtl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                </span>
                <span className="font-medium">في انتظار مسح الرمز...</span>
                <span className="text-slate-500 font-mono text-[11px]" dir="ltr">({countdown}s)</span>
                <button
                  onClick={() => startQrLogin()}
                  title="تحديث الرمز"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer mr-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 text-xs text-right" dir="rtl">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    1
                  </div>
                  <div className="text-slate-300 leading-relaxed">
                    افتح تطبيق <strong className="text-white">Telegram</strong> في هاتفك المحمول.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    2
                  </div>
                  <div className="text-slate-300 leading-relaxed">
                    انتقل إلى <strong className="text-white">الإعدادات (Settings)</strong> ← <strong className="text-white">الأجهزة (Devices)</strong> ← <strong className="text-sky-400">ربط جهاز بالحاسوب (Link Desktop Device)</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    3
                  </div>
                  <div className="text-slate-300 leading-relaxed">
                    اختر <strong className="text-white">Scan QR Code</strong> ووجّه كاميرا الهاتف نحو هذا الرمز للمصادقة الفورية.
                  </div>
                </div>
              </div>

              {/* Security and Session Footnote */}
              <div className="flex items-center justify-between w-full text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>اتصال آمن ومباشر بخوادم MTProto</span>
                </span>
                <span className="font-mono">Telegram MTProto 2.0</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
