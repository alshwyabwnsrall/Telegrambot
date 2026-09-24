import React, { useEffect } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { TelegramAuthStatus } from '../types/telegram.js';
import { safeString } from '../utils/safeRender.js';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  Radio,
  Clock,
  UserCheck,
  MessageSquare,
  Users,
  Megaphone,
  User,
  LogOut,
  RefreshCw,
  Server,
  Activity,
  HardDrive,
  Wifi,
  Sparkles,
  Award,
  Bookmark,
  Bell,
  Compass,
  Terminal,
  CreditCard,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';

function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'غير معروف';
  return new Date(timestamp).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DashboardView: React.FC = () => {
  const {
    status,
    dialogs,
    contacts,
    sessions,
    loadingSessions,
    fetchSessions,
    logout,
    wsConnected,
    refreshStatus,
    bookmarks,
    keywords,
    alerts,
    clipboard,
    setActiveTab,
    setCommandCenterOpen,
    setClipboardModalOpen,
  } = useTelegram();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const user = status?.user;
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'مستخدم تيليجرام'
    : 'مستخدم تيليجرام';

  const directCount = dialogs.filter((d) => d.isUser).length;
  const groupCount = dialogs.filter((d) => d.isGroup).length;
  const channelCount = dialogs.filter((d) => d.isChannel).length;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950/60 p-6 sm:p-8 space-y-8" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>لوحة تحكم مساحة عمل تيليجرام الذكية</span>
            {user?.premium && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm font-sans">
                <Sparkles className="w-3 h-3" /> بريميوم
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة متكاملة لبيانات حساب تيليجرام الحقيقية، أدوات الذكاء الاصطناعي، المراقبة الحية والجلسات النشطة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refreshStatus();
              fetchSessions();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin text-sky-400' : ''}`} />
            <span>تحديث ومزامنة البيانات</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* AI Workspace Quick Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AI Channel Finder */}
        <div
          onClick={() => setActiveTab('channels')}
          className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                مكتشف القنوات بالذكاء الاصطناعي
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                بحث وتصنيف دلالي ذكي داخل قنوات ومجموعات الحساب باللغة العربية
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs text-sky-400 font-semibold">
            <span>{channelCount + groupCount} قناة ومجموعة متاحة</span>
            <Compass className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Keywords Monitor */}
        <div
          onClick={() => setActiveTab('keywords')}
          className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                رصد الكلمات المفتاحية
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                تنبيهات فورية عند وصول رسائل تحتوي كلمات محددة (ذهب، تداول، عملات)
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs text-indigo-400 font-semibold">
            <span>{keywords.length} كلمة مرصودة ({alerts.length} تنبيه وارد)</span>
            <Bell className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Bookmarks */}
        <div
          onClick={() => setActiveTab('bookmarks')}
          className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                الرسائل المحفوظة والتصنيفات
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                حفظ الرسائل المهمة في مجموعات مخصصة وتصديرها بـ (TXT, CSV, JSON)
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>{bookmarks.length} رسالة محفوظة</span>
            <Bookmark className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* AI Command Center */}
        <div
          onClick={() => setCommandCenterOpen(true)}
          className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                مركز الأوامر الذكية
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                تنفيذ أوامر ذكية باللغة الطبيعية (بحث، تحويل، مراقبة، تصدير)
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>فتح موجه الأوامر</span>
            <Terminal className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>

      {/* Account Details Card & Connection State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-sky-600/20">
                {user?.id && (
                  <img
                    src={`/api/telegram/avatar/${user.id}`}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <span>{fullName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center" />
            </div>

            <div className="space-y-1 text-right">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{fullName}</span>
                {user?.verified && <Award className="w-4 h-4 text-sky-400" />}
              </h3>
              {user?.username && (
                <div className="text-xs font-mono text-sky-400" dir="ltr">@{safeString(user.username)}</div>
              )}
              {user?.phone && (
                <div className="text-xs font-mono text-slate-400" dir="ltr">📱 {safeString(user.phone)}</div>
              )}
              <div className="text-xs text-slate-500 font-mono">معرف المستخدم: {safeString(user?.id, '—')}</div>
            </div>
          </div>

          {/* Quick specs pill grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium">مركز بيانات MTProto</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {status?.dcId ? `DC ${status.dcId}` : 'DC الرئيسي'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium">تخزين الجلسة</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" /> دائم ومستمر
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium">جسر WebSocket</div>
              <div className="text-sm font-bold text-sky-400 mt-0.5 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> {wsConnected ? 'مباشر فوري' : 'استقصاء'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium">محرك الذكاء الاصطناعي</div>
              <div className="text-sm font-bold text-indigo-400 mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Gemini 2.5 Flash
              </div>
            </div>
          </div>
        </div>

        {/* Real Stats Overview */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>إحصائيات الحساب المباشرة</span>
          </h4>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>إجمالي المحادثات</span>
              </div>
              <span className="text-sm font-bold text-white font-mono">{dialogs.length}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <User className="w-4 h-4 text-emerald-400" />
                <span>المحادثات الخاصة</span>
              </div>
              <span className="text-sm font-bold text-white font-mono">{directCount}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>المجموعات</span>
              </div>
              <span className="text-sm font-bold text-white font-mono">{groupCount}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Megaphone className="w-4 h-4 text-purple-400" />
                <span>القنوات</span>
              </div>
              <span className="text-sm font-bold text-white font-mono">{channelCount}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ClipboardList className="w-4 h-4 text-pink-400" />
                <span>سجل الحافظة</span>
              </div>
              <button
                onClick={() => setClipboardModalOpen(true)}
                className="text-xs font-bold text-sky-400 font-mono hover:underline cursor-pointer"
              >
                {clipboard.length} عناصر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Telegram Authorized Sessions / Devices */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Laptop className="w-5 h-5 text-sky-400" />
              <span>الأجهزة والجلسات النشطة في تيليجرام</span>
            </h3>
            <p className="text-xs text-slate-400">
              قائمة بجميع الأجهزة النشطة المرتبطة بحسابك في تيليجرام (مسترجعة عبر Telegram API الرسمية)
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {sessions.length} جهاز متصل
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingSessions && sessions.length === 0 ? (
            <div className="col-span-2 p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500 mx-auto" />
              <p className="text-xs text-slate-400">جاري استرجاع الجلسات النشطة من خوادم تيليجرام...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="col-span-2 p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-500">
              لم يتم تحميل جلسات بعد. انقر فوق زر التحديث أعلاه.
            </div>
          ) : (
            sessions.map((session, index) => {
              const isLaptop =
                session.platform?.toLowerCase().includes('windows') ||
                session.platform?.toLowerCase().includes('mac') ||
                session.platform?.toLowerCase().includes('linux') ||
                session.platform?.toLowerCase().includes('web');

              return (
                <div
                  key={session.hash || index}
                  className={`p-5 rounded-2xl border transition-all ${
                    session.current
                      ? 'bg-sky-950/30 border-sky-500/40 shadow-lg shadow-sky-950/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-3 rounded-2xl shrink-0 ${
                          session.current
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isLaptop ? <Laptop className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">
                            {session.deviceModel || session.appName}
                          </h4>
                          {session.current && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              الجلسة الحالية (هذا التطبيق)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400">
                          {session.appName} {session.appVersion} • {session.platform} {session.systemVersion}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 font-mono" dir="ltr">
                          <span>
                            📍 {session.country || 'غير معروف'} {session.region ? `(${session.region})` : ''}
                          </span>
                          {session.ip && <span>• IP: {session.ip}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> آخر نشاط: {formatDate(session.dateActive)}
                    </span>
                    <span>تاريخ الإنشاء: {formatDate(session.dateCreated)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
