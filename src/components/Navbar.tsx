import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  MessageSquare,
  Users,
  LayoutDashboard,
  LogOut,
  Wifi,
  Sparkles,
  ShieldCheck,
  Bookmark,
  Bell,
  Compass,
  Globe,
  Terminal,
  ClipboardList,
  CreditCard,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const Navbar: React.FC = () => {
  const {
    status,
    wsConnected,
    activeTab,
    setActiveTab,
    logout,
    alerts,
    clipboard,
    setCommandCenterOpen,
    setClipboardModalOpen,
    deviceMode,
    isMobile,
    setDeviceMode,
  } = useTelegram();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  const user = status?.user;
  const rawName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Telegram User'
    : 'Telegram User';
  const fullName = safeString(rawName, 'Telegram User');

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  return (
    <>
      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تسجيل الخروج من تيليجرام؟</h3>
              <p className="text-xs text-slate-400 mt-1">
                هل أنت متأكد من تسجيل الخروج وإنهاء جلسة هذا الجهاز؟
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
              >
                تأكيد الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 border-b border-slate-800 bg-[#0b141a]/95 backdrop-blur px-3 sm:px-6 flex items-center justify-between z-20 shrink-0">
        {/* Left: Brand & Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#24A1DE] to-[#0088cc] flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">تيليجرام الذكي</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  MTProto 2.0
                </span>
              </div>
            </div>
          </div>

          {/* Connection Pill */}
          <div className="hidden lg:flex items-center gap-2 pr-3 border-r border-slate-800">
            {status?.isAuthenticated ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>متصل بخادم تيليجرام (DC {status.dcId || '1'})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>غير متصل</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Tabs (Desktop only - Mobile uses dedicated Bottom Navigation) */}
        {status?.isAuthenticated && !isMobile && (
          <div className="hidden md:flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800 overflow-x-auto max-w-xl">
            {/* Chats */}
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'chats'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>المحادثات</span>
            </button>

            {/* Global Discovery (استكشاف 🌍) */}
            <button
              onClick={() => setActiveTab('discovery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'discovery'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>استكشاف 🌍</span>
            </button>

            {/* AI Channel Finder */}
            <button
              onClick={() => setActiveTab('channels')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'channels' || activeTab === 'channel_finder'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>مستكشف القنوات</span>
            </button>

            {/* Keyword Monitor */}
            <button
              onClick={() => setActiveTab('keywords')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative shrink-0 ${
                activeTab === 'keywords' || activeTab === 'monitor'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>مراقبة الكلمات</span>
              {unreadAlertsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            {/* Saved Bookmarks */}
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'bookmarks'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>المحفوظات</span>
            </button>

            {/* Contacts */}
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'contacts'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>جهات الاتصال</span>
            </button>

            {/* Payments */}
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'payments'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>الاشتراكات</span>
            </button>

            {/* Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">لوحة التحكم</span>
            </button>
          </div>
        )}

        {/* Right: Quick Tools, Device Switcher, Command Center & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Device Experience Mode Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
              title={`وضع العرض: ${
                deviceMode === 'auto'
                  ? isMobile
                    ? 'تلقائي (جوال 📱)'
                    : 'تلقائي (كمبيوتر 🖥️)'
                  : deviceMode === 'mobile'
                  ? 'جوال 📱'
                  : 'كمبيوتر 🖥️'
              }`}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              {isMobile ? <Smartphone className="w-4 h-4 text-sky-400" /> : <Monitor className="w-4 h-4 text-indigo-400" />}
              <span className="hidden lg:inline">
                {deviceMode === 'auto' ? 'تلقائي' : deviceMode === 'mobile' ? 'جوال' : 'كمبيوتر'}
              </span>
            </button>

            {/* Device Switcher Menu */}
            {showDeviceMenu && (
              <div
                className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-right animate-fade-in"
                dir="rtl"
              >
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800 mb-1">
                  اختر تجربة العرض
                </div>

                <button
                  onClick={() => {
                    setDeviceMode('auto');
                    setShowDeviceMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 cursor-pointer ${
                    deviceMode === 'auto' ? 'text-sky-400 font-bold bg-sky-500/10' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>تلقائي حسب الجهاز</span>
                  </div>
                  {deviceMode === 'auto' && <span className="text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    setDeviceMode('mobile');
                    setShowDeviceMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 cursor-pointer ${
                    deviceMode === 'mobile' ? 'text-sky-400 font-bold bg-sky-500/10' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                    <span>واجهة الجوال (Telegram Mobile)</span>
                  </div>
                  {deviceMode === 'mobile' && <span className="text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    setDeviceMode('desktop');
                    setShowDeviceMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 cursor-pointer ${
                    deviceMode === 'desktop' ? 'text-sky-400 font-bold bg-sky-500/10' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                    <span>واجهة الكمبيوتر (Desktop Workspace)</span>
                  </div>
                  {deviceMode === 'desktop' && <span className="text-xs">✓</span>}
                </button>
              </div>
            )}
          </div>
          {status?.isAuthenticated && (
            <>
              {/* AI Command Center button */}
              <button
                onClick={() => setCommandCenterOpen(true)}
                title="فتح مركز الأوامر الذكي (⌘K)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 text-xs font-semibold transition-all cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">أوامر AI</span>
                <kbd className="hidden sm:inline text-[10px] bg-slate-900 px-1 py-0.2 rounded border border-slate-700 font-mono text-slate-400">
                  ⌘K
                </kbd>
              </button>

              {/* Clipboard history button */}
              <button
                onClick={() => setClipboardModalOpen(true)}
                title="سجل الحافظة"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 relative transition-colors cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                {clipboard.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 bg-sky-600 text-[9px] font-mono font-bold text-white rounded-full">
                    {clipboard.length}
                  </span>
                )}
              </button>
            </>
          )}

          {/* User Profile */}
          {status?.isAuthenticated && user && (
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:block text-right">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1 truncate max-w-28">
                  <span>{fullName}</span>
                  {user.premium && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
              </div>
            </div>
          )}

          {status?.isAuthenticated && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout Telegram (تسجيل الخروج وإنهاء الجلسة)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 transition-all cursor-pointer shadow-sm shadow-rose-950/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-sans">Logout Telegram</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
};
