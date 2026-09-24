import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { useTranslation } from '../context/TranslationContext.js';
import {
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RotateCw,
  Download,
  FileText,
  X,
  RefreshCw,
  Search,
  Users,
  Megaphone,
  User,
  CornerUpLeft,
  Copy,
  Forward,
  Bookmark,
  Sparkles,
  CheckSquare,
  Square,
  MoreHorizontal,
  ExternalLink,
  Tag,
  ArrowRight,
  Images,
  Eye,
  Languages,
  ChevronDown,
} from 'lucide-react';
import { TelegramMessage } from '../types/telegram.js';
import { MessageQuickToolbar } from './MessageQuickToolbar.js';
import { AiMessageModal } from './AiMessageModal.js';
import { InlineMediaRenderer } from './InlineMediaRenderer.js';
import { ImageLightboxModal } from './ImageLightboxModal.js';
import { FileViewerModal } from './FileViewerModal.js';
import { ChatMediaGallery } from './ChatMediaGallery.js';
import { ChatTranslationMenu } from './ChatTranslationMenu.js';
import { MessageTranslationBlock } from './MessageTranslationBlock.js';
import { FullChatTranslationProgressModal } from './FullChatTranslationProgressModal.js';
import { MessageRow } from './MessageRow.js';
import { MessageContextMenu } from './MessageContextMenu.js';
import { TextSelectModal } from './TextSelectModal.js';
import { LazyAvatar } from './LazyAvatar.js';
import { ChevronUp } from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  // Check if seconds or ms
  const date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ChatView: React.FC = () => {
  const {
    activeChat,
    selectedChatId,
    selectChat,
    isMobile,
    messages,
    loadingMessages,
    loadingOlderMessages,
    hasMoreOlderMessages,
    loadOlderMessages,
    markAsRead,
    sendMessage,
    sendFile,
    refreshMessages,
    isMultiSelectMode,
    setIsMultiSelectMode,
    selectedMessageIds,
    toggleSelectMessage,
    clearSelection,
    selectAllMessages,
    setForwardModalOpen,
    setMessagesToForward,
    addBookmark,
    copyToClipboard,
    showNotification,
    deleteSingleMessage,
    reactToMessage,
    pinMessage,
  } = useTelegram();

  const {
    getChatConfig,
    getTranslation,
    translateSingleMessage,
  } = useTranslation();

  const currentChatConfig = activeChat ? getChatConfig(activeChat.id) : null;

  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TelegramMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCaption, setFileCaption] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Context Menu & Text Selection Modals
  const [contextMenuMsg, setContextMenuMsg] = useState<TelegramMessage | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [textSelectOpen, setTextSelectOpen] = useState(false);
  const [textToSelect, setTextToSelect] = useState('');

  // AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSelectedMessage, setAiSelectedMessage] = useState<TelegramMessage | null>(null);

  // Media Gallery & Viewers
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMessage, setLightboxMessage] = useState<TelegramMessage | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileViewerMessage, setFileViewerMessage] = useState<TelegramMessage | null>(null);

  // Dropdown options popup for single message
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<number | null>(null);

  // Unread tracking refs & state
  const seenUnreadMsgIdsRef = useRef<Set<number>>(new Set());
  const initialUnreadCountRef = useRef<number>(0);
  const unreadMsgIdsRef = useRef<number[]>([]);
  const isInitialScrollDoneRef = useRef<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isNearBottomRef = useRef<boolean>(true);
  const isLoadingOlderRef = useRef<boolean>(false);
  const prevChatIdRef = useRef<string | null>(null);
  const scrolledChatIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState<boolean>(false);
  const [newUnreadIncomingCount, setNewUnreadIncomingCount] = useState<number>(0);

  // Scroll smoothly to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      isNearBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setNewUnreadIncomingCount(0);

      // If activeChat has unread messages, mark them as read in Telegram
      if (activeChat && activeChat.unreadCount > 0) {
        const latestMsg = messages[messages.length - 1];
        markAsRead(activeChat.id, latestMsg?.id, 0);
      }
    }
  }, [activeChat, messages, markAsRead]);

  // Scroll smoothly to top
  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle Scroll container events: infinite scroll upwards + bottom detection
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !activeChat) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 80;
    isNearBottomRef.current = isNearBottom;
    setShowScrollBottomBtn(!isNearBottom);
    setShowScrollTopBtn(scrollTop > 450);

    // If user scrolled all the way to bottom, mark all remaining unread messages as read in Telegram
    if (isNearBottom) {
      setNewUnreadIncomingCount(0);
      if (activeChat.unreadCount > 0) {
        const latestMsg = messages[messages.length - 1];
        markAsRead(activeChat.id, latestMsg?.id, 0);
      }
    }

    // Trigger loading older messages when scrolling upwards (< 140px from top)
    if (scrollTop < 140 && hasMoreOlderMessages && !loadingOlderMessages && !isLoadingOlderRef.current) {
      triggerLoadOlder();
    }
  }, [activeChat, hasMoreOlderMessages, loadingOlderMessages, messages, markAsRead]);

  // Load older messages with rock-solid scroll height delta anchoring (Zero jitter)
  const triggerLoadOlder = async () => {
    const container = scrollContainerRef.current;
    if (!container || !activeChat || !hasMoreOlderMessages || isLoadingOlderRef.current) return;

    isLoadingOlderRef.current = true;
    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;

    const success = await loadOlderMessages(activeChat.id);

    if (success) {
      // Use requestAnimationFrame to restore exact scroll offset after React renders new messages
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const heightDiff = newScrollHeight - oldScrollHeight;
          container.scrollTop = oldScrollTop + heightDiff;
        }
        isLoadingOlderRef.current = false;
      });
    } else {
      isLoadingOlderRef.current = false;
    }
  };

  // Smart Auto-Scroll on Chat Open / Messages Loaded
  useEffect(() => {
    if (!activeChat) return;

    // When chat ID changes, reset initial scroll status and seen tracking
    if (scrolledChatIdRef.current !== activeChat.id) {
      isInitialScrollDoneRef.current = false;
      seenUnreadMsgIdsRef.current.clear();
      setNewUnreadIncomingCount(0);
      setShowScrollBottomBtn(false);
      lastMessageIdRef.current = null;
      initialUnreadCountRef.current = activeChat.unreadCount || 0;
    }

    // Only position scroll once messages have loaded for this chat and initial scroll hasn't run yet
    if (messages.length > 0 && !isInitialScrollDoneRef.current) {
      scrolledChatIdRef.current = activeChat.id;
      isInitialScrollDoneRef.current = true;
      prevMessagesLengthRef.current = messages.length;
      lastMessageIdRef.current = messages[messages.length - 1]?.id || null;

      // Use requestAnimationFrame and a small timeout to ensure DOM layout has rendered completely
      const scrollTimer = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (activeChat.unreadCount > 0) {
          // Check for the unread boundary separator element
          const unreadBoundaryEl = document.getElementById('unread-boundary');
          if (unreadBoundaryEl) {
            unreadBoundaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            isNearBottomRef.current = false;
            setShowScrollBottomBtn(true);
            return;
          }

          // Fallback: Check for first unread message by ID
          const firstUnreadIndex = Math.max(0, messages.length - activeChat.unreadCount);
          const firstUnreadMsg = messages[firstUnreadIndex];
          if (firstUnreadMsg) {
            const msgEl = document.getElementById(`msg-${firstUnreadMsg.id}`);
            if (msgEl) {
              msgEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              isNearBottomRef.current = false;
              setShowScrollBottomBtn(true);
              return;
            }
          }
        }

        // Default: If no unread messages or unreadCount === 0, scroll to bottom
        container.scrollTop = container.scrollHeight;
        isNearBottomRef.current = true;
        setShowScrollBottomBtn(false);
      }, 50);

      return () => clearTimeout(scrollTimer);
    }
  }, [activeChat?.id, activeChat?.unreadCount, messages]);

  // Real-time incoming messages handling: NEVER auto-scroll down if user is browsing history
  useEffect(() => {
    if (!activeChat || !isInitialScrollDoneRef.current || scrolledChatIdRef.current !== activeChat.id) return;
    if (messages.length === 0) return;

    const newestMsg = messages[messages.length - 1];
    const isNewMessageAtBottom = newestMsg && newestMsg.id !== lastMessageIdRef.current;

    if (isNewMessageAtBottom) {
      lastMessageIdRef.current = newestMsg.id;

      // If user is currently reading at the bottom OR if user sent the message themselves: scroll down smoothly
      if (isNearBottomRef.current || (newestMsg.out && !isLoadingOlderRef.current)) {
        scrollToBottom(true);
      } else {
        // User was reading older messages in chat history: do NOT disrupt their scroll position!
        setNewUnreadIncomingCount((prev) => prev + 1);
        setShowScrollBottomBtn(true);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, activeChat, scrollToBottom]);

  // Smart Unread Observer: Progressively marks messages as read as user views them (5 → 4 → 3 → 2 → 1 → 0)
  useEffect(() => {
    if (!activeChat || activeChat.unreadCount <= 0 || messages.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Identify unread incoming messages
    const unreadMsgs = messages.slice(Math.max(0, messages.length - activeChat.unreadCount));
    const targetElements: HTMLElement[] = [];

    unreadMsgs.forEach((msg) => {
      const el = document.getElementById(`msg-${msg.id}`);
      if (el) targetElements.push(el);
    });

    if (targetElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let hasNewRead = false;
        let highestSeenId = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const msgIdStr = entry.target.getAttribute('data-msg-id');
            if (msgIdStr) {
              const msgId = parseInt(msgIdStr, 10);
              if (!seenUnreadMsgIdsRef.current.has(msgId)) {
                seenUnreadMsgIdsRef.current.add(msgId);
                hasNewRead = true;
                if (msgId > highestSeenId) highestSeenId = msgId;
              }
            }
          }
        });

        if (hasNewRead) {
          // Calculate remaining unread count
          const totalUnread = unreadMsgs.length;
          const seenCount = unreadMsgs.filter((m) => seenUnreadMsgIdsRef.current.has(m.id)).length;
          const remainingCount = Math.max(0, totalUnread - seenCount);

          if (highestSeenId > 0) {
            markAsRead(activeChat.id, highestSeenId, remainingCount);
          }
        }
      },
      {
        root: container,
        threshold: 0.4,
      }
    );

    targetElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [activeChat?.id, activeChat?.unreadCount, messages, markAsRead]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !selectedFile) return;

    if (selectedFile) {
      const fileToUpload = selectedFile;
      const caption = fileCaption || inputMessage;
      const replyId = replyingTo?.id;
      setSelectedFile(null);
      setFileCaption('');
      setInputMessage('');
      setReplyingTo(null);
      setSending(true);
      scrollToBottom(true);
      await sendFile(fileToUpload, caption, replyId);
      setSending(false);
    } else if (inputMessage.trim()) {
      const textToSend = inputMessage.trim();
      const replyId = replyingTo?.id;
      setInputMessage('');
      setReplyingTo(null);
      setSending(true);
      scrollToBottom(true);
      await sendMessage(textToSend, replyId);
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Copy selected portion of text from user selection
  const handleCopySelectedTextOnly = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    if (text) {
      copyToClipboard(text, activeChat?.title);
      showNotification('success', 'Selected text snippet copied!');
    } else {
      showNotification('info', 'Please highlight/select text first');
    }
  };

  if (!selectedChatId || !activeChat) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 text-slate-500">
        <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700/50">
          <svg className="w-8 h-8 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-300">اختر محادثة لبدء المراسلة</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          اختر محادثة من القائمة لعرض الرسائل الحقيقية ونسخ النصوص والبحث والتفاعل مع الذكاء الاصطناعي.
        </p>
      </div>
    );
  }

  // Filter and strictly deduplicate messages by ID to prevent duplicate keys
  const filteredMessages = useMemo(() => {
    const seenIds = new Set<number>();
    const unique: TelegramMessage[] = [];
    for (const m of messages) {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        unique.push(m);
      }
    }
    if (!chatSearch.trim()) return unique;
    const q = chatSearch.toLowerCase();
    return unique.filter((m) => m.text?.toLowerCase().includes(q));
  }, [messages, chatSearch]);

  // Memoized action handlers for MessageRow
  const handleToggleSelect = useCallback((id: number) => {
    toggleSelectMessage(id);
  }, [toggleSelectMessage]);

  const handleOpenLightbox = useCallback((msg: TelegramMessage) => {
    setLightboxMessage(msg);
    setLightboxOpen(true);
  }, []);

  const handleOpenFileViewer = useCallback((msg: TelegramMessage) => {
    setFileViewerMessage(msg);
    setFileViewerOpen(true);
  }, []);

  const handleRetrySend = useCallback((text: string, replyTo?: number) => {
    sendMessage(text, replyTo);
  }, [sendMessage]);

  const handleCopy = useCallback((text: string, title?: string) => {
    copyToClipboard(text, title);
    showNotification('success', 'تم نسخ الرسالة إلى الحافظة');
  }, [copyToClipboard, showNotification]);

  const handleForward = useCallback((id: number) => {
    setMessagesToForward([id]);
    setForwardModalOpen(true);
  }, [setMessagesToForward, setForwardModalOpen]);

  const handleBookmark = useCallback((msg: TelegramMessage) => {
    addBookmark(msg, 'المفضلة');
  }, [addBookmark]);

  const handleReply = useCallback((msg: TelegramMessage) => {
    setReplyingTo(msg);
  }, []);

  const handleTranslateSingle = useCallback((msg: TelegramMessage) => {
    if (activeChat) {
      translateSingleMessage(activeChat.id, msg, currentChatConfig?.targetLanguage);
    }
  }, [activeChat, translateSingleMessage, currentChatConfig?.targetLanguage]);

  const handleOpenAiAssistant = useCallback((msg: TelegramMessage) => {
    setAiSelectedMessage(msg);
    setAiModalOpen(true);
  }, []);

  const handleOpenContextMenu = useCallback((msg: TelegramMessage) => {
    setContextMenuMsg(msg);
    setContextMenuOpen(true);
  }, []);

  const handleDoubleTapReact = useCallback((msg: TelegramMessage) => {
    if (activeChat) {
      reactToMessage(activeChat.id, msg.id, '❤️');
    }
  }, [activeChat, reactToMessage]);

  const handleReact = useCallback((msg: TelegramMessage, emoji: string) => {
    if (activeChat) {
      reactToMessage(activeChat.id, msg.id, emoji);
    }
  }, [activeChat, reactToMessage]);

  const handlePin = useCallback((msg: TelegramMessage) => {
    if (activeChat) {
      pinMessage(activeChat.id, msg.id);
    }
  }, [activeChat, pinMessage]);

  const handleDelete = useCallback((msg: TelegramMessage) => {
    if (activeChat) {
      deleteSingleMessage(activeChat.id, msg.id, true);
    }
  }, [activeChat, deleteSingleMessage]);

  const handleOpenPartialCopy = useCallback((text: string) => {
    setTextToSelect(text);
    setTextSelectOpen(true);
  }, []);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950/60 overflow-hidden relative">
      {/* AI Message Modal */}
      <AiMessageModal
        isOpen={aiModalOpen}
        message={aiSelectedMessage}
        onClose={() => setAiModalOpen(false)}
        onInsertReply={(text) => {
          setInputMessage((prev) => (prev ? `${prev}\n${text}` : text));
          textareaRef.current?.focus();
        }}
      />

      {/* Chat Header */}
      <div className="h-16 px-3 sm:px-6 border-b border-slate-800 bg-[#0b141a]/95 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button (to return to chat list) */}
          {isMobile && (
            <button
              onClick={() => selectChat('')}
              title="الرجوع إلى المحادثات"
              className="p-2 -mr-1 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
            >
              <ArrowRight className="w-5 h-5 text-sky-400" />
            </button>
          )}

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shrink-0 shadow-md shadow-sky-500/10">
            <LazyAvatar
              key={activeChat.id}
              src={`/api/telegram/avatar/${activeChat.id}`}
              alt={activeChat.title}
              initials={activeChat.title ? activeChat.title.slice(0, 2).toUpperCase() : 'TG'}
              className="w-full h-full rounded-2xl"
            />
          </div>

          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span className="truncate">{safeString(activeChat.title)}</span>
              {activeChat.isChannel && <Megaphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeChat.isGroup && <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </h3>
            <div className="text-[10px] sm:text-[11px] text-slate-400 truncate flex items-center gap-1.5">
              <span>
                {activeChat.isChannel
                  ? 'قناة'
                  : activeChat.isGroup
                  ? 'مجموعة'
                  : activeChat.username
                  ? `@${activeChat.username}`
                  : 'محادثة خاصة'}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500 truncate">ID: {activeChat.id}</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Multi-Select Toggle */}
          <button
            onClick={() => {
              if (isMultiSelectMode) {
                clearSelection();
                setIsMultiSelectMode(false);
              } else {
                setIsMultiSelectMode(true);
              }
            }}
            title="تبديل وضع التحديد المتعدد"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMultiSelectMode
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تحديد متعدد</span>
          </button>

          {/* Chat Search */}
          {showSearch ? (
            <div className="flex items-center bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="بحث داخل المحادثة..."
                autoFocus
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-36 sm:w-48 text-right"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setChatSearch('');
                }}
                className="text-slate-400 hover:text-white ml-1 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              title="بحث في المحادثة"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Chat Translation Menu (Full Chat, Auto-Translate, Lang Selection) */}
          <ChatTranslationMenu
            chatId={activeChat.id}
            chatTitle={activeChat.title}
            messages={messages}
          />

          {/* Chat Media Gallery Toggle */}
          <button
            onClick={() => setGalleryOpen(true)}
            title="فتح وسائط ومستندات المحادثة (Media Gallery)"
            className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs"
          >
            <Images className="w-4 h-4" />
            <span className="hidden sm:inline">الوسائط</span>
          </button>

          {/* Refresh Messages */}
          <button
            onClick={() => refreshMessages(selectedChatId)}
            title="تحديث الرسائل"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Full Chat Translation Real-Time Progress Banner */}
      <FullChatTranslationProgressModal />

      {/* Floating Multi-Select Toolbar */}
      <MessageQuickToolbar
        onOpenAiDrawer={(type, msg) => {
          const target = msg || messages.find((m) => selectedMessageIds.includes(m.id));
          if (target) {
            setAiSelectedMessage(target);
            setAiModalOpen(true);
          }
        }}
      />

      {/* Messages Thread */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative"
      >
        {/* Top Pagination Status Indicator */}
        {loadingOlderMessages && (
          <div className="py-2.5 px-4 bg-sky-950/70 border border-sky-600/30 rounded-2xl flex items-center justify-center gap-2 text-xs text-sky-300 font-medium w-fit mx-auto shadow-sm backdrop-blur-sm">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>جاري تحميل الرسائل الأقدم من Telegram...</span>
          </div>
        )}

        {!hasMoreOlderMessages && filteredMessages.length > 0 && (
          <div className="py-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 opacity-80">
            <Check className="w-3.5 h-3.5 text-slate-600" />
            <span>بداية سجل الرسائل في Telegram</span>
          </div>
        )}

        {loadingMessages && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <span>لا توجد رسائل في هذه المحادثة</span>
            <span className="text-[11px] mt-1">اكتب رسالة في الأسفل لبدء الحديث</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((msg, index) => {
              const isOut = msg.out;
              const isSelected = selectedMessageIds.includes(msg.id);
              const replyMsg = msg.replyToMsgId ? messages.find((m) => m.id === msg.replyToMsgId) : null;

              // Check if this message is the boundary for unread messages
              const isUnreadBoundary =
                activeChat &&
                activeChat.unreadCount > 0 &&
                index === Math.max(0, filteredMessages.length - activeChat.unreadCount);

              return (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  index={index}
                  activeChat={activeChat}
                  isOut={isOut}
                  isSelected={isSelected}
                  isMultiSelectMode={isMultiSelectMode}
                  replyMsg={replyMsg}
                  isUnreadBoundary={Boolean(isUnreadBoundary)}
                  translation={getTranslation(activeChat.id, msg.id, currentChatConfig?.targetLanguage)}
                  showOriginal={currentChatConfig?.showOriginal ?? true}
                  targetLanguage={currentChatConfig?.targetLanguage || 'ar'}
                  onToggleSelect={handleToggleSelect}
                  onOpenLightbox={handleOpenLightbox}
                  onOpenFileViewer={handleOpenFileViewer}
                  onRetrySend={handleRetrySend}
                  onCopy={handleCopy}
                  onForward={handleForward}
                  onBookmark={handleBookmark}
                  onReply={handleReply}
                  onTranslateSingle={handleTranslateSingle}
                  onOpenAiAssistant={handleOpenAiAssistant}
                  onOpenContextMenu={handleOpenContextMenu}
                  onDoubleTapReact={handleDoubleTapReact}
                />
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />

      {/* Floating Scroll to Top Pill */}
      {showScrollTopBtn && (
        <button
          onClick={scrollToTop}
          className="absolute top-20 left-6 z-20 bg-slate-900/90 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-full shadow-xl shadow-slate-950/60 border border-slate-700/80 flex items-center gap-1.5 text-xs font-semibold transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md animate-fade-in"
          title="القفز إلى أول رسالة"
        >
          <ChevronUp className="w-4 h-4 text-sky-400" />
          <span>أول رسالة</span>
        </button>
      )}

      {/* Floating Scroll to Bottom / New Messages Pill */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 left-6 z-20 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-full shadow-xl shadow-sky-950/60 border border-sky-400/40 flex items-center gap-2 text-xs font-semibold transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md animate-fade-in"
        >
          <ChevronDown className="w-4 h-4" />
          <span>آخر الرسائل</span>
          {(newUnreadIncomingCount > 0 || (activeChat && activeChat.unreadCount > 0)) && (
            <span className="bg-white text-sky-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
              {newUnreadIncomingCount || activeChat?.unreadCount}
            </span>
          )}
        </button>
      )}
    </div>

      {/* Reply Bar */}
      {replyingTo && (
        <div className="px-6 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs" dir="rtl">
          <div className="flex items-center gap-2 text-slate-300 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-sky-400">
                الرد على {replyingTo.senderName || (replyingTo.out ? 'نفسك' : 'الرسالة')}:
              </span>{' '}
              <span className="text-slate-400 truncate">{replyingTo.text || 'وسائط متعددة'}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div className="px-6 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs" dir="rtl">
          <div className="flex items-center gap-2 text-slate-200 min-w-0">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-semibold truncate">{selectedFile.name}</span>
            <span className="text-slate-400">({formatFileSize(selectedFile.size)})</span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Composer Footer */}
      <div className="p-4 border-t border-slate-800 bg-[#0b141a]/95">
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="إرفاق ملف أو صورة"
            className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-2xl transition-colors shrink-0 cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Quick AI Prompt Trigger */}
          <button
            type="button"
            onClick={() => {
              if (messages.length > 0) {
                setAiSelectedMessage(messages[messages.length - 1]);
                setAiModalOpen(true);
              }
            }}
            title="رد ذكي على الرسالة الأخيرة"
            className="p-2.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-2xl transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">رد ذكي</span>
          </button>

          {/* Text input */}
          <div className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-2.5 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all flex items-center gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? 'أضف تعليقًا على الملف المرفق...' : 'اكتب رسالة هنا...'}
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none resize-none max-h-32 text-right"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || (!inputMessage.trim() && !selectedFile)}
            className="p-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl shadow-lg shadow-sky-600/30 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        currentMessage={lightboxMessage}
        allMessages={messages}
        chatTitle={activeChat.title}
        onSelectMessage={(msg) => setLightboxMessage(msg)}
      />

      {/* File & Document & Video Viewer Modal */}
      <FileViewerModal
        isOpen={fileViewerOpen}
        onClose={() => setFileViewerOpen(false)}
        message={fileViewerMessage}
      />

      {/* Chat Media Gallery Drawer */}
      <ChatMediaGallery
        chatId={activeChat.id}
        chatTitle={activeChat.title}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelectPhoto={(msg) => {
          setLightboxMessage(msg);
          setLightboxOpen(true);
        }}
        onSelectFile={(msg) => {
          setFileViewerMessage(msg);
          setFileViewerOpen(true);
        }}
      />

      {/* Telegram Mobile Long-Press Context Menu */}
      <MessageContextMenu
        msg={contextMenuMsg}
        activeChat={activeChat}
        isOpen={contextMenuOpen}
        onClose={() => setContextMenuOpen(false)}
        onReply={handleReply}
        onCopy={handleCopy}
        onForward={handleForward}
        onBookmark={handleBookmark}
        onTranslateSingle={handleTranslateSingle}
        onOpenAiAssistant={handleOpenAiAssistant}
        onPin={handlePin}
        onDelete={handleDelete}
        onReact={handleReact}
        onOpenPartialCopy={handleOpenPartialCopy}
      />

      {/* Partial Text Selection & Copy Modal */}
      <TextSelectModal
        isOpen={textSelectOpen}
        text={textToSelect}
        onClose={() => setTextSelectOpen(false)}
        onCopy={(text) => handleCopy(text, activeChat.title)}
      />
    </div>
  );
};
