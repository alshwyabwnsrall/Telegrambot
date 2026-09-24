import fs from 'fs';
import path from 'path';

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

class WorkspaceStore {
  private dataDir: string;
  private bookmarksFile: string;
  private keywordsFile: string;
  private alertsFile: string;
  private clipboardFile: string;
  private paymentsFile: string;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.bookmarksFile = path.join(this.dataDir, 'workspace_bookmarks.json');
    this.keywordsFile = path.join(this.dataDir, 'workspace_keywords.json');
    this.alertsFile = path.join(this.dataDir, 'workspace_alerts.json');
    this.clipboardFile = path.join(this.dataDir, 'workspace_clipboard.json');
    this.paymentsFile = path.join(this.dataDir, 'workspace_payments.json');

    this.initDefaults();
  }

  private initDefaults() {
    if (!fs.existsSync(this.keywordsFile)) {
      const defaultKeywords: MonitoredKeyword[] = [
        { id: '1', keyword: 'XAUUSD', notify: true, matchCount: 0, createdAt: Date.now() },
        { id: '2', keyword: 'Gold', notify: true, matchCount: 0, createdAt: Date.now() },
        { id: '3', keyword: 'TradingView', notify: true, matchCount: 0, createdAt: Date.now() },
        { id: '4', keyword: 'Bitcoin', notify: true, matchCount: 0, createdAt: Date.now() },
        { id: '5', keyword: 'MT5', notify: true, matchCount: 0, createdAt: Date.now() },
      ];
      this.writeJson(this.keywordsFile, defaultKeywords);
    }
  }

  private readJson<T>(filePath: string, fallback: T): T {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
    return fallback;
  }

  private writeJson<T>(filePath: string, data: T) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
    }
  }

  // Bookmarks
  public getBookmarks(): BookmarkedMessage[] {
    return this.readJson<BookmarkedMessage[]>(this.bookmarksFile, []);
  }

  public addBookmark(item: Omit<BookmarkedMessage, 'id' | 'savedAt'>): BookmarkedMessage {
    const list = this.getBookmarks();
    const existing = list.find((b) => b.chatId === item.chatId && b.messageId === item.messageId);
    if (existing) {
      existing.collection = item.collection;
      this.writeJson(this.bookmarksFile, list);
      return existing;
    }

    const newBookmark: BookmarkedMessage = {
      ...item,
      id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      savedAt: Date.now(),
    };
    list.unshift(newBookmark);
    this.writeJson(this.bookmarksFile, list);
    return newBookmark;
  }

  public removeBookmark(id: string): boolean {
    const list = this.getBookmarks();
    const filtered = list.filter((b) => b.id !== id);
    if (filtered.length !== list.length) {
      this.writeJson(this.bookmarksFile, filtered);
      return true;
    }
    return false;
  }

  public updateBookmarkCollection(id: string, collection: string): boolean {
    const list = this.getBookmarks();
    const item = list.find((b) => b.id === id);
    if (item) {
      item.collection = collection;
      this.writeJson(this.bookmarksFile, list);
      return true;
    }
    return false;
  }

  // Keywords
  public getKeywords(): MonitoredKeyword[] {
    return this.readJson<MonitoredKeyword[]>(this.keywordsFile, []);
  }

  public addKeyword(keyword: string): MonitoredKeyword {
    const list = this.getKeywords();
    const trimmed = keyword.trim();
    const existing = list.find((k) => k.keyword.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const newKw: MonitoredKeyword = {
      id: `kw_${Date.now()}`,
      keyword: trimmed,
      notify: true,
      matchCount: 0,
      createdAt: Date.now(),
    };
    list.push(newKw);
    this.writeJson(this.keywordsFile, list);
    return newKw;
  }

  public removeKeyword(id: string): boolean {
    const list = this.getKeywords();
    const filtered = list.filter((k) => k.id !== id);
    this.writeJson(this.keywordsFile, filtered);
    return filtered.length !== list.length;
  }

  // Alerts
  public getAlerts(): KeywordAlert[] {
    return this.readJson<KeywordAlert[]>(this.alertsFile, []);
  }

  public addAlert(alert: Omit<KeywordAlert, 'id' | 'read'>): KeywordAlert {
    const list = this.getAlerts();
    const newAlert: KeywordAlert = {
      ...alert,
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      read: false,
    };
    list.unshift(newAlert);
    // Keep max 100 alerts
    if (list.length > 100) list.pop();
    this.writeJson(this.alertsFile, list);

    // Increment keyword match counter
    const kwList = this.getKeywords();
    const kw = kwList.find((k) => k.keyword.toLowerCase() === alert.keyword.toLowerCase());
    if (kw) {
      kw.matchCount = (kw.matchCount || 0) + 1;
      this.writeJson(this.keywordsFile, kwList);
    }

    return newAlert;
  }

  public markAlertsRead(): void {
    const list = this.getAlerts();
    list.forEach((a) => {
      a.read = true;
    });
    this.writeJson(this.alertsFile, list);
  }

  // Clipboard
  public getClipboard(): ClipboardItem[] {
    return this.readJson<ClipboardItem[]>(this.clipboardFile, []);
  }

  public addClipboard(text: string, sourceChat?: string): ClipboardItem {
    const list = this.getClipboard();
    const clean = text.trim();
    if (!clean) return { id: '', text: '', copiedAt: Date.now() };

    // Remove duplicates
    const filtered = list.filter((i) => i.text !== clean);
    const item: ClipboardItem = {
      id: `cp_${Date.now()}`,
      text: clean,
      sourceChat,
      copiedAt: Date.now(),
    };
    filtered.unshift(item);
    if (filtered.length > 50) filtered.pop();
    this.writeJson(this.clipboardFile, filtered);
    return item;
  }

  public clearClipboard(): void {
    this.writeJson(this.clipboardFile, []);
  }

  // Payments / Subscriptions Architecture
  public getPayments(): PaymentTransaction[] {
    return this.readJson<PaymentTransaction[]>(this.paymentsFile, []);
  }

  public createPaymentOrder(params: {
    planName: string;
    amount: number;
    currency: string;
    provider: 'telegram_stars' | 'stripe' | 'crypto' | 'custom';
    customerEmail?: string;
  }): PaymentTransaction {
    const list = this.getPayments();
    const newTx: PaymentTransaction = {
      id: `tx_${Date.now()}`,
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      provider: params.provider,
      amount: params.amount,
      currency: params.currency,
      planName: params.planName,
      status: 'pending',
      createdAt: Date.now(),
      customerEmail: params.customerEmail,
    };
    list.unshift(newTx);
    this.writeJson(this.paymentsFile, list);
    return newTx;
  }
}

export const workspaceStore = new WorkspaceStore();
