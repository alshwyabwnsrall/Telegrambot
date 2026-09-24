import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  TelegramMessage,
  MessageTranslation,
  ChatTranslationConfig,
  TranslationBatchProgress,
} from '../types/telegram.js';
import { useTelegram } from './TelegramContext.js';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'Arabic', name: 'العربية (Arabic)', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'English', name: 'الإنجليزية (English)', nativeName: 'English', flag: '🇬🇧' },
  { code: 'Russian', name: 'الروسية (Russian)', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'Turkish', name: 'التركية (Turkish)', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'French', name: 'الفرنسية (French)', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'German', name: 'الألمانية (German)', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'Spanish', name: 'الإسبانية (Spanish)', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'Persian', name: 'الفارسية (Persian)', nativeName: 'فارسی', flag: '🇮🇷' },
  { code: 'Urdu', name: 'الأردية (Urdu)', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'Chinese', name: 'الصينية (Chinese)', nativeName: '中文', flag: '🇨🇳' },
  { code: 'Japanese', name: 'اليابانية (Japanese)', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'Hindi', name: 'الهندية (Hindi)', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'Italian', name: 'الإيطالية (Italian)', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'Portuguese', name: 'البرتغالية (Portuguese)', nativeName: 'Português', flag: '🇧🇷' },
];

interface TranslationContextType {
  // Chat config
  getChatConfig: (chatId: string) => ChatTranslationConfig;
  updateChatConfig: (chatId: string, updates: Partial<ChatTranslationConfig>) => void;

  // Cache & lookup
  getTranslation: (chatId: string, messageId: number, targetLanguage?: string) => MessageTranslation | undefined;
  
  // Actions
  translateSingleMessage: (chatId: string, message: TelegramMessage, targetLanguage?: string) => Promise<MessageTranslation | null>;
  translateSelectedMessages: (chatId: string, messages: TelegramMessage[], targetLanguage?: string) => Promise<void>;
  translateFullChat: (chatId: string, messages: TelegramMessage[], targetLanguage?: string) => Promise<void>;
  cancelFullChatTranslation: () => void;
  clearChatTranslations: (chatId: string) => void;
  toggleMessageTranslationVisibility: (chatId: string, messageId: number) => void;

  // Batch progress state
  batchProgress: TranslationBatchProgress;

  // Visibility states for single messages (hidden or visible)
  hiddenTranslations: Set<string>;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

const CACHE_STORAGE_KEY = 'tg_translation_cache_v2';
const CHAT_CONFIGS_KEY = 'tg_chat_trans_configs_v2';

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { messages, selectedChatId } = useTelegram();

  // Translations cache: key = `${chatId}_${messageId}_${targetLanguage}`
  const [translations, setTranslations] = useState<Record<string, MessageTranslation>>(() => {
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Chat configs: key = chatId
  const [chatConfigs, setChatConfigs] = useState<Record<string, ChatTranslationConfig>>(() => {
    try {
      const saved = localStorage.getItem(CHAT_CONFIGS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Hidden translation message keys
  const [hiddenTranslations, setHiddenTranslations] = useState<Set<string>>(new Set());

  // Batch progress tracker
  const [batchProgress, setBatchProgress] = useState<TranslationBatchProgress>({
    isTranslating: false,
    chatId: null,
    total: 0,
    completed: 0,
    percent: 0,
    statusText: '',
  });

  const isCancelledRef = useRef<boolean>(false);
  const processedMessageIdsRef = useRef<Set<number>>(new Set());

  // Save cache to localStorage with debounce / cap
  useEffect(() => {
    try {
      // Keep most recent 1000 translations to avoid localStorage size limits
      const entries = Object.entries(translations);
      if (entries.length > 1000) {
        const trimmed = Object.fromEntries(entries.slice(-1000));
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed));
      } else {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(translations));
      }
    } catch (e) {
      console.warn('Failed to save translation cache to localStorage', e);
    }
  }, [translations]);

  // Save chat configs
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_CONFIGS_KEY, JSON.stringify(chatConfigs));
    } catch (e) {
      console.warn('Failed to save chat translation configs to localStorage', e);
    }
  }, [chatConfigs]);

  const getChatConfig = useCallback((chatId: string): ChatTranslationConfig => {
    if (!chatConfigs[chatId]) {
      return {
        chatId,
        enabled: false,
        autoTranslateNew: false,
        targetLanguage: 'Arabic',
        showOriginal: true,
      };
    }
    return chatConfigs[chatId];
  }, [chatConfigs]);

  const updateChatConfig = useCallback((chatId: string, updates: Partial<ChatTranslationConfig>) => {
    setChatConfigs((prev) => {
      const current = prev[chatId] || {
        chatId,
        enabled: false,
        autoTranslateNew: false,
        targetLanguage: 'Arabic',
        showOriginal: true,
      };
      return {
        ...prev,
        [chatId]: {
          ...current,
          ...updates,
        },
      };
    });
  }, []);

  const getTranslation = useCallback((chatId: string, messageId: number, targetLanguage?: string): MessageTranslation | undefined => {
    const config = getChatConfig(chatId);
    const target = targetLanguage || config.targetLanguage || 'Arabic';
    const key = `${chatId}_${messageId}_${target}`;
    return translations[key];
  }, [translations, getChatConfig]);

  const toggleMessageTranslationVisibility = useCallback((chatId: string, messageId: number) => {
    const config = getChatConfig(chatId);
    const key = `${chatId}_${messageId}_${config.targetLanguage || 'Arabic'}`;
    setHiddenTranslations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [getChatConfig]);

  // 1. Single message translation
  const translateSingleMessage = useCallback(async (
    chatId: string,
    message: TelegramMessage,
    targetLanguage?: string
  ): Promise<MessageTranslation | null> => {
    if (!message || !message.text || !message.text.trim()) {
      return null;
    }

    const config = getChatConfig(chatId);
    const target = targetLanguage || config.targetLanguage || 'Arabic';
    const key = `${chatId}_${message.id}_${target}`;

    // Return cached if successful
    if (translations[key] && translations[key].status === 'success') {
      return translations[key];
    }

    // Set loading state in cache
    const loadingEntry: MessageTranslation = {
      id: key,
      chatId,
      messageId: message.id,
      originalText: message.text,
      translatedText: '',
      targetLanguage: target,
      status: 'loading',
      translatedAt: Date.now(),
    };

    setTranslations((prev) => ({ ...prev, [key]: loadingEntry }));

    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.text,
          targetLanguage: target,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.result) {
        throw new Error(data.error || 'فشلت الترجمة، يرجى المحاولة مرة أخرى.');
      }

      const successEntry: MessageTranslation = {
        id: key,
        chatId,
        messageId: message.id,
        originalText: message.text,
        translatedText: data.result.translatedText || message.text,
        detectedSourceLanguage: data.result.detectedSourceLanguage || 'Auto',
        targetLanguage: target,
        status: 'success',
        translatedAt: Date.now(),
      };

      setTranslations((prev) => ({ ...prev, [key]: successEntry }));
      return successEntry;
    } catch (err: any) {
      console.error('[Translate Error]', err);
      const errorEntry: MessageTranslation = {
        id: key,
        chatId,
        messageId: message.id,
        originalText: message.text,
        translatedText: '',
        targetLanguage: target,
        status: 'error',
        error: err?.message || 'خطأ في الاتصال أثناء الترجمة.',
        translatedAt: Date.now(),
      };

      setTranslations((prev) => ({ ...prev, [key]: errorEntry }));
      return errorEntry;
    }
  }, [getChatConfig, translations]);

  // 2. Batch / Selected messages translation
  const translateBatchInternal = useCallback(async (
    chatId: string,
    msgsToTranslate: TelegramMessage[],
    target: string,
    onProgress?: (done: number, total: number) => void
  ) => {
    const CHUNK_SIZE = 8;
    const total = msgsToTranslate.length;
    let completed = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      if (isCancelledRef.current) break;

      const chunk = msgsToTranslate.slice(i, i + CHUNK_SIZE);

      // Filter out messages already in cache or empty
      const neededInChunk = chunk.filter((m) => {
        if (!m.text || !m.text.trim()) return false;
        const k = `${chatId}_${m.id}_${target}`;
        const cached = translations[k];
        if (cached && cached.status === 'success') {
          completed++;
          if (onProgress) onProgress(completed, total);
          return false;
        }
        return true;
      });

      if (neededInChunk.length === 0) {
        continue;
      }

      // Mark loading
      setTranslations((prev) => {
        const next = { ...prev };
        neededInChunk.forEach((m) => {
          const k = `${chatId}_${m.id}_${target}`;
          next[k] = {
            id: k,
            chatId,
            messageId: m.id,
            originalText: m.text,
            translatedText: '',
            targetLanguage: target,
            status: 'loading',
            translatedAt: Date.now(),
          };
        });
        return next;
      });

      try {
        const payload = neededInChunk.map((m) => ({
          id: m.id,
          text: m.text,
        }));

        const res = await fetch('/api/ai/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: payload,
            targetLanguage: target,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.results)) {
          const resMap = new Map<number, { translatedText: string; detectedSourceLanguage?: string }>();
          data.results.forEach((r: any) => {
            resMap.set(Number(r.id), {
              translatedText: r.translatedText,
              detectedSourceLanguage: r.detectedSourceLanguage,
            });
          });

          setTranslations((prev) => {
            const next = { ...prev };
            neededInChunk.forEach((m) => {
              const k = `${chatId}_${m.id}_${target}`;
              const match = resMap.get(m.id);
              if (match) {
                next[k] = {
                  id: k,
                  chatId,
                  messageId: m.id,
                  originalText: m.text,
                  translatedText: match.translatedText,
                  detectedSourceLanguage: match.detectedSourceLanguage || 'Auto',
                  targetLanguage: target,
                  status: 'success',
                  translatedAt: Date.now(),
                };
              } else {
                next[k] = {
                  id: k,
                  chatId,
                  messageId: m.id,
                  originalText: m.text,
                  translatedText: m.text,
                  targetLanguage: target,
                  status: 'error',
                  error: 'تعذر الحصول على الترجمة',
                  translatedAt: Date.now(),
                };
              }
            });
            return next;
          });
        } else {
          throw new Error(data.error || 'فشل الاتصال بخدمة الترجمة');
        }
      } catch (err: any) {
        console.error('Batch translate chunk failed:', err);
        // Mark failed
        setTranslations((prev) => {
          const next = { ...prev };
          neededInChunk.forEach((m) => {
            const k = `${chatId}_${m.id}_${target}`;
            next[k] = {
              id: k,
              chatId,
              messageId: m.id,
              originalText: m.text,
              translatedText: '',
              targetLanguage: target,
              status: 'error',
              error: err?.message || 'خطأ في الترجمة',
              translatedAt: Date.now(),
            };
          });
          return next;
        });
      }

      completed += neededInChunk.length;
      if (onProgress) onProgress(completed, total);

      // Small delay between chunks to keep UI snappy
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [translations]);

  // 3. Translate selected messages
  const translateSelectedMessages = useCallback(async (
    chatId: string,
    msgs: TelegramMessage[],
    targetLanguage?: string
  ) => {
    if (!msgs || msgs.length === 0) return;
    const config = getChatConfig(chatId);
    const target = targetLanguage || config.targetLanguage || 'Arabic';

    isCancelledRef.current = false;
    setBatchProgress({
      isTranslating: true,
      chatId,
      total: msgs.length,
      completed: 0,
      percent: 0,
      statusText: `جاري ترجمة ${msgs.length} رسالة محددة إلى ${target}...`,
    });

    await translateBatchInternal(chatId, msgs, target, (done, total) => {
      const pct = Math.round((done / total) * 100);
      setBatchProgress({
        isTranslating: true,
        chatId,
        total,
        completed: done,
        percent: pct,
        statusText: `تمت ترجمة ${done} من ${total} (${pct}%)`,
      });
    });

    setBatchProgress({
      isTranslating: false,
      chatId,
      total: msgs.length,
      completed: msgs.length,
      percent: 100,
      statusText: 'اكتملت ترجمة الرسائل المحددة بنجاح!',
    });

    setTimeout(() => {
      setBatchProgress((prev) => ({ ...prev, isTranslating: false }));
    }, 2500);
  }, [getChatConfig, translateBatchInternal]);

  // 4. Translate Full Chat
  const translateFullChat = useCallback(async (
    chatId: string,
    allMsgs: TelegramMessage[],
    targetLanguage?: string
  ) => {
    const textMsgs = allMsgs.filter((m) => m.text && m.text.trim().length > 0);
    if (textMsgs.length === 0) return;

    const config = getChatConfig(chatId);
    const target = targetLanguage || config.targetLanguage || 'Arabic';

    // Enable chat translation mode
    updateChatConfig(chatId, { enabled: true, targetLanguage: target });

    isCancelledRef.current = false;
    setBatchProgress({
      isTranslating: true,
      chatId,
      total: textMsgs.length,
      completed: 0,
      percent: 0,
      statusText: `بدء ترجمة المحادثة بالكامل (${textMsgs.length} رسالة)...`,
    });

    await translateBatchInternal(chatId, textMsgs, target, (done, total) => {
      if (isCancelledRef.current) return;
      const pct = Math.round((done / total) * 100);
      setBatchProgress({
        isTranslating: true,
        chatId,
        total,
        completed: done,
        percent: pct,
        statusText: `جاري الترجمة: ${done} من ${total} (${pct}%)`,
      });
    });

    if (!isCancelledRef.current) {
      setBatchProgress({
        isTranslating: false,
        chatId,
        total: textMsgs.length,
        completed: textMsgs.length,
        percent: 100,
        statusText: 'تمت ترجمة جميع رسائل المحادثة بنجاح!',
      });
    }

    setTimeout(() => {
      setBatchProgress((prev) => ({ ...prev, isTranslating: false }));
    }, 3000);
  }, [getChatConfig, updateChatConfig, translateBatchInternal]);

  const cancelFullChatTranslation = useCallback(() => {
    isCancelledRef.current = true;
    setBatchProgress((prev) => ({
      ...prev,
      isTranslating: false,
      cancelled: true,
      statusText: 'تم إيقاف عملية الترجمة.',
    }));
  }, []);

  const clearChatTranslations = useCallback((chatId: string) => {
    setTranslations((prev) => {
      const next: Record<string, MessageTranslation> = {};
      Object.keys(prev).forEach((k) => {
        if (!k.startsWith(`${chatId}_`)) {
          next[k] = prev[k];
        }
      });
      return next;
    });
    updateChatConfig(chatId, { enabled: false });
  }, [updateChatConfig]);

  // 5. Auto-translate incoming new messages
  useEffect(() => {
    if (!selectedChatId || !messages || messages.length === 0) return;

    const config = getChatConfig(selectedChatId);
    if (!config.autoTranslateNew && !config.enabled) return;

    // Check latest messages that haven't been auto-translated yet
    const latestMsgs = messages.slice(-5);
    latestMsgs.forEach((msg) => {
      if (!msg.text || !msg.text.trim()) return;
      if (processedMessageIdsRef.current.has(msg.id)) return;

      const target = config.targetLanguage || 'Arabic';
      const key = `${selectedChatId}_${msg.id}_${target}`;
      if (!translations[key]) {
        processedMessageIdsRef.current.add(msg.id);
        translateSingleMessage(selectedChatId, msg, target);
      }
    });
  }, [messages, selectedChatId, getChatConfig, translations, translateSingleMessage]);

  const value: TranslationContextType = {
    getChatConfig,
    updateChatConfig,
    getTranslation,
    translateSingleMessage,
    translateSelectedMessages,
    translateFullChat,
    cancelFullChatTranslation,
    clearChatTranslations,
    toggleMessageTranslationVisibility,
    batchProgress,
    hiddenTranslations,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
