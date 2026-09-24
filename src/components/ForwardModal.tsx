import React, { useState, useMemo } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  Forward,
  Search,
  X,
  Users,
  MessageSquare,
  Radio,
  User,
  Check,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const ForwardModal: React.FC = () => {
  const {
    forwardModalOpen,
    setForwardModalOpen,
    messagesToForward,
    dialogs,
    contacts,
    forwardMessagesTo,
  } = useTelegram();

  const [search, setSearch] = useState('');
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'groups' | 'channels' | 'contacts'>('all');
  const [isForwarding, setIsForwarding] = useState(false);

  if (!forwardModalOpen) return null;

  const destinations = useMemo(() => {
    let list: Array<{
      id: string;
      title: string;
      subtitle?: string;
      type: 'chat' | 'group' | 'channel' | 'contact';
      username?: string;
    }> = [];

    // Add dialogs
    dialogs.forEach((d) => {
      list.push({
        id: d.id,
        title: d.title || d.name || 'محادثة',
        subtitle: d.isChannel ? 'قناة (Channel)' : d.isGroup ? 'مجموعة (Group)' : 'محادثة خاصة',
        type: d.isChannel ? 'channel' : d.isGroup ? 'group' : 'chat',
        username: d.username,
      });
    });

    // Add contacts not already in dialogs
    contacts.forEach((c) => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.username || 'جهة اتصال';
      if (!list.some((item) => item.id === c.id)) {
        list.push({
          id: c.id,
          title: name,
          subtitle: c.phone || (c.username ? `@${c.username}` : 'جهة اتصال تيليجرام'),
          type: 'contact',
          username: c.username,
        });
      }
    });

    // Filter by type
    if (filterType === 'groups') list = list.filter((i) => i.type === 'group');
    if (filterType === 'channels') list = list.filter((i) => i.type === 'channel');
    if (filterType === 'contacts') list = list.filter((i) => i.type === 'contact' || i.type === 'chat');

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.username && i.username.toLowerCase().includes(q)) ||
          (i.subtitle && i.subtitle.toLowerCase().includes(q))
      );
    }

    return list;
  }, [dialogs, contacts, filterType, search]);

  const handleConfirmForward = async () => {
    if (!selectedDestId) return;
    setIsForwarding(true);
    await forwardMessagesTo(selectedDestId, messagesToForward);
    setIsForwarding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Forward className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>تحويل الرسائل</span>
                <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-semibold">
                  {messagesToForward.length} رسالة
                </span>
              </h2>
              <p className="text-xs text-slate-400">تحويل مباشر وحقيقي عبر حساب تيليجرام الخاص بك</p>
            </div>
          </div>
          <button
            onClick={() => setForwardModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن محادثة أو مجموعة أو قناة أو جهة اتصال..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all text-right"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterType('channels')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'channels'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> القنوات
            </button>
            <button
              onClick={() => setFilterType('groups')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'groups'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> المجموعات
            </button>
            <button
              onClick={() => setFilterType('contacts')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'contacts'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> جهات الاتصال
            </button>
          </div>
        </div>

        {/* List of destinations */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-800/40">
          {destinations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              لم يتم العثور على محادثات أو جهات اتصال تطابق بحثك.
            </div>
          ) : (
            destinations.map((dest) => {
              const isSelected = selectedDestId === dest.id;
              return (
                <div
                  key={dest.id}
                  onClick={() => setSelectedDestId(dest.id)}
                  className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-600/15 border border-sky-500/30'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        dest.type === 'channel'
                          ? 'bg-indigo-600'
                          : dest.type === 'group'
                          ? 'bg-emerald-600'
                          : 'bg-sky-600'
                      }`}
                    >
                      {dest.type === 'channel' ? (
                        <Radio className="w-4 h-4" />
                      ) : dest.type === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {safeString(dest.title)}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{dest.subtitle}</span>
                        {dest.username && (
                          <span className="text-sky-400 font-mono" dir="ltr">@{dest.username}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : 'border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setForwardModalOpen(false)}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirmForward}
            disabled={!selectedDestId || isForwarding}
            className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
          >
            {isForwarding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Forward className="w-4 h-4" />
                <span>إرسال التحويل الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
