import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { workspaceStore } from './workspaceStore.js';
import { extractMediaDetails } from './mediaManager.js';

// Safe BigInt serializer helper
export function extractNormalizedChatId(message: any): string {
  if (!message) return '';

  if (typeof message.getChatId === 'function') {
    try {
      const cid = message.getChatId();
      if (cid !== undefined && cid !== null) {
        return cid.toString();
      }
    } catch {}
  }

  if (message.chatId !== undefined && message.chatId !== null) {
    return message.chatId.toString();
  }

  if (message.peerId) {
    if (message.peerId.userId) {
      return message.peerId.userId.toString();
    }
    if (message.peerId.chatId) {
      const idStr = message.peerId.chatId.toString();
      return idStr.startsWith('-') ? idStr : `-${idStr}`;
    }
    if (message.peerId.channelId) {
      const idStr = message.peerId.channelId.toString();
      if (idStr.startsWith('-100')) return idStr;
      if (idStr.startsWith('-')) return idStr;
      return `-100${idStr}`;
    }
  }

  return '';
}

export function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export function sanitizeTelegramData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return data.toString();
  if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'string') return data;

  if (typeof data === 'object') {
    // 1. GramJS big-integer / Long / BigInt wrapper objects
    if (typeof data.toJSNumber === 'function' || typeof data.toBigInt === 'function') {
      return data.toString();
    }
    if (
      data.value !== undefined &&
      (data.isNegative !== undefined || typeof data.toString === 'function' || Object.keys(data).length <= 3)
    ) {
      return data.toString();
    }
    if (data.low !== undefined && data.high !== undefined) {
      return data.toString();
    }

    // 2. Buffers / Uint8Arrays
    if (Buffer.isBuffer(data) || data.type === 'Buffer' || data instanceof Uint8Array) {
      return Buffer.from(data).toString('base64');
    }

    // 3. Date
    if (data instanceof Date) {
      return data.toISOString();
    }

    // 4. Array
    if (Array.isArray(data)) {
      return data.map(sanitizeTelegramData);
    }

    // 5. Plain object / class instance
    const res: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue; // Skip internal GramJS private props
      res[k] = sanitizeTelegramData(v);
    }
    return res;
  }

  return String(data);
}

export function formatTelegramUser(me: any): any {
  if (!me) return null;
  return {
    id: me.id ? (typeof me.id === 'object' && me.id.value !== undefined ? (typeof me.id.toString === 'function' ? me.id.toString() : String(me.id.value)) : me.id.toString()) : '',
    firstName: typeof me.firstName === 'string' ? me.firstName : (me.firstName ? String(me.firstName) : ''),
    lastName: typeof me.lastName === 'string' ? me.lastName : (me.lastName ? String(me.lastName) : ''),
    username: typeof me.username === 'string' ? me.username : (me.username ? String(me.username) : ''),
    phone: typeof me.phone === 'string' ? me.phone : (me.phone ? String(me.phone) : ''),
    premium: Boolean(me.premium),
    verified: Boolean(me.verified),
    bot: Boolean(me.bot),
    scam: Boolean(me.scam),
    fake: Boolean(me.fake),
  };
}

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
}

export interface TelegramAuthStatus {
  isConfigured: boolean;
  isAuthenticated: boolean;
  isConnected?: boolean;
  isConnecting: boolean;
  user: any | null;
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

class TelegramManager extends EventEmitter {
  private client: TelegramClient | null = null;
  private sessionFilePath: string;
  private userFilePath: string;
  private configFilePath: string;
  private config: TelegramConfig | null = null;
  private isConnecting: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private currentQrState: {
    active: boolean;
    qrUrl?: string;
    tgUrl?: string;
    expiresAt?: number;
    requires2fa?: boolean;
    hint?: string;
  } = { active: false };

  // Pending 2FA password resolver
  private pendingPasswordResolver: ((password: string) => void) | null = null;
  private pendingPhoneCodeResolver: {
    phoneNumber?: string;
    phoneCodeHash?: string;
  } | null = null;

  constructor() {
    super();
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.sessionFilePath = path.join(dataDir, 'telegram_session.txt');
    this.userFilePath = path.join(dataDir, 'telegram_user.json');
    this.configFilePath = path.join(dataDir, 'telegram_config.json');

    this.loadConfig();
  }

  public loadConfig(): TelegramConfig {
    // 1. Check environment variables
    const envApiId = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : undefined;
    const envApiHash = process.env.TELEGRAM_API_HASH;

    if (envApiId && envApiHash) {
      this.config = { apiId: envApiId, apiHash: envApiHash };
      return this.config;
    }

    // 2. Check stored config file
    if (fs.existsSync(this.configFilePath)) {
      try {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.apiId && parsed.apiHash) {
          this.config = {
            apiId: parseInt(parsed.apiId, 10),
            apiHash: parsed.apiHash.trim(),
          };
          return this.config;
        }
      } catch (err) {
        console.error('Failed to parse telegram_config.json:', err);
      }
    }

    // 3. Official Telegram Desktop Client default credentials
    this.config = {
      apiId: 2040,
      apiHash: 'b18441a1ff607e10a989891a5462e627',
    };
    return this.config;
  }

  public setConfig(apiId: number, apiHash: string) {
    this.config = { apiId, apiHash: apiHash.trim() };
    fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf-8');
    this.emit('config_updated', this.config);
  }

  public getSavedSession(): string {
    if (fs.existsSync(this.sessionFilePath)) {
      try {
        const session = fs.readFileSync(this.sessionFilePath, 'utf-8').trim();
        return session;
      } catch {
        return '';
      }
    }
    return '';
  }

  public saveSession(sessionString: string) {
    if (!sessionString || sessionString.trim().length === 0) return;
    try {
      const dataDir = path.dirname(this.sessionFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.sessionFilePath, sessionString.trim(), 'utf-8');
      console.log(`[Telegram] Session successfully saved persistently to ${this.sessionFilePath}`);
    } catch (err) {
      console.error('[Telegram] Failed to write session to disk:', err);
    }
  }

  public clearSession() {
    if (fs.existsSync(this.sessionFilePath)) {
      try {
        fs.unlinkSync(this.sessionFilePath);
        console.log('[Telegram] Persistent session file removed.');
      } catch (err) {
        console.error('Failed to delete session file:', err);
      }
    }
    this.clearUserCache();
  }

  public getCachedUser(): any | null {
    if (fs.existsSync(this.userFilePath)) {
      try {
        const raw = fs.readFileSync(this.userFilePath, 'utf-8');
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  public cacheUser(user: any) {
    if (!user) return;
    try {
      fs.writeFileSync(this.userFilePath, JSON.stringify(user, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Telegram] Failed to cache user info:', err);
    }
  }

  public clearUserCache() {
    if (fs.existsSync(this.userFilePath)) {
      try {
        fs.unlinkSync(this.userFilePath);
      } catch {}
    }
  }

  public async getStatus(): Promise<TelegramAuthStatus> {
    const isConfigured = Boolean(this.config && this.config.apiId && this.config.apiHash);
    const sessionString = this.getSavedSession();
    const sessionExists = Boolean(sessionString && sessionString.length > 10);
    const cachedUser = this.getCachedUser();

    if (!isConfigured) {
      return {
        isConfigured: false,
        isAuthenticated: false,
        isConnected: false,
        isConnecting: false,
        user: null,
        sessionExists: false,
        qrState: this.currentQrState,
      };
    }

    if (this.client) {
      try {
        const isAuth = await this.client.isUserAuthorized();
        if (isAuth) {
          let user = cachedUser;
          try {
            const me: any = await this.client.getMe();
            user = formatTelegramUser(me);
            this.cacheUser(user);
          } catch {}

          return {
            isConfigured: true,
            isAuthenticated: true,
            isConnected: true,
            isConnecting: false,
            user,
            dcId: (this.client as any).session?.dcId,
            sessionExists: true,
            qrState: { active: false },
          };
        }
      } catch (err: any) {
        console.warn('[Telegram] Session check non-fatal error:', err?.message || err);
      }
    }

    // If session exists on disk, trigger background auto-restoration if not running
    if (sessionExists) {
      if (!this.isConnecting && !this.initPromise) {
        this.initialize().catch((err) => {
          console.warn('[Telegram] Auto-restore session attempt:', err?.message || err);
        });
      }

      return {
        isConfigured: true,
        isAuthenticated: Boolean(cachedUser),
        isConnected: false,
        isConnecting: true,
        user: cachedUser,
        sessionExists: true,
        qrState: { active: false },
      };
    }

    return {
      isConfigured: true,
      isAuthenticated: false,
      isConnected: false,
      isConnecting: this.isConnecting,
      user: null,
      sessionExists: false,
      qrState: this.currentQrState,
    };
  }

  public async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (!this.config) {
        this.loadConfig();
      }
      if (!this.config) return false;

      const savedSession = this.getSavedSession();
      if (!savedSession) {
        this.isConnecting = false;
        return false;
      }

      try {
        this.isConnecting = true;
        this.emit('status_change', { isConnecting: true, sessionExists: true });

        // If client already authorized, keep it
        if (this.client) {
          try {
            if (await this.client.isUserAuthorized()) {
              const me: any = await this.client.getMe();
              const formatted = formatTelegramUser(me);
              this.cacheUser(formatted);
              this.isConnecting = false;
              this.emit('authenticated', formatted);
              this.emit('status_change', {
                isAuthenticated: true,
                isConnected: true,
                isConnecting: false,
                user: formatted,
                sessionExists: true,
              });
              return true;
            }
          } catch {}
        }

        console.log('[Telegram] Restoring persistent MTProto session from storage...');
        const stringSession = new StringSession(savedSession);
        this.client = new TelegramClient(stringSession, this.config.apiId, this.config.apiHash, {
          connectionRetries: 10,
          autoReconnect: true,
          useWSS: false,
        });

        await this.client.connect();
        const isAuthorized = await this.client.isUserAuthorized();

        if (isAuthorized) {
          const me: any = await this.client.getMe();
          const formatted = formatTelegramUser(me);
          console.log(`[Telegram] Session verified! Authenticated as ${me.firstName || ''} (${me.username || me.id})`);
          this.cacheUser(formatted);
          this.setupEventHandlers();
          this.isConnecting = false;
          this.currentQrState = { active: false };
          this.emit('authenticated', formatted);
          this.emit('status_change', {
            isAuthenticated: true,
            isConnected: true,
            isConnecting: false,
            user: formatted,
            sessionExists: true,
          });
          return true;
        } else {
          console.log('[Telegram] Saved session is invalid or revoked by Telegram server.');
          this.clearSession();
          this.isConnecting = false;
          this.emit('status_change', {
            isAuthenticated: false,
            isConnected: false,
            isConnecting: false,
            sessionExists: false,
          });
          return false;
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        console.error('[Telegram] Initialize session error:', errMsg);
        this.isConnecting = false;

        // ONLY clear session if Telegram explicitly returned authorization revocation
        if (
          errMsg.includes('AUTH_KEY_UNREGISTERED') ||
          errMsg.includes('SESSION_REVOKED') ||
          errMsg.includes('USER_DEACTIVATED')
        ) {
          console.log('[Telegram] Auth key is permanently revoked, deleting saved session.');
          this.clearSession();
          this.emit('status_change', {
            isAuthenticated: false,
            isConnected: false,
            isConnecting: false,
            sessionExists: false,
          });
        }
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private setupEventHandlers() {
    if (!this.client) return;

    // Listen to real-time incoming messages
    this.client.addEventHandler((event: any) => {
      try {
        const message = event.message;
        if (!message) return;

        const chatId = extractNormalizedChatId(message);
        const text = message.text || message.message || '';
        const mediaInfo = extractMediaDetails(message, chatId);

        const sanitized = sanitizeTelegramData({
          id: message.id,
          peerId: message.peerId,
          chatId,
          senderId: message.senderId?.toString(),
          senderName: message.sender ? (message.sender.firstName ? `${message.sender.firstName} ${message.sender.lastName || ''}`.trim() : message.sender.username || message.sender.title) : null,
          text,
          date: message.date ? (typeof message.date === 'number' && message.date < 2000000000 ? message.date * 1000 : message.date) : Date.now(),
          out: Boolean(message.out),
          media: mediaInfo,
          mediaType: mediaInfo?.type || null,
        });

        this.emit('new_message', sanitized);

        // Keyword Monitor scan
        if (text && !message.out) {
          try {
            const keywords = workspaceStore.getKeywords();
            const lowerText = text.toLowerCase();
            for (const kw of keywords) {
              if (kw.keyword && lowerText.includes(kw.keyword.toLowerCase())) {
                const alert = workspaceStore.addAlert({
                  keyword: kw.keyword,
                  chatId,
                  chatTitle: 'Chat ' + chatId,
                  senderName: message.senderId?.toString() || 'User',
                  messageId: message.id,
                  messageText: text,
                  date: message.date || Math.floor(Date.now() / 1000),
                });
                this.emit('keyword_alert', alert);
              }
            }
          } catch (kwErr) {
            console.error('Error matching keywords:', kwErr);
          }
        }
      } catch (err) {
        console.error('Error handling Telegram event:', err);
      }
    }, new NewMessage({}));
  }

  public async forwardMessages(fromChatId: string, toChatId: string, messageIds: number[]): Promise<any> {
    if (!this.client) throw new Error('Telegram client is not connected.');
    const fromEntity = await this.client.getEntity(fromChatId);
    const toEntity = await this.client.getEntity(toChatId);

    const result = await this.client.forwardMessages(toEntity, {
      messages: messageIds,
      fromPeer: fromEntity,
    });
    return sanitizeTelegramData(result);
  }

  public async deleteMessages(chatId: string, messageIds: number[], revoke: boolean = true): Promise<any> {
    if (!this.client) throw new Error('Telegram client is not connected.');
    const entity = await this.client.getEntity(chatId);
    const result = await this.client.deleteMessages(entity, messageIds, { revoke });
    return sanitizeTelegramData(result);
  }

  public async searchGlobalMessages(query: string, limit: number = 30): Promise<any[]> {
    if (!this.client) throw new Error('Telegram client is not connected.');
    const messages = await this.client.getMessages(undefined as any, {
      search: query,
      limit,
    });
    return (messages || []).map((m: any) =>
      sanitizeTelegramData({
        id: m.id,
        chatId: m.chatId?.toString() || m.peerId?.userId?.toString() || m.peerId?.channelId?.toString() || m.peerId?.chatId?.toString() || '',
        senderId: m.senderId?.toString(),
        text: m.text || m.message || '',
        date: m.date,
        out: m.out,
        media: Boolean(m.media),
        mediaType: m.media?.className || (m.media ? 'Media' : null),
      })
    );
  }

  public async startQrLogin(force: boolean = false): Promise<void> {
    if (!this.config) {
      throw new Error('Telegram API ID and API Hash must be configured first.');
    }

    // If session already exists and not forced, try restoring first
    if (!force && this.getSavedSession()) {
      const restored = await this.initialize();
      if (restored) return;
    }

    if (this.isConnecting && this.currentQrState.active) {
      return;
    }

    this.isConnecting = true;
    this.currentQrState = { active: true };

    const stringSession = new StringSession('');
    this.client = new TelegramClient(stringSession, this.config.apiId, this.config.apiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();

    // Start QR sign in flow
    (async () => {
      try {
        await this.client!.signInUserWithQrCode(
          {
            apiId: this.config!.apiId,
            apiHash: this.config!.apiHash,
          },
          {
            qrCode: async (code) => {
              try {
                // Format official Telegram tg://login URL
                const tokenStr = Buffer.from(code.token).toString('base64url');
                const tgUrl = `tg://login?token=${tokenStr}`;
                const qrUrl = await QRCode.toDataURL(tgUrl, {
                  errorCorrectionLevel: 'M',
                  margin: 2,
                  width: 320,
                  color: {
                    dark: '#0f172a',
                    light: '#ffffff',
                  },
                });

                this.currentQrState = {
                  active: true,
                  qrUrl,
                  tgUrl,
                  expiresAt: Date.now() + (code.expires ? code.expires * 1000 : 30000),
                  requires2fa: false,
                };

                this.emit('qr_updated', this.currentQrState);
              } catch (qrErr) {
                console.error('[Telegram] QR generation error:', qrErr);
              }
            },
            password: async (hint) => {
              // 2FA required
              this.currentQrState = {
                ...this.currentQrState,
                requires2fa: true,
                hint: hint || undefined,
              };
              this.emit('2fa_required', { hint });

              return new Promise<string>((resolve) => {
                this.pendingPasswordResolver = resolve;
              });
            },
            onError: (err) => {
              console.error('[Telegram] QR Login error callback:', err);
              this.currentQrState = { active: false };
              this.emit('auth_error', { message: err?.message || 'QR Authentication failed' });
            },
          }
        );

        // Sign in successful!
        const savedSession = (this.client!.session as any).save();
        this.saveSession(savedSession);
        this.setupEventHandlers();

        const me: any = await this.client!.getMe();
        const user = formatTelegramUser(me);
        this.cacheUser(user);
        this.isConnecting = false;
        this.currentQrState = { active: false };
        this.emit('authenticated', user);
        this.emit('status_change', {
          isAuthenticated: true,
          isConnected: true,
          isConnecting: false,
          user,
          sessionExists: true,
        });
      } catch (err: any) {
        console.error('[Telegram] signInUserWithQrCode failure:', err?.message || err);
        this.isConnecting = false;
        this.currentQrState = { active: false };
        this.emit('auth_error', { message: err?.message || 'Login failed or expired' });
      }
    })();
  }

  public submit2FAPassword(password: string): boolean {
    if (this.pendingPasswordResolver) {
      this.pendingPasswordResolver(password);
      this.pendingPasswordResolver = null;
      return true;
    }
    return false;
  }

  public async sendPhoneCode(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    if (!this.config) {
      throw new Error('Telegram API ID and API Hash must be configured first.');
    }

    const stringSession = new StringSession('');
    this.client = new TelegramClient(stringSession, this.config.apiId, this.config.apiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();
    const result = await this.client.sendCode(
      {
        apiId: this.config.apiId,
        apiHash: this.config.apiHash,
      },
      phoneNumber
    );

    this.pendingPhoneCodeResolver = {
      phoneNumber,
      phoneCodeHash: result.phoneCodeHash,
    };

    return { phoneCodeHash: result.phoneCodeHash };
  }

  public async verifyPhoneCode(code: string, password?: string): Promise<any> {
    if (!this.client || !this.pendingPhoneCodeResolver) {
      throw new Error('No pending phone verification session.');
    }

    const { phoneNumber, phoneCodeHash } = this.pendingPhoneCodeResolver;

    try {
      await this.client.signInUser(
        {
          apiId: this.config!.apiId,
          apiHash: this.config!.apiHash,
        },
        {
          phoneNumber: async () => phoneNumber!,
          phoneCode: async () => code,
          password: async () => password || '',
          onError: (err) => {
            throw err;
          },
        }
      );

      const savedSession = (this.client.session as any).save();
      this.saveSession(savedSession);
      this.setupEventHandlers();

      const me: any = await this.client.getMe();
      this.isConnecting = false;
      this.pendingPhoneCodeResolver = null;
      this.emit('authenticated', sanitizeTelegramData(me));
      return sanitizeTelegramData(me);
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
        return { requires2fa: true };
      }
      throw err;
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.client) {
        try {
          await this.client.invoke(new Api.auth.LogOut());
        } catch {
          // ignore if already logged out
        }
        await this.client.disconnect();
      }
    } catch (err) {
      console.warn('Error during Telegram logout call:', err);
    } finally {
      this.client = null;
      this.clearSession();
      this.currentQrState = { active: false };
      this.emit('logged_out');
    }
  }

  public getClient(): TelegramClient {
    if (!this.client) {
      throw new Error('Telegram client is not initialized or connected.');
    }
    return this.client;
  }
}

export const telegramManager = new TelegramManager();
