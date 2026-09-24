import React from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  MessageSquare,
  Globe,
  Compass,
  Bookmark,
  Bell,
  Terminal,
  LayoutDashboard,
  Users,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedChatId,
    dialogs,
    alerts,
    setCommandCenterOpen,
    isMobile,
  } = useTelegram();

  // Only show on mobile, and hide when inside an active conversation to maximize chat viewport
  if (!isMobile || (activeTab === 'chats' && selectedChatId)) {
    return null;
  }

  const totalUnreadDialogs = dialogs.reduce((sum, d) => sum + (d.unreadCount > 0 ? 1 : 0), 0);
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  const navItems = [
    {
      id: 'chats',
      label: 'المحادثات',
      icon: MessageSquare,
      badge: totalUnreadDialogs > 0 ? totalUnreadDialogs : null,
      onClick: () => setActiveTab('chats'),
      active: activeTab === 'chats',
    },
    {
      id: 'discovery',
      label: 'استكشاف 🌍',
      icon: Globe,
      onClick: () => setActiveTab('discovery'),
      active: activeTab === 'discovery',
    },
    {
      id: 'channels',
      label: 'المستكشف',
      icon: Compass,
      onClick: () => setActiveTab('channels'),
      active: activeTab === 'channels' || activeTab === 'channel_finder',
    },
    {
      id: 'ai',
      label: 'أوامر AI',
      icon: Terminal,
      isAi: true,
      onClick: () => setCommandCenterOpen(true),
      active: false,
    },
    {
      id: 'bookmarks',
      label: 'المحفوظات',
      icon: Bookmark,
      onClick: () => setActiveTab('bookmarks'),
      active: activeTab === 'bookmarks',
    },
    {
      id: 'dashboard',
      label: 'الحساب',
      icon: LayoutDashboard,
      badge: unreadAlerts > 0 ? unreadAlerts : null,
      onClick: () => setActiveTab('dashboard'),
      active: activeTab === 'dashboard',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e1621]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom select-none"
      dir="rtl"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.active;

        if (item.isAi) {
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center p-1 relative -top-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 group-active:scale-95 transition-transform border-2 border-slate-900">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-sky-400 mt-0.5">{item.label}</span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer relative min-w-[56px] ${
              isActive
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {item.badge !== null && (
                <span className="absolute -top-1.5 -right-2 bg-sky-500 text-white text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-md animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-1 ${isActive ? 'text-sky-400 font-semibold' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
