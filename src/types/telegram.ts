export interface TelegramUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  photo?: any;
  premium?: boolean;
  bot?: boolean;
  verified?: boolean;
  restricted?: boolean;
}

export interface TelegramAuthStatus {
  isConfigured: boolean;
  isAuthenticated: boolean;
  isConnected?: boolean;
  isConnecting: boolean;
  user: TelegramUser | null;
  dcId?: number;
  sessionExists: boolean;
  error?: string | null;
  qrState?: {
    active: boolean;
    qrUrl?: string;
    tgUrl?: string;
    expiresAt?: number;
    requires2fa?: boolean;
    hint?: string;
  };
}

export interface TelegramDialog {
  id: string;
  title: string;
  name: string;
  username?: string;
  phone?: string;
  type: 'user' | 'group' | 'channel';
  isUser: boolean;
  isGroup: boolean;
  isChannel: boolean;
  pinned: boolean;
  unreadCount: number;
  unreadMentionsCount: number;
  date: number;
  lastMessage?: {
    id: number;
    text: string;
    date: number;
    out: boolean;
    media: boolean;
    mediaType?: string | null;
  } | null;
}

export interface TelegramMediaInfo {
  type: string;
  hasPhoto?: boolean;
  hasDocument?: boolean;
  isVideo?: boolean;
  isVoice?: boolean;
  isAudio?: boolean;
  isPhoto?: boolean;
  isDocument?: boolean;
  isPdf?: boolean;
  isCode?: boolean;
  isText?: boolean;
  mimeType?: string | null;
  fileName?: string | null;
  size?: number | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  performer?: string | null;
  title?: string | null;
  waveform?: number[] | null;
  url?: string;
  thumbUrl?: string;
  downloadUrl?: string;
  supportsStreaming?: boolean;
}

export interface TelegramMessage {
  id: number;
  chatId: string;
  senderId?: string | null;
  senderName?: string | null;
  text: string;
  date: number;
  out: boolean;
  replyToMsgId?: number | null;
  views?: number | null;
  forwards?: number | null;
  media?: TelegramMediaInfo | null;
  sending?: boolean;
  failed?: boolean;
}

export interface ChatMediaItem {
  id: number;
  chatId: string;
  messageId: number;
  type: 'photo' | 'video' | 'voice' | 'audio' | 'document' | 'link';
  date: number;
  text?: string;
  senderName?: string;
  media?: TelegramMediaInfo | null;
  linkUrl?: string;
}

export interface ActiveAudioTrack {
  url: string;
  downloadUrl?: string;
  title: string;
  subtitle?: string;
  duration?: number;
  currentTime?: number;
  isPlaying: boolean;
  isVoice?: boolean;
  chatId?: string;
  messageId?: number;
  waveform?: number[];
}

export interface TelegramContact {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  mutualContact: boolean;
  verified: boolean;
  premium: boolean;
  status: string;
}

export interface TelegramSessionDevice {
  hash: string;
  deviceModel: string;
  platform: string;
  systemVersion: string;
  appName: string;
  appVersion: string;
  dateCreated: number | null;
  dateActive: number | null;
  ip: string;
  country: string;
  region: string;
  current: boolean;
}

export interface BookmarkedMessage {
  id: string;
  chatId: string;
  chatTitle: string;
  messageId: number;
  text: string;
  senderName: string;
  date: number;
  collection: string;
  tags?: string[];
  savedAt: number;
}

export interface MonitoredKeyword {
  id: string;
  keyword: string;
  notify: boolean;
  color?: string;
  matchCount: number;
  createdAt: number;
}

export interface KeywordAlert {
  id: string;
  keyword: string;
  chatId: string;
  chatTitle: string;
  senderName: string;
  messageId: number;
  messageText: string;
  date: number;
  read: boolean;
}

export interface ClipboardItem {
  id: string;
  text: string;
  sourceChat?: string;
  copiedAt: number;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: 'telegram_stars' | 'stripe' | 'crypto' | 'custom';
  amount: number;
  currency: string;
  planName: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: number;
  customerEmail?: string;
}

export interface AiChannelMatch {
  id: string;
  title: string;
  matchScore: number;
  reason: string;
  matchedKeywords: string[];
}

export interface AiReplyOptions {
  short: string;
  formal: string;
  friendly: string;
  professional: string;
  arabic: string;
  english: string;
}

export interface AiExtractionResult {
  links: string[];
  emails: string[];
  numbers: string[];
  usernames: string[];
  dates: string[];
  summaryPoints: string[];
}

export interface AiCommandResult {
  intent: 'copy' | 'summarize' | 'translate' | 'extract' | 'forward' | 'delete' | 'search' | 'find_channels' | 'save' | 'unknown';
  isSensitive: boolean;
  confirmationPrompt?: string;
  parameters: Record<string, any>;
  explanation: string;
}

export interface MessageTranslation {
  id: string; // `${chatId}_${messageId}_${targetLang}`
  chatId: string;
  messageId: number;
  originalText: string;
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  translatedAt: number;
}

export interface ChatTranslationConfig {
  chatId: string;
  enabled: boolean;
  autoTranslateNew: boolean;
  targetLanguage: string;
  showOriginal: boolean;
}

export interface TranslationBatchProgress {
  isTranslating: boolean;
  chatId: string | null;
  total: number;
  completed: number;
  percent: number;
  statusText: string;
  cancelled?: boolean;
}

export type WorkspaceTab =
  | 'chats'
  | 'discovery'
  | 'dashboard'
  | 'contacts'
  | 'bookmarks'
  | 'channel_finder'
  | 'channels'
  | 'monitor'
  | 'keywords'
  | 'clipboard'
  | 'payments';

export interface GlobalSearchResultItem {
  id: string;
  rawId: string;
  title: string;
  username: string | null;
  type: 'channel' | 'group' | 'bot' | 'user';
  isChannel: boolean;
  isGroup: boolean;
  isUser: boolean;
  isBot: boolean;
  participantsCount: number | null;
  verified: boolean;
  scam: boolean;
  fake: boolean;
  hasPhoto: boolean;
  isJoined: boolean;
  about: string | null;
}

export interface GlobalSearchResponse {
  success: boolean;
  query: string;
  excludeJoined?: boolean;
  totalResults: number;
  unfilteredTotal?: number;
  channels: GlobalSearchResultItem[];
  groups: GlobalSearchResultItem[];
  users: GlobalSearchResultItem[];
  error?: string;
}

export interface SmartFolder {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  isAiGenerated?: boolean;
  isCustom?: boolean;
  chatIds: string[];
  filterType?: 'all' | 'users' | 'groups' | 'channels' | 'unread' | 'custom' | 'ai';
}

export interface BulkDownloadProgress {
  isDownloading: boolean;
  total: number;
  current: number;
  percent: number;
  currentFileName?: string;
  statusText?: string;
  cancelled?: boolean;
}


