import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  TelegramAuthStatus,
  TelegramUser,
  TelegramDialog,
  TelegramMessage,
  TelegramContact,
  TelegramSessionDevice,
  BookmarkedMessage,
  MonitoredKeyword,
  KeywordAlert,
  ClipboardItem,
  PaymentTransaction,
  AiChannelMatch,
  AiReplyOptions,
  AiExtractionResult,
  AiCommandResult,
  WorkspaceTab,
  SmartFolder,
  GlobalSearchResponse,
  GlobalSearchResultItem,
} from '../types/telegram.js';
import { safeString } from '../utils/safeRender.js';

export type { WorkspaceTab } from '../types/telegram.js';

export function areChatIdsEqual(id1?: string | null, id2?: string | null): boolean {
  if (!id1 || !id2) return false;
  if (id1 === id2) return true;
  const clean1 = id1.replace(/^-100/, '').replace(/^-/, '');
  const clean2 = id2.replace(/^-100/, '').replace(/^-/, '');
  return clean1 === clean2;
}

interface TelegramContextType {
  status: TelegramAuthStatus | null;
  loading: boolean;
  wsConnected: boolean;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;

  // Chats & Messages
  dialogs: TelegramDialog[];
  loadingDialogs: boolean;
  selectedChatId: string | null;
  activeChat: TelegramDialog | null;
  messages: TelegramMessage[];
  loadingMessages: boolean;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  loadOlderMessages: (chatId?: string) => Promise<boolean>;
  selectChat: (chatId: string) => void;
  sendMessage: (text: string, replyTo?: number) => Promise<boolean>;
  sendFile: (file: File, caption?: string, replyTo?: number) => Promise<boolean>;
  markAsRead: (chatId: string, maxId?: number, remainingUnreadCount?: number) => Promise<void>;
  markAllAsRead: () => Promise<boolean>;
  refreshDialogs: () => Promise<void>;
  refreshMessages: (chatId?: string) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedFilter: 'all' | 'users' | 'groups' | 'channels' | 'unread';
  setSelectedFilter: (f: 'all' | 'users' | 'groups' | 'channels' | 'unread') => void;

  // Smart Folders & AI Categorization
  folders: SmartFolder[];
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  isCategorizingWithAi: boolean;
  autoCategorizeWithAi: () => Promise<boolean>;
  createCustomFolder: (title: string, icon: string, chatIds?: string[]) => void;
  deleteCustomFolder: (folderId: string) => void;
  toggleChatInFolder: (folderId: string, chatId: string) => void;
  resetFoldersToDefault: () => void;

  // Multi-select & Bulk operations
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (active: boolean) => void;
  selectedMessageIds: number[];
  toggleSelectMessage: (msgId: number) => void;
  selectAllMessages: () => void;
  clearSelection: () => void;
  forwardMessagesTo: (toChatId: string, messageIds?: number[]) => Promise<boolean>;
  deleteSelectedMessages: (revoke?: boolean) => Promise<boolean>;
  deleteSingleMessage: (chatId: string, messageId: number, revoke?: boolean) => Promise<boolean>;
  reactToMessage: (chatId: string, messageId: number, emoji: string) => Promise<boolean>;
  pinMessage: (chatId: string, messageId: number, unpin?: boolean) => Promise<boolean>;

  // Forwarding Modal
  forwardModalOpen: boolean;
  setForwardModalOpen: (open: boolean) => void;
  messagesToForward: number[];
  setMessagesToForward: (ids: number[]) => void;

  // Bookmarks & Collections
  bookmarks: BookmarkedMessage[];
  loadingBookmarks: boolean;
  fetchBookmarks: () => Promise<void>;
  addBookmark: (msg: TelegramMessage, collection?: string) => Promise<boolean>;
  removeBookmark: (id: string) => Promise<boolean>;
  updateBookmarkCollection: (id: string, collection: string) => Promise<boolean>;

  // Keywords & Real-time Alerts
  keywords: MonitoredKeyword[];
  loadingKeywords: boolean;
  alerts: KeywordAlert[];
  fetchKeywords: () => Promise<void>;
  addKeyword: (kw: string) => Promise<boolean>;
  removeKeyword: (id: string) => Promise<boolean>;
  fetchAlerts: () => Promise<void>;
  markAlertsAsRead: () => Promise<void>;

  // Clipboard Manager
  clipboard: ClipboardItem[];
  fetchClipboard: () => Promise<void>;
  copyToClipboard: (text: string, sourceChat?: string) => Promise<void>;
  clearClipboard: () => Promise<void>;
  clipboardModalOpen: boolean;
  setClipboardModalOpen: (open: boolean) => void;

  // AI Tools
  aiLoading: boolean;
  generateReplies: (text: string, chatTitle?: string, senderName?: string) => Promise<AiReplyOptions | null>;
  summarizeMessages: (msgs: TelegramMessage[]) => Promise<{ summary: string; keyPoints: string[]; sentiment?: string } | null>;
  translateText: (text: string, targetLanguage?: string) => Promise<string | null>;
  extractInfo: (text: string) => Promise<AiExtractionResult | null>;
  findChannelsAi: (query: string) => Promise<AiChannelMatch[]>;
  executeCommand: (command: string) => Promise<AiCommandResult | null>;
  aiReply: (text: string, tone?: string, lang?: string) => Promise<string | null>;
  summarizeMessage: (text: string) => Promise<string | null>;
  translateMessage: (text: string, targetLang?: string) => Promise<string | null>;
  rewriteMessage: (text: string, style?: string) => Promise<string | null>;
  extractEntities: (text: string) => Promise<any>;
  explainMessage: (text: string) => Promise<string | null>;

  // Global Search
  searchGlobalMessages: (query: string) => Promise<TelegramMessage[]>;
  searchGlobalDirectory: (query: string, excludeJoined?: boolean) => Promise<GlobalSearchResponse | null>;
  joinChannel: (channelId: string, username?: string | null) => Promise<boolean>;

  // Contacts & Sessions
  contacts: TelegramContact[];
  loadingContacts: boolean;
  fetchContacts: () => Promise<void>;
  sessions: TelegramSessionDevice[];
  loadingSessions: boolean;
  fetchSessions: () => Promise<void>;

  // Payments
  payments: PaymentTransaction[];
  transactions: PaymentTransaction[];
  loadingPayments: boolean;
  fetchPayments: () => Promise<void>;
  createPaymentOrder: (params: { planName: string; amount: number; currency?: string; provider?: any }) => Promise<PaymentTransaction | null>;
  createPayment: (amount: number, currency: string, method: string, description: string) => Promise<PaymentTransaction | null>;

  // Device Experience (Desktop vs Mobile)
  deviceMode: 'auto' | 'desktop' | 'mobile';
  isMobile: boolean;
  setDeviceMode: (mode: 'auto' | 'desktop' | 'mobile') => void;

  // Command Center modal
  commandCenterOpen: boolean;
  setCommandCenterOpen: (open: boolean) => void;

  // Auth & General
  refreshStatus: () => Promise<void>;
  startQrLogin: (force?: boolean) => Promise<void>;
  submit2FA: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  clearNotification: () => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<TelegramAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chats');

  // Dialogs & Chat
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [loadingDialogs, setLoadingDialogs] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(true);
  const loadingOlderRef = useRef(false);
  const messagesRef = useRef<TelegramMessage[]>([]);
  messagesRef.current = messages;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'users' | 'groups' | 'channels' | 'unread'>('all');

  // Smart Folders & AI Categorization
  const DEFAULT_FOLDERS = useMemo<SmartFolder[]>(
    () => [
      { id: 'all', title: 'الكل', icon: '💬', filterType: 'all', chatIds: [] },
      { id: 'channels', title: 'القنوات', icon: '📢', filterType: 'channels', chatIds: [] },
      { id: 'groups', title: 'المجموعات', icon: '👥', filterType: 'groups', chatIds: [] },
      { id: 'users', title: 'خاص', icon: '👤', filterType: 'users', chatIds: [] },
      { id: 'unread', title: 'غير مقروء', icon: '🔔', filterType: 'unread', chatIds: [] },
    ],
    []
  );

  const [folders, setFolders] = useState<SmartFolder[]>(() => {
    try {
      const saved = localStorage.getItem('tg_smart_folders_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'all', title: 'الكل', icon: '💬', filterType: 'all', chatIds: [] },
      { id: 'channels', title: 'القنوات', icon: '📢', filterType: 'channels', chatIds: [] },
      { id: 'groups', title: 'المجموعات', icon: '👥', filterType: 'groups', chatIds: [] },
      { id: 'users', title: 'خاص', icon: '👤', filterType: 'users', chatIds: [] },
      { id: 'unread', title: 'غير مقروء', icon: '🔔', filterType: 'unread', chatIds: [] },
    ];
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [isCategorizingWithAi, setIsCategorizingWithAi] = useState<boolean>(false);

  // Multi-select & Forwarding
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<number[]>([]);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Keywords & Alerts
  const [keywords, setKeywords] = useState<MonitoredKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);

  // Clipboard
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);
  const [clipboardModalOpen, setClipboardModalOpen] = useState(false);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);

  // Contacts & Sessions & Payments
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sessions, setSessions] = useState<TelegramSessionDevice[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Responsive Device Experience (Desktop vs Mobile)
  const [deviceMode, setDeviceModeState] = useState<'auto' | 'desktop' | 'mobile'>(() => {
    const saved = localStorage.getItem('tg_device_mode');
    if (saved === 'desktop' || saved === 'mobile' || saved === 'auto') return saved;
    return 'auto';
  });
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setDeviceMode = useCallback((mode: 'auto' | 'desktop' | 'mobile') => {
    setDeviceModeState(mode);
    localStorage.setItem('tg_device_mode', mode);
  }, []);

  const isMobile =
    deviceMode === 'mobile'
      ? true
      : deviceMode === 'desktop'
      ? false
      : windowWidth < 768;

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  selectedChatIdRef.current = selectedChatId;

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Fetch status
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Telegram status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Dialogs (Real Telegram Channels, Groups, Direct Chats)
  const refreshDialogs = useCallback(async () => {
    if (!status?.isAuthenticated) return;
    setLoadingDialogs(true);
    try {
      const res = await fetch('/api/telegram/dialogs?limit=500&archived=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.dialogs)) {
        setDialogs(data.dialogs);
        // Only auto-select first chat if on desktop and nothing is currently selected.
        // On mobile, keep selectedChatId null so user sees the channel list initially.
        if (!isMobile && !selectedChatIdRef.current && data.dialogs.length > 0) {
          setSelectedChatId(data.dialogs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dialogs:', err);
    } finally {
      setLoadingDialogs(false);
    }
  }, [status?.isAuthenticated, isMobile]);

  // Smart Folder Management & AI Auto-Categorization
  const autoCategorizeWithAi = useCallback(async (): Promise<boolean> => {
    if (dialogs.length === 0) {
      showNotification('info', 'لا توجد قنوات أو محادثات متاحة لتصنيفها حالياً');
      return false;
    }
    setIsCategorizingWithAi(true);
    try {
      const payload = dialogs.map((d) => ({
        id: d.id,
        title: d.title,
        username: d.username,
        type: d.type,
        isChannel: d.isChannel,
        isGroup: d.isGroup,
        isUser: d.isUser,
        lastMessageSnippet: d.lastMessage?.text || '',
      }));

      const res = await fetch('/api/ai/categorize-dialogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialogs: payload }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        const aiSmartFolders: SmartFolder[] = data.categories.map((c: any) => ({
          id: `ai_${c.id || Math.random().toString(36).slice(2, 7)}`,
          title: c.title,
          icon: c.icon || '📁',
          description: c.description || '',
          isAiGenerated: true,
          chatIds: Array.isArray(c.chatIds) ? c.chatIds.map(String) : [],
          filterType: 'ai' as const,
        }));

        const customFolders = folders.filter((f) => f.isCustom);
        const updatedFolders = [...DEFAULT_FOLDERS, ...aiSmartFolders, ...customFolders];
        setFolders(updatedFolders);
        localStorage.setItem('tg_smart_folders_v2', JSON.stringify(updatedFolders));
        showNotification('success', `✨ تم فرز وتصنيف ${dialogs.length} قناة ومحادثة إلى ${aiSmartFolders.length} مجلدات ذكية بنجاح!`);
        return true;
      } else {
        showNotification('error', 'تعذر فرز القنوات بالذكاء الاصطناعي');
        return false;
      }
    } catch (err: any) {
      console.error('AI categorization error:', err);
      showNotification('error', 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي');
      return false;
    } finally {
      setIsCategorizingWithAi(false);
    }
  }, [dialogs, folders, DEFAULT_FOLDERS, showNotification]);

  const createCustomFolder = useCallback((title: string, icon: string = '📁', chatIds: string[] = []) => {
    if (!title.trim()) return;
    const newFolder: SmartFolder = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      icon: icon || '📁',
      isCustom: true,
      chatIds,
      filterType: 'custom',
    };
    setFolders((prev) => {
      const next = [...prev, newFolder];
      localStorage.setItem('tg_smart_folders_v2', JSON.stringify(next));
      return next;
    });
    showNotification('success', `تم إنشاء المجلد "${title}" بنجاح`);
  }, [showNotification]);

  const deleteCustomFolder = useCallback((folderId: string) => {
    setFolders((prev) => {
      const next = prev.filter((f) => f.id !== folderId);
      localStorage.setItem('tg_smart_folders_v2', JSON.stringify(next));
      return next;
    });
    if (selectedFolderId === folderId) {
      setSelectedFolderId('all');
    }
    showNotification('info', 'تم حذف المجلد');
  }, [selectedFolderId, showNotification]);

  const toggleChatInFolder = useCallback((folderId: string, chatId: string) => {
    setFolders((prev) => {
      const next = prev.map((f) => {
        if (f.id === folderId) {
          const exists = f.chatIds.some((id) => areChatIdsEqual(id, chatId));
          const updatedChatIds = exists
            ? f.chatIds.filter((id) => !areChatIdsEqual(id, chatId))
            : [...f.chatIds, chatId];
          return { ...f, chatIds: updatedChatIds };
        }
        return f;
      });
      localStorage.setItem('tg_smart_folders_v2', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetFoldersToDefault = useCallback(() => {
    setFolders(DEFAULT_FOLDERS);
    localStorage.setItem('tg_smart_folders_v2', JSON.stringify(DEFAULT_FOLDERS));
    setSelectedFolderId('all');
    showNotification('info', 'تمت استعادة التبويبات الافتراضية');
  }, [DEFAULT_FOLDERS, showNotification]);

  // Fetch Messages for active chat
  const refreshMessages = useCallback(async (chatId?: string) => {
    const targetId = chatId || selectedChatIdRef.current;
    if (!targetId || !status?.isAuthenticated) return;

    setLoadingMessages(true);
    setHasMoreOlderMessages(true);
    try {
      const res = await fetch(`/api/telegram/messages/${encodeURIComponent(targetId)}?limit=50`);
      const data = await res.json();
      // Ensure targetId matches current selected chat to prevent race condition
      if (data.success && Array.isArray(data.messages) && selectedChatIdRef.current && areChatIdsEqual(targetId, selectedChatIdRef.current)) {
        // Reverse array so messages are stored in chronological order [oldest, ..., newest]
        const chronological = [...data.messages].reverse();
        // Strict deduplication by ID
        const seen = new Set<number>();
        const deduped: TelegramMessage[] = [];
        for (const m of chronological) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            deduped.push(m);
          }
        }
        console.log(`[Frontend Message Updated] Loaded ${deduped.length} messages for chat ${targetId}`);
        setMessages(deduped);
        if (data.messages.length < 50) {
          setHasMoreOlderMessages(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (selectedChatIdRef.current && areChatIdsEqual(targetId, selectedChatIdRef.current)) {
        setLoadingMessages(false);
      }
    }
  }, [status?.isAuthenticated]);

  // Load older messages (Pagination / Infinite scroll upwards)
  const loadOlderMessages = useCallback(async (chatId?: string): Promise<boolean> => {
    const targetId = chatId || selectedChatIdRef.current;
    if (!targetId || !status?.isAuthenticated || loadingOlderRef.current) return false;

    const currentMsgs = messagesRef.current;
    if (currentMsgs.length === 0) return false;

    // The oldest real message ID is the minimum id (> 0)
    const validIds = currentMsgs.map((m) => m.id).filter((id) => id > 0);
    if (validIds.length === 0) return false;
    const oldestId = Math.min(...validIds);

    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);

    try {
      console.log(`[Pagination] Fetching older messages for chat ${targetId} prior to message #${oldestId}...`);
      const res = await fetch(
        `/api/telegram/messages/${encodeURIComponent(targetId)}?limit=40&offsetId=${oldestId}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        if (data.messages.length === 0) {
          console.log(`[Pagination] Reached oldest message for chat ${targetId}`);
          setHasMoreOlderMessages(false);
          return false;
        }

        // data.messages is returned newest-first for that slice, so reverse it to get chronological order
        const chronologicalOlder = [...data.messages].reverse();

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUniqueOlder = chronologicalOlder.filter((m) => !existingIds.has(m.id));
          if (newUniqueOlder.length === 0) {
            setHasMoreOlderMessages(false);
            return prev;
          }
          console.log(`[Pagination] Prepending ${newUniqueOlder.length} older messages (Total: ${prev.length + newUniqueOlder.length})`);
          return [...newUniqueOlder, ...prev];
        });

        if (data.messages.length < 40) {
          setHasMoreOlderMessages(false);
        }
        return true;
      } else {
        setHasMoreOlderMessages(false);
        return false;
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
      return false;
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [status?.isAuthenticated]);

  // Select Chat with instant memory clearing & state sync
  const selectChat = useCallback((chatId: string) => {
    if (!chatId) {
      setSelectedChatId(null);
      selectedChatIdRef.current = null;
      setMessages([]);
      setSelectedMessageIds([]);
      setIsMultiSelectMode(false);
      return;
    }

    // Instantly reset messages and update selected ID
    setSelectedChatId(chatId);
    selectedChatIdRef.current = chatId;
    setMessages([]);
    setSelectedMessageIds([]);
    setIsMultiSelectMode(false);
    refreshMessages(chatId);
  }, [refreshMessages]);

  // Bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      setLoadingBookmarks(true);
      const res = await fetch('/api/workspace/bookmarks');
      const data = await res.json();
      if (data.success) {
        setBookmarks(data.bookmarks);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setLoadingBookmarks(false);
    }
  }, []);

  const addBookmark = useCallback(async (msg: TelegramMessage, collection: string = 'Favorites'): Promise<boolean> => {
    try {
      const activeD = dialogs.find((d) => d.id === msg.chatId);
      const res = await fetch('/api/workspace/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: msg.chatId,
          chatTitle: activeD?.title || 'Chat ' + msg.chatId,
          messageId: msg.id,
          text: msg.text || (msg.media ? '[Media Attachment]' : ''),
          senderName: msg.senderName || 'Sender',
          date: msg.date,
          collection,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Saved message to "${collection}"`);
        fetchBookmarks();
        return true;
      }
    } catch (err) {
      showNotification('error', 'Failed to bookmark message');
    }
    return false;
  }, [dialogs, fetchBookmarks, showNotification]);

  const removeBookmark = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workspace/bookmarks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchBookmarks();
        showNotification('info', 'Message removed from saved collection');
        return true;
      }
    } catch (err) {
      showNotification('error', 'Failed to remove bookmark');
    }
    return false;
  }, [fetchBookmarks, showNotification]);

  const updateBookmarkCollection = useCallback(async (id: string, collection: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workspace/bookmarks/${id}/collection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookmarks();
        return true;
      }
    } catch (err) {
      console.error('Failed to update bookmark collection:', err);
    }
    return false;
  }, [fetchBookmarks]);

  // Keywords & Alerts
  const fetchKeywords = useCallback(async () => {
    try {
      setLoadingKeywords(true);
      const res = await fetch('/api/workspace/keywords');
      const data = await res.json();
      if (data.success) setKeywords(data.keywords);
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
    } finally {
      setLoadingKeywords(false);
    }
  }, []);

  const addKeyword = useCallback(async (kw: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/workspace/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      });
      const data = await res.json();
      if (data.success) {
        fetchKeywords();
        showNotification('success', `Added keyword "${kw}" to real-time monitor`);
        return true;
      }
    } catch (err) {
      showNotification('error', 'Failed to add keyword');
    }
    return false;
  }, [fetchKeywords, showNotification]);

  const removeKeyword = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workspace/keywords/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchKeywords();
        showNotification('info', 'Keyword removed from monitor');
        return true;
      }
    } catch (err) {
      showNotification('error', 'Failed to remove keyword');
    }
    return false;
  }, [fetchKeywords, showNotification]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/alerts');
      const data = await res.json();
      if (data.success) setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, []);

  const markAlertsAsRead = useCallback(async () => {
    try {
      await fetch('/api/workspace/alerts/read', { method: 'POST' });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      console.error('Failed to mark alerts read:', err);
    }
  }, []);

  // Clipboard Manager
  const fetchClipboard = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/clipboard');
      const data = await res.json();
      if (data.success) setClipboard(data.items);
    } catch (err) {
      console.error('Failed to fetch clipboard:', err);
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string, sourceChat?: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      showNotification('success', 'Copied to clipboard!');

      // Save to project internal clipboard manager
      await fetch('/api/workspace/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceChat }),
      });
      fetchClipboard();
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [fetchClipboard, showNotification]);

  const clearClipboard = useCallback(async () => {
    try {
      await fetch('/api/workspace/clipboard', { method: 'DELETE' });
      setClipboard([]);
      showNotification('info', 'Clipboard history cleared');
    } catch (err) {
      console.error('Failed to clear clipboard:', err);
    }
  }, [showNotification]);

  // AI Tools
  const generateReplies = useCallback(async (text: string, chatTitle?: string, senderName?: string): Promise<AiReplyOptions | null> => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: text, chatTitle, senderName }),
      });
      const data = await res.json();
      if (data.success) return data.replies;
    } catch (err) {
      console.error('Failed to generate AI replies:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const summarizeMessages = useCallback(async (msgs: TelegramMessage[]) => {
    try {
      setAiLoading(true);
      const payload = msgs.map((m) => ({
        sender: m.senderName || (m.out ? 'Me' : 'User'),
        text: m.text,
        date: new Date(m.date * 1000).toLocaleString(),
      }));

      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json();
      if (data.success) return data.result;
    } catch (err) {
      console.error('Failed to summarize messages:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const translateText = useCallback(async (text: string, targetLanguage: string = 'Arabic') => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage }),
      });
      const data = await res.json();
      if (data.success) return data.result.translatedText;
    } catch (err) {
      console.error('Failed to translate text:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const extractInfo = useCallback(async (text: string): Promise<AiExtractionResult | null> => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) return data.entities;
    } catch (err) {
      console.error('Failed to extract info:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const findChannelsAi = useCallback(async (query: string): Promise<AiChannelMatch[]> => {
    try {
      setAiLoading(true);
      const channelsList = dialogs.filter((d) => d.isChannel || d.isGroup);
      const res = await fetch('/api/ai/find-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, channels: channelsList }),
      });
      const data = await res.json();
      if (data.success) return data.matches;
    } catch (err) {
      console.error('Failed to find channels with AI:', err);
    } finally {
      setAiLoading(false);
    }
    return [];
  }, [dialogs]);

  const executeCommand = useCallback(async (command: string): Promise<AiCommandResult | null> => {
    try {
      setAiLoading(true);
      const activeD = dialogs.find((d) => d.id === selectedChatId);
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          activeChatTitle: activeD?.title,
          selectedCount: selectedMessageIds.length,
        }),
      });
      const data = await res.json();
      if (data.success) return data.parsed;
    } catch (err) {
      console.error('Failed to parse command:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, [dialogs, selectedChatId, selectedMessageIds.length]);

  const aiReply = useCallback(async (text: string, tone: string = 'brief', lang: string = 'ar'): Promise<string | null> => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/reply-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tone, lang }),
      });
      const data = await res.json();
      if (data.success && data.reply) return data.reply;
      // fallback to generateReplies if needed
      const replies = await generateReplies(text);
      if (replies) {
        if (tone === 'official') return replies.formal;
        if (tone === 'friendly') return replies.friendly;
        if (tone === 'professional') return replies.professional;
        return replies.short || replies.arabic;
      }
    } catch (err) {
      console.error('Failed aiReply:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, [generateReplies]);

  const summarizeMessage = useCallback(async (text: string): Promise<string | null> => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ text, sender: 'User', date: new Date().toISOString() }] }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        return `${data.result.summary}\n\n• ${data.result.keyPoints?.join('\n• ')}`;
      }
    } catch (err) {
      console.error('Failed to summarize single message:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const translateMessage = useCallback(async (text: string, targetLang: string = 'Arabic'): Promise<string | null> => {
    return translateText(text, targetLang);
  }, [translateText]);

  const rewriteMessage = useCallback(async (text: string, style: string = 'official'): Promise<string | null> => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      });
      const data = await res.json();
      if (data.success && data.rewritten) return data.rewritten;
    } catch (err) {
      console.error('Failed to rewrite message:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const extractEntities = useCallback(async (text: string): Promise<any> => {
    return extractInfo(text);
  }, [extractInfo]);

  const explainMessage = useCallback(async (text: string): Promise<string | null> => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.explanation) return data.explanation;
    } catch (err) {
      console.error('Failed to explain message:', err);
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  // Global Message Search
  const searchGlobalMessages = useCallback(async (query: string): Promise<TelegramMessage[]> => {
    try {
      const res = await fetch(`/api/telegram/messages/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) return data.messages;
    } catch (err) {
      console.error('Global search error:', err);
    }
    return [];
  }, []);

  // Global Directory Search across all Public Telegram channels, groups, and users
  const searchGlobalDirectory = useCallback(async (query: string, excludeJoined: boolean = true): Promise<GlobalSearchResponse | null> => {
    try {
      const res = await fetch(`/api/telegram/global-search?q=${encodeURIComponent(query)}&excludeJoined=${excludeJoined}`);
      const data = await res.json();
      if (data.success) return data as GlobalSearchResponse;
      return null;
    } catch (err) {
      console.error('Directory global search error:', err);
      return null;
    }
  }, []);

  // Join Channel or Public Group
  const joinChannel = useCallback(async (channelId: string, username?: string | null): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/channels/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, username }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'تم الانضمام للقناة بنجاح ✓');
        await refreshDialogs();
        return true;
      } else {
        showNotification('error', data.error || 'تعذر الانضمام إلى القناة');
        return false;
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'فشل الاتصال بالخادم للانضمام');
      return false;
    }
  }, [showNotification, refreshDialogs]);

  // Multi-select actions
  const toggleSelectMessage = useCallback((msgId: number) => {
    setSelectedMessageIds((prev) => {
      if (prev.includes(msgId)) {
        const next = prev.filter((id) => id !== msgId);
        if (next.length === 0) setIsMultiSelectMode(false);
        return next;
      } else {
        setIsMultiSelectMode(true);
        return [...prev, msgId];
      }
    });
  }, []);

  const selectAllMessages = useCallback(() => {
    setIsMultiSelectMode(true);
    setSelectedMessageIds(messages.map((m) => m.id));
  }, [messages]);

  const clearSelection = useCallback(() => {
    setSelectedMessageIds([]);
    setIsMultiSelectMode(false);
  }, []);

  // Real MTProto Forwarding
  const forwardMessagesTo = useCallback(async (toChatId: string, messageIds?: number[]): Promise<boolean> => {
    const ids = messageIds || selectedMessageIds;
    const fromChat = selectedChatIdRef.current;
    if (!fromChat || ids.length === 0) {
      showNotification('error', 'No messages selected to forward');
      return false;
    }

    try {
      const res = await fetch('/api/telegram/messages/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChatId: fromChat,
          toChatId,
          messageIds: ids,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Forwarded ${ids.length} message(s) successfully!`);
        clearSelection();
        setForwardModalOpen(false);
        return true;
      } else {
        showNotification('error', data.error || 'Failed to forward messages');
      }
    } catch (err) {
      showNotification('error', 'Forwarding failed');
    }
    return false;
  }, [selectedMessageIds, clearSelection, showNotification]);

  // Real MTProto Deletion
  const deleteSelectedMessages = useCallback(async (revoke: boolean = true): Promise<boolean> => {
    const fromChat = selectedChatIdRef.current;
    if (!fromChat || selectedMessageIds.length === 0) return false;

    try {
      const res = await fetch('/api/telegram/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: fromChat,
          messageIds: selectedMessageIds,
          revoke,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Deleted ${selectedMessageIds.length} message(s)`);
        setMessages((prev) => prev.filter((m) => !selectedMessageIds.includes(m.id)));
        clearSelection();
        return true;
      }
    } catch (err) {
      showNotification('error', 'Failed to delete messages');
    }
    return false;
  }, [selectedMessageIds, clearSelection, showNotification]);

  // Delete Single Message
  const deleteSingleMessage = useCallback(async (chatId: string, messageId: number, revoke = true): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messageIds: [messageId],
          revoke,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'تم حذف الرسالة بنجاح');
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return true;
      } else {
        showNotification('error', data.error || 'تعذر حذف الرسالة');
      }
    } catch (err) {
      showNotification('error', 'تعذر حذف الرسالة');
    }
    return false;
  }, [showNotification]);

  // React to message
  const reactToMessage = useCallback(async (chatId: string, messageId: number, emoji: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, messageId, emoji }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `تم التفاعل بـ ${emoji}`);
        return true;
      } else {
        showNotification('error', data.error || 'تعذر إضافة التفاعل');
      }
    } catch (err) {
      console.warn('React error:', err);
    }
    return false;
  }, [showNotification]);

  // Pin / Unpin message
  const pinMessage = useCallback(async (chatId: string, messageId: number, unpin = false): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/messages/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, messageId, unpin }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', unpin ? 'تم إلغاء تثبيت الرسالة' : 'تم تثبيت الرسالة');
        return true;
      } else {
        showNotification('error', data.error || 'تعذر تثبيت الرسالة');
      }
    } catch (err) {
      showNotification('error', 'تعذر تثبيت الرسالة');
    }
    return false;
  }, [showNotification]);

  // Send message
  const sendMessage = useCallback(async (text: string, replyTo?: number): Promise<boolean> => {
    const chatId = selectedChatIdRef.current;
    if (!chatId || !text.trim()) return false;

    const trimmed = text.trim();
    const tempId = -Date.now();
    const now = Date.now();

    const optimisticMsg: TelegramMessage = {
      id: tempId,
      chatId,
      text: trimmed,
      date: now,
      out: true,
      replyToMsgId: replyTo || null,
      sending: true,
      failed: false,
    };

    console.log(`[Frontend Send Requested] Temp ID: ${tempId}, Chat: ${chatId}, Text: "${trimmed.slice(0, 30)}"`);

    // 1. Instantly append optimistic message to end of chronological list
    setMessages((prev) => [...prev, optimisticMsg]);

    // 2. Instantly update dialogs list with lastMessage and bump to top
    setDialogs((prev) => {
      let found = false;
      const updated = prev.map((d) => {
        if (areChatIdsEqual(d.id, chatId)) {
          found = true;
          return {
            ...d,
            date: now,
            lastMessage: {
              id: tempId,
              text: trimmed,
              date: now,
              out: true,
              media: false,
            },
          };
        }
        return d;
      });

      if (!found) {
        refreshDialogs();
        return prev;
      }

      console.log(`[Frontend Chat Last Message Updated] Chat: ${chatId}, Last Message: "${trimmed.slice(0, 30)}"`);
      return [...updated].sort((a, b) => (b.date || 0) - (a.date || 0));
    });

    try {
      const res = await fetch('/api/telegram/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: trimmed, replyTo }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        console.log(`[Frontend Telegram Send Result] Confirmed Real ID: ${data.message.id} for Chat: ${chatId}`);

        // Replace temporary optimistic message with confirmed Telegram message safely
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId && m.id !== data.message.id);
          return [...filtered, { ...data.message, sending: false, failed: false }];
        });

        // Update dialog lastMessage with real ID
        setDialogs((prev) =>
          prev.map((d) => {
            if (areChatIdsEqual(d.id, chatId)) {
              return {
                ...d,
                date: data.message.date || now,
                lastMessage: {
                  id: data.message.id,
                  text: data.message.text || trimmed,
                  date: data.message.date || now,
                  out: true,
                  media: false,
                },
              };
            }
            return d;
          })
        );

        return true;
      } else {
        const errMsg = data.error || 'فشل إرسال الرسالة إلى تليجرام';
        showNotification('error', errMsg);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, sending: false, failed: true } : m))
        );
        return false;
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'خطأ في الاتصال بالخادم');
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, sending: false, failed: true } : m))
      );
      return false;
    }
  }, [refreshDialogs, showNotification]);

  // Send file
  const sendFile = useCallback(async (file: File, caption?: string, replyTo?: number): Promise<boolean> => {
    const chatId = selectedChatIdRef.current;
    if (!chatId) return false;

    const tempId = -Date.now();
    const now = Date.now();
    const isImage = file.type.startsWith('image/');
    const previewText = caption || (isImage ? '📷 صورة' : `📄 ${file.name}`);

    const optimisticMsg: TelegramMessage = {
      id: tempId,
      chatId,
      text: previewText,
      date: now,
      out: true,
      replyToMsgId: replyTo || null,
      sending: true,
      failed: false,
      media: {
        type: isImage ? 'MessageMediaPhoto' : 'MessageMediaDocument',
        hasPhoto: isImage,
        hasDocument: !isImage,
        fileName: file.name,
        size: file.size,
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setDialogs((prev) => {
      let found = false;
      const updated = prev.map((d) => {
        if (areChatIdsEqual(d.id, chatId)) {
          found = true;
          return {
            ...d,
            date: now,
            lastMessage: {
              id: tempId,
              text: previewText,
              date: now,
              out: true,
              media: true,
              mediaType: isImage ? 'Photo' : 'Document',
            },
          };
        }
        return d;
      });
      if (!found) {
        refreshDialogs();
        return prev;
      }
      return [...updated].sort((a, b) => (b.date || 0) - (a.date || 0));
    });

    try {
      showNotification('info', `جاري رفع وإرسال: ${file.name}...`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);
      if (caption) formData.append('caption', caption);
      if (replyTo) formData.append('replyTo', replyTo.toString());

      const res = await fetch('/api/telegram/messages/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.message) {
        showNotification('success', `تم إرسال ${file.name}`);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId && m.id !== data.message.id);
          return [...filtered, { ...data.message, sending: false, failed: false }];
        });
        return true;
      } else {
        showNotification('error', data.error || 'فشل رفع وإرسال الملف');
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, sending: false, failed: true } : m))
        );
        return false;
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'خطأ أثناء رفع الملف');
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, sending: false, failed: true } : m))
      );
      return false;
    }
  }, [refreshDialogs, showNotification]);

  // Mark as read
  const markAsRead = useCallback(async (chatId: string, maxId?: number, remainingUnreadCount?: number) => {
    try {
      // 1. Instantly update dialog unreadCount in state
      setDialogs((prev) =>
        prev.map((d) => {
          if (areChatIdsEqual(d.id, chatId)) {
            const newCount = remainingUnreadCount !== undefined ? Math.max(0, remainingUnreadCount) : 0;
            return {
              ...d,
              unreadCount: newCount,
              unreadMentionsCount: newCount === 0 ? 0 : d.unreadMentionsCount,
            };
          }
          return d;
        })
      );

      // 2. Call Telegram backend API
      await fetch('/api/telegram/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, maxId }),
      });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }, []);

  // Mark all chats/dialogs as read (Batch Mark-as-read with Optimistic UI)
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    // 1. Identify dialogs with unread messages or mentions
    const unreadDialogs = dialogs.filter(
      (d) => (d.unreadCount || 0) > 0 || (d.unreadMentionsCount || 0) > 0
    );
    const unreadChatIds = unreadDialogs.map((d) => d.id);

    if (unreadChatIds.length === 0) {
      showNotification('info', 'جميع المحادثات والقنوات مقروءة بالفعل ✓');
      return true;
    }

    // 2. Instant Optimistic UI Update: zero out all unread badges immediately
    setDialogs((prev) =>
      prev.map((d) => ({
        ...d,
        unreadCount: 0,
        unreadMentionsCount: 0,
      }))
    );

    // 3. User feedback toast
    showNotification('success', 'تم تمييز جميع الرسائل كمقروءة بنجاح ✓');

    // 4. Background MTProto request to persist read state across Telegram
    try {
      await fetch('/api/telegram/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds: unreadChatIds }),
      });
    } catch (err) {
      console.warn('[Telegram Background Read-All Error]:', err);
    }

    return true;
  }, [dialogs, showNotification]);

  // Contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await fetch('/api/telegram/contacts');
      const data = await res.json();
      if (data.success && Array.isArray(data.contacts)) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/telegram/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.authorizations)) {
        setSessions(data.authorizations);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const res = await fetch('/api/workspace/payments');
      const data = await res.json();
      if (data.success) setPayments(data.payments);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const createPaymentOrder = useCallback(async (params: { planName: string; amount: number; currency?: string; provider?: any }) => {
    try {
      const res = await fetch('/api/workspace/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
        return data.transaction;
      }
    } catch (err) {
      console.error('Failed to create payment order:', err);
    }
    return null;
  }, [fetchPayments]);

  const createPayment = useCallback(async (amount: number, currency: string, method: string, description: string) => {
    return createPaymentOrder({
      planName: description,
      amount,
      currency,
      provider: method,
    });
  }, [createPaymentOrder]);

  // QR Login Start
  const startQrLogin = useCallback(async (force = false) => {
    try {
      const res = await fetch('/api/telegram/auth/qr/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to start QR login:', err);
    }
  }, []);

  // 2FA Password Submit
  const submit2FA = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.error('Failed to submit 2FA:', err);
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/telegram/logout', { method: 'POST' });
      setStatus((prev) => (prev ? { ...prev, isAuthenticated: false, user: null } : null));
      setDialogs([]);
      setMessages([]);
      setSelectedChatId(null);
      showNotification('info', 'Logged out of Telegram');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [showNotification]);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WS error:', err);
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'initial_status' || payload.type === 'status') {
            setStatus(payload.status);
          } else if (payload.type === 'qr_updated') {
            setStatus((prev) =>
              prev
                ? {
                    ...prev,
                    isConnecting: true,
                    qrState: payload.qrState,
                  }
                : null
            );
          } else if (payload.type === 'authenticated') {
            setStatus((prev) =>
              prev
                ? {
                    ...prev,
                    isAuthenticated: true,
                    isConnecting: false,
                    user: payload.user,
                    qrState: { active: false },
                  }
                : null
            );
            showNotification('success', `Welcome, ${payload.user?.firstName || 'Telegram User'}!`);
            refreshDialogs();
          } else if (payload.type === 'logged_out') {
            setStatus((prev) => (prev ? { ...prev, isAuthenticated: false, user: null } : null));
            setDialogs([]);
            setMessages([]);
          } else if (payload.type === 'new_message') {
            const incoming = payload.message;
            if (incoming) {
              const currentChat = selectedChatIdRef.current;
              console.log(`[Telegram Update Received] Message ID: ${incoming.id}, Chat: ${incoming.chatId}, Out: ${incoming.out}, Text: "${(incoming.text || '').slice(0, 30)}"`);

              // Check if message belongs to currently open chat
              if (currentChat && areChatIdsEqual(incoming.chatId, currentChat)) {
                setMessages((prev) => {
                  // 1. Check if we have an optimistic pending message matching this text
                  const pendingIdx = prev.findIndex(
                    (m) => (m.sending || m.id < 0) && m.out === Boolean(incoming.out) && (m.text === incoming.text || !m.text)
                  );
                  if (pendingIdx !== -1) {
                    const withoutDuplicates = prev.filter((m, idx) => idx !== pendingIdx && m.id !== incoming.id);
                    return [...withoutDuplicates, { ...incoming, sending: false, failed: false }];
                  }

                  // 2. Check if message already exists by real ID
                  const existingIdx = prev.findIndex((m) => m.id === incoming.id);
                  if (existingIdx !== -1) {
                    const copy = [...prev];
                    copy[existingIdx] = incoming;
                    return copy;
                  }

                  // 3. Append to chronological list
                  return [...prev, incoming];
                });
              }

              // Update dialogs list (last message & unread count) and sort to top
              setDialogs((prev) => {
                let found = false;
                const updated = prev.map((d) => {
                  if (areChatIdsEqual(d.id, incoming.chatId)) {
                    found = true;
                    const isCurrentlyActive = currentChat && areChatIdsEqual(d.id, currentChat);
                    const unread = (incoming.out || isCurrentlyActive) ? (d.unreadCount || 0) : (d.unreadCount || 0) + 1;
                    return {
                      ...d,
                      unreadCount: unread,
                      date: incoming.date || Date.now(),
                      lastMessage: {
                        id: incoming.id,
                        text: incoming.text || '',
                        date: incoming.date || Date.now(),
                        out: Boolean(incoming.out),
                        media: Boolean(incoming.media),
                        mediaType: incoming.mediaType,
                      },
                    };
                  }
                  return d;
                });

                if (!found) {
                  // Fetch updated dialogs so new channel, user, or bot appears
                  refreshDialogs();
                  return prev;
                }

                console.log(`[Frontend Chat Last Message Updated] Chat: ${incoming.chatId}, Text: "${(incoming.text || '').slice(0, 30)}"`);
                return [...updated].sort((a, b) => (b.date || 0) - (a.date || 0));
              });
            }
          } else if (payload.type === 'keyword_alert') {
            const alert: KeywordAlert = payload.alert;
            setAlerts((prev) => [alert, ...prev]);
            showNotification(
              'info',
              `🔔 Keyword Alert [${alert.keyword}]: "${alert.messageText.slice(0, 45)}..." in ${alert.chatTitle}`
            );
          }
        } catch (err) {
          console.error('Error handling WebSocket payload:', err);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [showNotification, refreshDialogs]);

  // Initial load
  useEffect(() => {
    refreshStatus();
    fetchBookmarks();
    fetchKeywords();
    fetchAlerts();
    fetchClipboard();
  }, [refreshStatus, fetchBookmarks, fetchKeywords, fetchAlerts, fetchClipboard]);

  // Load dialogs when authenticated
  useEffect(() => {
    if (status?.isAuthenticated) {
      refreshDialogs();
    }
  }, [status?.isAuthenticated, refreshDialogs]);

  // Auto-sync polling every 12 seconds for dialogs / unread count updates
  useEffect(() => {
    if (!status?.isAuthenticated) return;

    const interval = setInterval(() => {
      refreshDialogs();
    }, 12000);

    return () => clearInterval(interval);
  }, [status?.isAuthenticated, refreshDialogs]);

  const activeChat = useMemo(() => {
    if (!selectedChatId) return null;
    return dialogs.find((d) => areChatIdsEqual(d.id, selectedChatId)) || null;
  }, [dialogs, selectedChatId]);

  return (
    <TelegramContext.Provider
      value={{
        status,
        loading,
        wsConnected,
        activeTab,
        setActiveTab,
        dialogs,
        loadingDialogs,
        selectedChatId,
        activeChat,
        messages,
        loadingMessages,
        loadingOlderMessages,
        hasMoreOlderMessages,
        loadOlderMessages,
        selectChat,
        sendMessage,
        sendFile,
        markAsRead,
        markAllAsRead,
        refreshDialogs,
        refreshMessages,
        searchQuery,
        setSearchQuery,
        selectedFilter,
        setSelectedFilter,
        // Smart Folders & AI Categorization
        folders,
        selectedFolderId,
        setSelectedFolderId,
        isCategorizingWithAi,
        autoCategorizeWithAi,
        createCustomFolder,
        deleteCustomFolder,
        toggleChatInFolder,
        resetFoldersToDefault,
        isMultiSelectMode,
        setIsMultiSelectMode,
        selectedMessageIds,
        toggleSelectMessage,
        selectAllMessages,
        clearSelection,
        forwardMessagesTo,
        deleteSelectedMessages,
        deleteSingleMessage,
        reactToMessage,
        pinMessage,
        forwardModalOpen,
        setForwardModalOpen,
        messagesToForward,
        setMessagesToForward,
        bookmarks,
        loadingBookmarks,
        fetchBookmarks,
        addBookmark,
        removeBookmark,
        updateBookmarkCollection,
        keywords,
        loadingKeywords,
        alerts,
        fetchKeywords,
        addKeyword,
        removeKeyword,
        fetchAlerts,
        markAlertsAsRead,
        clipboard,
        fetchClipboard,
        copyToClipboard,
        clearClipboard,
        clipboardModalOpen,
        setClipboardModalOpen,
        aiLoading,
        generateReplies,
        summarizeMessages,
        translateText,
        extractInfo,
        findChannelsAi,
        executeCommand,
        aiReply,
        summarizeMessage,
        translateMessage,
        rewriteMessage,
        extractEntities,
        explainMessage,
        searchGlobalMessages,
        searchGlobalDirectory,
        joinChannel,
        contacts,
        loadingContacts,
        fetchContacts,
        sessions,
        loadingSessions,
        fetchSessions,
        payments,
        transactions: payments,
        loadingPayments,
        fetchPayments,
        createPaymentOrder,
        createPayment,
        deviceMode,
        isMobile,
        setDeviceMode,
        commandCenterOpen,
        setCommandCenterOpen,
        refreshStatus,
        startQrLogin,
        submit2FA,
        logout,
        notification,
        showNotification,
        clearNotification,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};
