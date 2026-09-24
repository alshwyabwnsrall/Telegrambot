import React, { useRef, memo, useCallback, useState, useMemo } from 'react';
import { useTelegram, areChatIdsEqual } from '../context/TelegramContext.js';
import {
  Search,
  Pin,
  Check,
  CheckCheck,
  Users,
  Megaphone,
  User,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  Sparkles,
  FolderPlus,
  SlidersHorizontal,
} from 'lucide-react';
import { TelegramDialog } from '../types/telegram.js';
import { useVirtualScroll } from '../hooks/useVirtualScroll.js';
import { LazyAvatar } from './LazyAvatar.js';
import { SmartFoldersModal } from './SmartFoldersModal.js';

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  const ms = timestamp < 2000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' });
}

interface ChatListItemProps {
  dialog: TelegramDialog;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
}

const ChatListItem = memo(({ dialog, isSelected, onSelect }: ChatListItemProps) => {
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const ignoreClickUntilRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || e.touches.length !== 1) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    // If movement exceeds 6px, user is scrolling/panning - NOT tapping!
    if (deltaX > 6 || deltaY > 6) {
      isDraggingRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const duration = Date.now() - touchStartPos.current.time;
    const wasDragging = isDraggingRef.current;
    touchStartPos.current = null;

    // Only trigger if stationary tap (<6px delta) and quick tap (<450ms)
    if (!wasDragging && duration < 450) {
      ignoreClickUntilRef.current = Date.now() + 400; // Suppress following ghost synthetic click
      onSelect(dialog.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (Date.now() < ignoreClickUntilRef.current) {
      e.preventDefault();
      return;
    }
    onSelect(dialog.id);
  };

  const initials = dialog.title ? dialog.title.slice(0, 2).toUpperCase() : 'TG';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      style={{
        height: '74px',
        minHeight: '74px',
        marginBottom: '6px',
        touchAction: 'manipulation',
      }}
      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-150 box-border select-none border ${
        isSelected
          ? 'bg-sky-600/30 border-sky-500/60 text-white shadow-md shadow-sky-950/40 ring-1 ring-sky-400/30'
          : 'border-transparent bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-700/50 text-slate-200 active:bg-sky-600/15 active:scale-[0.985]'
      }`}
    >
      {/* Eye-friendly Avatar (48px x 48px) with rounded corners */}
      <div className="relative shrink-0">
        <LazyAvatar
          src={`/api/telegram/avatar/${dialog.id}`}
          alt={dialog.title}
          initials={initials}
          className="w-12 h-12 rounded-2xl shadow-sm"
        />

        {/* Type badge */}
        {dialog.isChannel && (
          <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 shadow-sm">
            <Megaphone className="w-2.5 h-2.5" />
          </div>
        )}
        {dialog.isGroup && (
          <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-sm">
            <Users className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Chat Info & Preview */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[14px] sm:text-[15px] font-bold truncate text-white leading-tight">
            {dialog.title}
          </h4>
          <span className="text-[11px] text-slate-400 shrink-0 mr-1.5 font-mono">
            {formatTimestamp(dialog.lastMessage?.date || dialog.date)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 flex-1 min-w-0">
            {dialog.lastMessage?.out && (
              <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
            {dialog.lastMessage?.media && (
              <span className="text-sky-400 flex items-center gap-0.5 shrink-0">
                <ImageIcon className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="truncate leading-tight">
              {dialog.lastMessage?.text || (dialog.lastMessage?.media ? 'وسائط متعددة' : 'لا توجد رسائل بعد')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {dialog.pinned && <Pin className="w-3.5 h-3.5 text-slate-400 rotate-45" />}
            {dialog.unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-500 text-white min-w-[20px] text-center shadow-md shadow-sky-500/20 animate-fade-in">
                {dialog.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const Sidebar: React.FC = () => {
  const {
    dialogs,
    loadingDialogs,
    selectedChatId,
    selectChat,
    refreshDialogs,
    searchQuery,
    setSearchQuery,
    folders,
    selectedFolderId,
    setSelectedFolderId,
    autoCategorizeWithAi,
    isCategorizingWithAi,
    markAllAsRead,
    setActiveTab,
    isMobile,
  } = useTelegram();

  const [foldersModalOpen, setFoldersModalOpen] = useState(false);
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // Total dialogs with unread messages
  const totalUnreadDialogsCount = useMemo(
    () => dialogs.filter((d) => (d.unreadCount || 0) > 0 || (d.unreadMentionsCount || 0) > 0).length,
    [dialogs]
  );

  // Active smart folder definition
  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId) || folders[0] || {
      id: 'all',
      title: 'الكل',
      icon: '💬',
      filterType: 'all',
      chatIds: [],
    };
  }, [folders, selectedFolderId]);

  // Count getter for any folder badge
  const getFolderCount = useCallback(
    (f: any) => {
      if (f.id === 'all' || f.filterType === 'all') return dialogs.length;
      if (f.id === 'channels' || f.filterType === 'channels') return dialogs.filter((d) => d.isChannel).length;
      if (f.id === 'groups' || f.filterType === 'groups') return dialogs.filter((d) => d.isGroup).length;
      if (f.id === 'users' || f.filterType === 'users') return dialogs.filter((d) => d.isUser).length;
      if (f.id === 'unread' || f.filterType === 'unread') return dialogs.filter((d) => d.unreadCount > 0).length;
      return dialogs.filter((d) => f.chatIds?.some((id: string) => areChatIdsEqual(id, d.id))).length;
    },
    [dialogs]
  );

  // Filter dialogs according to active smart folder and searchQuery
  const filteredDialogs = useMemo(() => {
    return dialogs.filter((d) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchUser = d.username ? d.username.toLowerCase().includes(q) : false;
        const matchMsg = d.lastMessage?.text ? d.lastMessage.text.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchUser && !matchMsg) return false;
      }

      // 2. Folder filter
      if (!activeFolder || activeFolder.id === 'all' || activeFolder.filterType === 'all') return true;
      if (activeFolder.id === 'channels' || activeFolder.filterType === 'channels') return d.isChannel;
      if (activeFolder.id === 'groups' || activeFolder.filterType === 'groups') return d.isGroup;
      if (activeFolder.id === 'users' || activeFolder.filterType === 'users') return d.isUser;
      if (activeFolder.id === 'unread' || activeFolder.filterType === 'unread') return d.unreadCount > 0;

      // Custom or AI Folder: match chatIds
      if (activeFolder.chatIds && activeFolder.chatIds.length > 0) {
        return activeFolder.chatIds.some((id) => areChatIdsEqual(id, d.id));
      }

      return false;
    });
  }, [dialogs, searchQuery, activeFolder]);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Virtualized Scroll for dialogs list
  const { startIndex, endIndex, topPadding, bottomPadding } = useVirtualScroll({
    itemCount: filteredDialogs.length,
    itemHeight: 80, // 74px item height + 6px spacing gap
    overscan: 6,
    containerRef: listContainerRef,
  });

  const visibleDialogs = filteredDialogs.slice(startIndex, endIndex + 1);

  const handleSelectChat = useCallback((chatId: string) => {
    selectChat(chatId);
  }, [selectChat]);

  const channelsTotalCount = useMemo(() => dialogs.filter((d) => d.isChannel).length, [dialogs]);

  return (
    <>
      <SmartFoldersModal isOpen={foldersModalOpen} onClose={() => setFoldersModalOpen(false)} />

      {/* Confirmation Modal: Mark All Chats as Read */}
      {showMarkAllConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          dir="rtl"
        >
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/30 shadow-lg shadow-sky-500/10">
              <CheckCheck className="w-7 h-7 text-sky-400 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">هل تريد تعليم كل المحادثات كمقروءة؟</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                سيتم تصفير جميع عدادات وشارات الرسائل غير المقروءة في كافة القنوات والمجموعات والمحادثات فوراً وتثبيتها بحسابك.
              </p>
              {totalUnreadDialogsCount > 0 ? (
                <div className="inline-block mt-1 px-3 py-1 bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-mono font-bold">
                  {totalUnreadDialogsCount} محادثة تحتوي على رسائل غير مقروءة
                </div>
              ) : (
                <div className="inline-block mt-1 px-3 py-1 bg-slate-800 text-slate-400 rounded-xl text-xs font-mono">
                  جميع المحادثات مقروءة حالياً
                </div>
              )}
            </div>

            <div className="flex gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowMarkAllConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isMarkingAllRead}
                onClick={async () => {
                  setIsMarkingAllRead(true);
                  try {
                    await markAllAsRead();
                  } finally {
                    setIsMarkingAllRead(false);
                    setShowMarkAllConfirm(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-600/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{isMarkingAllRead ? 'جارٍ التحديث...' : 'نعم، تعليم الكل'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`${
          isMobile
            ? 'w-full h-full bg-[#0e1621] flex flex-col flex-1 pb-16 overflow-hidden'
            : 'w-80 md:w-96 h-full border-r border-slate-800 bg-slate-900/80 flex flex-col shrink-0'
        }`}
      >
        {/* Top Search & Smart Folders Bar */}
        <div className="p-3 border-b border-slate-800 space-y-2.5 shrink-0 bg-slate-900/90">
          {/* Search Bar + Quick Mark-As-Read Action */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المحادثات، القنوات، والمستخدمين..."
                className="w-full pr-9 pl-8 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-right"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Button: Mark All As Read (صحين قراءة ✓✓) */}
            <button
              onClick={() => setShowMarkAllConfirm(true)}
              title="تحديد الكل كمقروء بضغطة واحدة (✓✓)"
              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                totalUnreadDialogsCount > 0
                  ? 'bg-sky-600/20 hover:bg-sky-600/30 border-sky-500/40 text-sky-400 hover:text-white shadow-sm ring-1 ring-sky-500/20 active:scale-95'
                  : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Smart Folders Toolbar Header (AI Sort Button + Manage Folders + Mark All Read + Refresh) */}
          <div className="flex items-center justify-between gap-1.5 px-0.5">
            <div className="flex items-center gap-1.5">
              {/* AI Auto Categorize Button */}
              <button
                onClick={() => autoCategorizeWithAi()}
                disabled={isCategorizingWithAi || dialogs.length === 0}
                title="فرز وتصنيف ذكي بالذكاء الاصطناعي لكافة القنوات والمحادثات"
                className="px-2.5 py-1 bg-gradient-to-r from-sky-600/30 to-indigo-600/30 hover:from-sky-600/50 hover:to-indigo-600/50 border border-sky-500/40 text-sky-300 hover:text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isCategorizingWithAi ? 'animate-spin' : ''}`} />
                <span>{isCategorizingWithAi ? 'جارٍ الفرز...' : 'فرز ذكي (AI)'}</span>
              </button>

              {/* Manage Folders Modal Button */}
              <button
                onClick={() => setFoldersModalOpen(true)}
                title="إدارة التبويبات والمجلدات المخصصة"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Mark All Read Pill Button */}
              <button
                onClick={() => setShowMarkAllConfirm(true)}
                title="تعليم كافة المحادثات والقنوات كمقروءة بضغطة واحدة"
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 ${
                  totalUnreadDialogsCount > 0
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-400 hover:text-emerald-300 shadow-sm shadow-emerald-950/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/50 text-slate-400 hover:text-slate-300'
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">مقروء للكل</span>
                {totalUnreadDialogsCount > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {totalUnreadDialogsCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="font-mono text-slate-500">
                {dialogs.length} محادثة ({channelsTotalCount} قناة)
              </span>
              <button
                onClick={() => refreshDialogs()}
                title="تحديث وجلب كافة القنوات والمحادثات من تيليجرام"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDialogs ? 'animate-spin text-sky-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Smart Folders & Category Tabs Horizontal Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {/* Dedicated Global Discovery Tab */}
            <button
              onClick={() => setActiveTab('discovery')}
              title="استكشاف قنوات ومجموعات جديدة في شبكة تيليجرام العامة (Global Discovery)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border border-sky-500/40 bg-gradient-to-r from-sky-600/30 to-indigo-600/30 hover:from-sky-600/50 hover:to-indigo-600/50 text-sky-300 hover:text-white shadow-sm"
            >
              <span className="text-xs">🌍</span>
              <span>استكشاف</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                جديد
              </span>
            </button>

            {folders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              const count = getFolderCount(folder);

              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-sky-600 border-sky-500 text-white font-bold shadow-md shadow-sky-600/30'
                      : 'border-slate-800/80 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs">{folder.icon || '📁'}</span>
                  <span>{folder.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-700/60 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Quick add custom folder button */}
            <button
              onClick={() => setFoldersModalOpen(true)}
              title="إضافة مجلد ذكي جديد"
              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-dashed border-slate-700 text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>مجلد جديد</span>
            </button>
          </div>
        </div>

        {/* Unread Category Banner if Unread Filter Active */}
        {selectedFolderId === 'unread' && filteredDialogs.length > 0 && (
          <div className="mx-2 mt-2 p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-2xl flex items-center justify-between text-xs animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-sky-400 stroke-[2.5]" />
              <span className="text-slate-200 font-medium">
                يوجد {filteredDialogs.length} محادثة بها رسائل جديدة
              </span>
            </div>
            <button
              onClick={() => setShowMarkAllConfirm(true)}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              تحديد الكل كمقروء ✓✓
            </button>
          </div>
        )}

        {/* Chat List with High-Performance Smooth Virtualized Touch Scroll */}
        <div
          ref={listContainerRef}
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehaviorY: 'contain',
          }}
          className="flex-1 overflow-y-auto px-2 sm:px-2.5 py-2 relative scrollbar-thin scrollbar-thumb-slate-700"
        >
          {loadingDialogs && dialogs.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-sky-500 mx-auto" />
              <p className="text-xs text-slate-400">جارٍ تحميل كافة قنوات ومحادثات تيليجرام...</p>
            </div>
          ) : filteredDialogs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="text-2xl">{activeFolder?.icon || '🔍'}</div>
              <p className="text-xs font-bold text-slate-300">
                لا توجد محادثات في تبويب "{activeFolder?.title}"
              </p>
              <p className="text-[11px] text-slate-500">
                {activeFolder?.isAiGenerated || activeFolder?.isCustom
                  ? 'يمكنك إضافة قنوات إلى هذا المجلد من خلال زر الإعدادات أعلاه، أو تجربة الفرز الذكي بالـ AI.'
                  : 'جرب البحث باسم آخر أو اضغط تحديث لجلب جميع القنوات.'}
              </p>
            </div>
          ) : (
            <div style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}>
              {visibleDialogs.map((dialog) => (
                <ChatListItem
                  key={dialog.id}
                  dialog={dialog}
                  isSelected={areChatIdsEqual(dialog.id, selectedChatId)}
                  onSelect={handleSelectChat}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
