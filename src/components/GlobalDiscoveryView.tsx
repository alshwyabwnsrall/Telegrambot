import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { GlobalSearchResultItem } from '../types/telegram.js';
import {
  Globe,
  Search,
  Megaphone,
  Users,
  Bot,
  User,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Radio,
  ArrowRight,
  Eye,
  MessageSquare,
  Filter,
  CheckCircle2,
  Copy,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Share2,
} from 'lucide-react';

export const GlobalDiscoveryView: React.FC = () => {
  const { searchGlobalDirectory, joinChannel, selectChat, setActiveTab, isMobile, showNotification } =
    useTelegram();

  // Search and state preservation
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'channels' | 'groups' | 'users'>('all');
  const [excludeJoined, setExcludeJoined] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search Results
  const [channels, setChannels] = useState<GlobalSearchResultItem[]>([]);
  const [groups, setGroups] = useState<GlobalSearchResultItem[]>([]);
  const [users, setUsers] = useState<GlobalSearchResultItem[]>([]);
  const [unfilteredTotal, setUnfilteredTotal] = useState<number>(0);

  // Joined IDs tracking
  const [joinedSet, setJoinedSet] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // In-App Seamless Preview Navigation State
  const [previewItem, setPreviewItem] = useState<GlobalSearchResultItem | null>(null);
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);
  const [previewEntity, setPreviewEntity] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Refs to preserve scroll position
  const searchScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick search suggestions
  const suggestions = [
    { label: 'تقنية وبرمجة', icon: '💻', q: 'programming' },
    { label: 'تداول وعملات رقمية', icon: '📈', q: 'crypto' },
    { label: 'ذكاء اصطناعي AI', icon: '🤖', q: 'AI' },
    { label: 'أخبار عالمية', icon: '🌍', q: 'news' },
    { label: 'تصميم ومونتاج', icon: '🎨', q: 'design' },
    { label: 'كتب وروايات', icon: '📚', q: 'books' },
  ];

  // Deep batch search handler
  const handleSearch = useCallback(
    async (overrideQuery?: string, overrideExcludeJoined?: boolean) => {
      const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
      const shouldExclude = overrideExcludeJoined !== undefined ? overrideExcludeJoined : excludeJoined;
      if (!q) return;

      if (overrideQuery !== undefined) setQuery(overrideQuery);

      setLoading(true);
      setHasSearched(true);
      try {
        const data = await searchGlobalDirectory(q, shouldExclude);
        if (data) {
          setChannels(data.channels || []);
          setGroups(data.groups || []);
          setUsers(data.users || []);
          setUnfilteredTotal(data.unfilteredTotal || data.totalResults || 0);

          // Populate local joined set
          const initialJoined = new Set<string>();
          [...(data.channels || []), ...(data.groups || []), ...(data.users || [])].forEach((item) => {
            if (item.isJoined) initialJoined.add(item.id);
          });
          setJoinedSet(initialJoined);
        } else {
          setChannels([]);
          setGroups([]);
          setUsers([]);
          setUnfilteredTotal(0);
        }
      } catch (err) {
        console.error('Error executing global directory search:', err);
      } finally {
        setLoading(false);
      }
    },
    [query, excludeJoined, searchGlobalDirectory]
  );

  // Toggle excludeJoined and re-filter immediately
  const handleToggleExcludeJoined = () => {
    const nextVal = !excludeJoined;
    setExcludeJoined(nextVal);
    if (query.trim()) {
      handleSearch(query, nextVal);
    }
  };

  // Open In-App Seamless Preview
  const openPreview = async (item: GlobalSearchResultItem) => {
    // Save current scroll position so we return to the exact same spot
    if (searchScrollRef.current) {
      savedScrollPositionRef.current = searchScrollRef.current.scrollTop;
    }

    setPreviewItem(item);
    setPreviewEntity(null);
    setPreviewMessages([]);
    setLoadingPreview(true);

    try {
      const peerTarget = item.username ? `@${item.username}` : item.id;
      const res = await fetch(`/api/telegram/channels/preview?peer=${encodeURIComponent(peerTarget)}`);
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.messages)) setPreviewMessages(data.messages);
        if (data.entity) setPreviewEntity(data.entity);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Close Preview and restore scroll position seamlessly
  const closePreview = () => {
    setPreviewItem(null);
    setPreviewMessages([]);
    setPreviewEntity(null);

    // Restore scroll position after state updates
    setTimeout(() => {
      if (searchScrollRef.current && savedScrollPositionRef.current > 0) {
        searchScrollRef.current.scrollTop = savedScrollPositionRef.current;
      }
    }, 50);
  };

  // Join Channel from card or in preview
  const handleJoin = async (item: GlobalSearchResultItem) => {
    setJoiningId(item.id);
    try {
      const success = await joinChannel(item.id, item.username);
      if (success) {
        setJoinedSet((prev) => new Set(prev).add(item.id));
      }
    } finally {
      setJoiningId(null);
    }
  };

  // Open Chat in main app
  const handleOpenChat = (item: GlobalSearchResultItem) => {
    selectChat(item.id);
    setActiveTab('chats');
  };

  // Format count: e.g. 1500000 -> 1.5M
  const formatCount = (count: number | null | undefined, singular: string) => {
    if (!count || count <= 0) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M ${singular}`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K ${singular}`;
    return `${count} ${singular}`;
  };

  const totalResultsCount = channels.length + groups.length + users.length;
  const filteredOutCount = Math.max(0, unfilteredTotal - totalResultsCount);

  // =========================================================================
  // VIEW MODE 1: In-App Preview & Feed Reader (المعاينة السريعة داخل التطبيق)
  // =========================================================================
  if (previewItem) {
    const isJoined = joinedSet.has(previewItem.id) || previewItem.isJoined;
    const isJoining = joiningId === previewItem.id;
    const entityTitle = previewEntity?.title || previewItem.title;
    const entityUsername = previewEntity?.username || previewItem.username;
    const entityAbout = previewEntity?.about || previewItem.about;
    const entityCount = previewEntity?.participantsCount || previewItem.participantsCount;
    const isChannel = previewItem.isChannel || previewEntity?.isChannel;

    return (
      <div className="flex-1 flex flex-col h-full bg-[#0a1017] text-slate-100 overflow-hidden" dir="rtl">
        {/* Top Navigation Bar: Back to Search + Channel Profile */}
        <header className="h-16 px-4 sm:px-6 border-b border-slate-800/90 bg-[#0e1621]/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Seamless Back to Search Button */}
            <button
              type="button"
              onClick={closePreview}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="الرجوع إلى نتائج البحث دون فقدان التمرير"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              <span className="text-xs font-bold hidden sm:inline">رجوع إلى البحث</span>
            </button>

            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={`/api/telegram/avatar/${previewItem.id}`}
                alt=""
                className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700/80 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md">
                    {entityTitle}
                  </h2>
                  {(previewItem.verified || previewEntity?.verified) && (
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                  {entityUsername ? (
                    <span className="text-sky-400 font-mono">@{entityUsername}</span>
                  ) : (
                    <span>{isChannel ? 'قناة عامة' : 'مجموعة عامة'}</span>
                  )}
                  {entityCount && (
                    <span>• {formatCount(entityCount, isChannel ? 'مشترك' : 'عضو')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {entityUsername && (
              <a
                href={`https://t.me/${entityUsername}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-colors hidden sm:flex items-center gap-1 text-xs"
                title="فتح الرابط في تيليجرام الرسمي"
              >
                <span className="font-mono">t.me/{entityUsername}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={closePreview}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="إغلاق المعاينة والرجوع للبحث"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Preview Feed Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 space-y-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Channel About & Description Card */}
            {entityAbout && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>نبذة عن {isChannel ? 'القناة' : 'المجموعة'}:</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {entityAbout}
                </p>
              </div>
            )}

            {/* Loading state for messages */}
            {loadingPreview && (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  جارٍ استرجاع أحدث المنشورات والرسائل الحية عبر MTProto...
                </p>
              </div>
            )}

            {/* Empty Messages State */}
            {!loadingPreview && previewMessages.length === 0 && (
              <div className="py-20 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                  <Megaphone className="w-6 h-6 text-sky-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">لا توجد رسائل سابقة متاحة للمعاينة العامة</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    يمكنك الانضمام مباشرة لمتابعة أحدث المنشورات وتصفح كافة أرشيف المحادثة.
                  </p>
                </div>
              </div>
            )}

            {/* Messages Feed */}
            {!loadingPreview &&
              previewMessages.length > 0 &&
              previewMessages.map((msg, idx) => (
                <article
                  key={msg.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-md space-y-3 hover:border-slate-700/80 transition-colors"
                >
                  {/* Message Text */}
                  {msg.text && (
                    <div className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed select-text font-normal">
                      {msg.text}
                    </div>
                  )}

                  {/* Media Attachment Badge */}
                  {msg.media && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                      <span>📎</span>
                      <span className="font-medium">{msg.mediaType || 'وسائط مرفقة'}</span>
                    </div>
                  )}

                  {/* Message Footer: Date & Views */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 font-mono">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{msg.date ? new Date(msg.date * 1000).toLocaleString('ar-SA') : ''}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {msg.views !== undefined && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{msg.views}</span>
                        </div>
                      )}
                      {msg.forwards !== undefined && msg.forwards > 0 && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Share2 className="w-3 h-3" />
                          <span>{msg.forwards}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>

        {/* Floating Bottom Bar: Action to Join or Return to Search */}
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 shadow-2xl safe-area-bottom">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {/* Secondary Back Button */}
            <button
              type="button"
              onClick={closePreview}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">رجوع ومتابعة البحث</span>
            </button>

            {/* Primary Action Button (Join or Open) */}
            {isJoined ? (
              <button
                type="button"
                onClick={() => handleOpenChat(previewItem)}
                className="flex-1 py-3 px-5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-98"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>أنت منضم بالفعل • فتح المحادثة الآن</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isJoining}
                onClick={() => handleJoin(previewItem)}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold transition-all shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ الانضمام لقائمة محادثاتك...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>انضمام فوري ({isChannel ? 'Join Channel' : 'Join Group'})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: Search Directory & Results List (قائمة البحث والاستكشاف)
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100" dir="rtl">
      {/* Top Header & Search Hero */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#0b141a]/95 shrink-0">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-white">استكشاف تيليجرام العام</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    MTProto Deep Discovery
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ابحث في شبكة تيليجرام العامة عن قنوات ومجموعات جديدة 100% خارج محادثاتك
                </p>
              </div>
            </div>

            {/* Results counter and Filter Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Exclude Joined Toggle Button */}
              <button
                type="button"
                onClick={handleToggleExcludeJoined}
                title="استبعاد القنوات والمجموعات التي انضممت إليها مسبقاً لعرض كيانات جديدة 100%"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  excludeJoined
                    ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>استبعاد المنضم إليها (100% جديدة)</span>
                {excludeJoined && filteredOutCount > 0 && (
                  <span className="bg-sky-500/30 text-sky-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    +{filteredOutCount} مستبعد
                  </span>
                )}
              </button>

              {hasSearched && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span>النتائج:</span>
                  <span className="text-sky-400 font-bold">{totalResultsCount} نتيجة</span>
                </div>
              )}
            </div>
          </div>

          {/* Search Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، الكلمات الدلالية، المعرف (@username)، أو الرابط الكامل (https://t.me/...)"
              className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 rounded-2xl pr-12 pl-36 py-3.5 text-sm text-white placeholder-slate-400 outline-none transition-all shadow-inner text-right"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-28 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white p-1"
                title="مسح"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute left-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ البحث...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>بحث متعمق</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">اقتراحات سريعة:</span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSearch(s.q)}
                className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Result Filter Tabs (All / Channels / Groups / Users & Bots) */}
          {hasSearched && totalResultsCount > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل ({totalResultsCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('channels')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'channels'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                <span>القنوات العامة ({channels.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('groups')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'groups'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>المجموعات العامة ({groups.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'users'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>الحسابات والبوتات ({users.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Results Feed */}
      <div ref={searchScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Loading Indicator */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/10">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">جارٍ البحث المتعمق في شبكة تيليجرام...</h3>
                <p className="text-xs text-slate-400">
                  يتم استدعاء بروتوكول MTProto Contacts.Search وتصفية الدردشات المنضم إليها تلقائياً
                </p>
              </div>
            </div>
          )}

          {/* Initial State */}
          {!loading && !hasSearched && (
            <div className="py-16 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-2xl">
                <Globe className="w-10 h-10 text-sky-500/60" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-lg font-bold text-white">محرك استكشاف ومعاينة التيليجرام</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ابحث عن قنوات ومجموعات جديدة كلياً لم تنضم إليها بعد، عاين أحدث منشوراتها بضغطة واحدة، وانضم إليها
                  مباشرة دون مغادرة التطبيق.
                </p>
              </div>

              {/* Three Discovery Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-right">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">📢 قنوات عامة جديدة</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    استكشف قنوات الأخبار، التداول، والبرمجة، وتصفح كامل المنشورات بحرية قبل الانضمام.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">👥 مجموعات تفاعلية</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    اعثر على مجتمعات النقاش الحية والمتخصصة مع عدد الأعضاء المحدث مباشرة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">🤖 بوتات وخدمات ذكية</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ابحث عن البوتات المفيدة وأدوات التحميل والذكاء الاصطناعي وتحدث معها فوراً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && hasSearched && totalResultsCount === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">لم يتم العثور على نتائج جديدة لـ "{query}"</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {excludeJoined && filteredOutCount > 0
                    ? `تم استبعاد ${filteredOutCount} محادثة لأنك منضم إليها مسبقاً. يمكنك إلغاء فلتر الاستبعاد لعرضها.`
                    : 'تأكد من كتابة الكلمة بشكل صحيح أو ابحث بالمعرف المباشر (@username).'}
                </p>
                {excludeJoined && filteredOutCount > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleExcludeJoined}
                    className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    عرض النتائج المنضم إليها ({filteredOutCount})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 1: Public Channels (📢 قسم: القنوات العامة الجديدة) */}
          {!loading &&
            hasSearched &&
            channels.length > 0 &&
            (activeFilter === 'all' || activeFilter === 'channels') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-white">📢 القنوات العامة الجديدة (Public Channels)</h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {channels.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {channels.map((ch) => renderResultCard(ch))}
                </div>
              </div>
            )}

          {/* SECTION 2: Public Groups (👥 قسم: المجموعات العامة الجديدة) */}
          {!loading &&
            hasSearched &&
            groups.length > 0 &&
            (activeFilter === 'all' || activeFilter === 'groups') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-white">👥 المجموعات العامة الجديدة (Public Groups)</h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {groups.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {groups.map((grp) => renderResultCard(grp))}
                </div>
              </div>
            )}

          {/* SECTION 3: Users & Bots (🤖 قسم: الحسابات والبوتات) */}
          {!loading &&
            hasSearched &&
            users.length > 0 &&
            (activeFilter === 'all' || activeFilter === 'users') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-white">🤖 الحسابات والبوتات (Users & Bots)</h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {users.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {users.map((u) => renderResultCard(u))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );

  // Individual Search Result Card
  function renderResultCard(item: GlobalSearchResultItem) {
    const isJoined = joinedSet.has(item.id) || item.isJoined;
    const isJoining = joiningId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => openPreview(item)}
        className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between group shadow-lg shadow-black/20 cursor-pointer"
      >
        <div className="flex items-start gap-3.5">
          {/* Avatar / Photo */}
          <div className="relative shrink-0">
            <img
              src={`/api/telegram/avatar/${item.id}`}
              alt=""
              className="w-13 h-13 rounded-2xl object-cover bg-slate-800 border border-slate-700/80 shadow-md"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback Icon */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 font-bold -z-10 absolute inset-0">
              {item.isChannel ? (
                <Megaphone className="w-6 h-6 text-amber-400/80" />
              ) : item.isGroup ? (
                <Users className="w-6 h-6 text-emerald-400/80" />
              ) : item.isBot ? (
                <Bot className="w-6 h-6 text-purple-400/80" />
              ) : (
                <User className="w-6 h-6 text-sky-400/80" />
              )}
            </div>

            {/* Corner Badge */}
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center">
              {item.isChannel ? (
                <Megaphone className="w-3 h-3 text-amber-400" />
              ) : item.isGroup ? (
                <Users className="w-3 h-3 text-emerald-400" />
              ) : item.isBot ? (
                <Bot className="w-3 h-3 text-purple-400" />
              ) : (
                <User className="w-3 h-3 text-sky-400" />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-white truncate max-w-[200px]" title={item.title}>
                {item.title}
              </h3>
              {item.verified && (
                <span title="موثق">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                </span>
              )}
              {item.scam && (
                <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded border border-rose-500/30">
                  احتيال
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {item.username ? (
                <span className="text-sky-400 font-mono text-[11px] truncate">@{item.username}</span>
              ) : (
                <span className="text-slate-500 text-[11px]">مجموعة عامة</span>
              )}

              {item.participantsCount && (
                <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md font-mono">
                  {formatCount(item.participantsCount, item.isChannel ? 'مشترك' : 'عضو')}
                </span>
              )}
            </div>

            {item.about && (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-0.5">{item.about}</p>
            )}
          </div>
        </div>

        {/* Action Buttons: Seamless Preview / Join / Open */}
        <div
          className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview Button */}
          <button
            type="button"
            onClick={() => openPreview(item)}
            className="py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="معاينة محتوى ورسائل القناة دون الخروج"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>معاينة</span>
          </button>

          {/* Join or Open Button */}
          {isJoined ? (
            <button
              type="button"
              onClick={() => handleOpenChat(item)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>منضم (فتح المحادثة)</span>
            </button>
          ) : item.isChannel || item.isGroup ? (
            <button
              type="button"
              disabled={isJoining}
              onClick={() => handleJoin(item)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ الانضمام...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>انضمام (Join)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenChat(item)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{item.isBot ? 'بدء البوت' : 'محادثة (Chat)'}</span>
            </button>
          )}

          {/* External Telegram link */}
          {item.username && (
            <a
              href={`https://t.me/${item.username}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors shrink-0"
              title="فتح في تطبيق تيليجرام الخارجي"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }
};
