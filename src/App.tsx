import React, { useEffect } from 'react';
import { TelegramProvider, useTelegram } from './context/TelegramContext.js';
import { MediaPlayerProvider } from './context/MediaPlayerContext.js';
import { TranslationProvider } from './context/TranslationContext.js';
import { GlobalAudioPlayerBar } from './components/GlobalAudioPlayerBar.js';
import { ConnectTelegramView } from './components/ConnectTelegramView.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatView } from './components/ChatView.js';
import { DashboardView } from './components/DashboardView.js';
import { ContactsView } from './components/ContactsView.js';
import { BookmarksView } from './components/BookmarksView.js';
import { ChannelFinderView } from './components/ChannelFinderView.js';
import { GlobalDiscoveryView } from './components/GlobalDiscoveryView.js';
import { KeywordMonitorView } from './components/KeywordMonitorView.js';
import { PaymentsView } from './components/PaymentsView.js';
import { ForwardModal } from './components/ForwardModal.js';
import { CommandCenterModal } from './components/CommandCenterModal.js';
import { ClipboardModal } from './components/ClipboardModal.js';
import { MobileBottomNav } from './components/MobileBottomNav.js';
import { RefreshCw, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    status,
    loading,
    activeTab,
    selectedChatId,
    isMobile,
    notification,
    clearNotification,
    commandCenterOpen,
    setCommandCenterOpen,
    clipboardModalOpen,
    setClipboardModalOpen,
  } = useTelegram();

  // Global hotkeys (Cmd+K / Ctrl+K for command center)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandCenterOpen(!commandCenterOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandCenterOpen, setCommandCenterOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
        </div>
        <p className="text-sm font-medium">جاري التحقق من حالة الاتصال بتيليجرام...</p>
      </div>
    );
  }

  // QR Code Login view (Laptop -> Scan QR with Telegram Mobile app)
  // Preserved exactly as requested
  if (!status?.isAuthenticated) {
    return (
      <>
        {/* Toast Alert */}
        {notification && (
          <div className="fixed top-4 left-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-xs text-white animate-fade-in max-w-md" dir="rtl">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span className="flex-1">{notification.message}</span>
            <button onClick={clearNotification} className="text-slate-400 hover:text-white cursor-pointer" title="إغلاق">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <ConnectTelegramView />
      </>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* Global Notifications (Toast at bottom-left) */}
      {notification && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl text-xs text-white animate-fade-in max-w-md backdrop-blur-md" dir="rtl">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          <span className="flex-1 font-medium">{notification.message}</span>
          <button onClick={clearNotification} className="text-slate-400 hover:text-white cursor-pointer" title="إغلاق">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar />

      {/* Main Workspace Tabs */}
      <main className="flex-1 overflow-hidden flex relative">
        {activeTab === 'chats' && (
          isMobile ? (
            selectedChatId ? (
              <ChatView />
            ) : (
              <Sidebar />
            )
          ) : (
            <>
              <Sidebar />
              <ChatView />
            </>
          )
        )}

        {activeTab === 'discovery' && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <GlobalDiscoveryView />
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <ContactsView />
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <BookmarksView />
          </div>
        )}

        {(activeTab === 'channels' || activeTab === 'channel_finder') && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <ChannelFinderView />
          </div>
        )}

        {(activeTab === 'keywords' || activeTab === 'monitor') && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <KeywordMonitorView />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <PaymentsView />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className={`flex-1 overflow-hidden flex ${isMobile ? 'pb-16' : ''}`}>
            <DashboardView />
          </div>
        )}
      </main>

      {/* Global Modals */}
      <ForwardModal />

      <CommandCenterModal />

      <ClipboardModal
        isOpen={clipboardModalOpen}
        onClose={() => setClipboardModalOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar (Telegram Mobile Style) */}
      <MobileBottomNav />

      {/* Global Persistent Media Player Bar */}
      <GlobalAudioPlayerBar />
    </div>
  );
};

export default function App() {
  return (
    <TelegramProvider>
      <TranslationProvider>
        <MediaPlayerProvider>
          <MainLayout />
        </MediaPlayerProvider>
      </TranslationProvider>
    </TelegramProvider>
  );
}
