import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { Api } from 'telegram';
import { telegramManager, sanitizeTelegramData } from './telegramManager.js';
import {
  extractMediaDetails,
  streamMediaFile,
  getCachePath,
  getMetaPath,
  getThumbPath,
} from './mediaManager.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// 1. Status & Config
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await telegramManager.getStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get status' });
  }
});

router.post('/config', (req: Request, res: Response) => {
  try {
    const { apiId, apiHash } = req.body;
    if (!apiId || !apiHash) {
      return res.status(400).json({ success: false, error: 'apiId and apiHash are required' });
    }

    const numApiId = parseInt(apiId, 10);
    if (isNaN(numApiId) || numApiId <= 0) {
      return res.status(400).json({ success: false, error: 'apiId must be a valid positive integer' });
    }

    telegramManager.setConfig(numApiId, apiHash.trim());
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save configuration' });
  }
});

// 2. QR Login
router.post('/auth/qr/start', async (req: Request, res: Response) => {
  try {
    const force = Boolean(req.body?.force);
    await telegramManager.startQrLogin(force);
    const status = await telegramManager.getStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to start QR login' });
  }
});

router.post('/auth/2fa', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const resolved = telegramManager.submit2FAPassword(password);
    res.json({ success: resolved, message: resolved ? 'Password submitted' : 'No pending 2FA challenge' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to submit 2FA' });
  }
});

// 3. Phone Login (Fallback / Alternative)
router.post('/auth/phone/send-code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const result = await telegramManager.sendPhoneCode(phoneNumber.trim());
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to send phone code' });
  }
});

router.post('/auth/phone/verify', async (req: Request, res: Response) => {
  try {
    const { code, password } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Verification code is required' });
    }

    const result = await telegramManager.verifyPhoneCode(code.trim(), password);
    res.json({ success: true, user: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Verification failed' });
  }
});

// 4. Logout / Revoke
router.post('/logout', async (req: Request, res: Response) => {
  try {
    await telegramManager.logout();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Logout failed' });
  }
});

function getMessagePreviewText(m: any): string {
  if (!m) return '';
  if (m.message && typeof m.message === 'string' && m.message.trim().length > 0) {
    return m.message;
  }
  if (m.text && typeof m.text === 'string' && m.text.trim().length > 0) {
    return m.text;
  }
  if (m.photo) return '📷 صورة';
  if (m.document) {
    const mime = m.document.mimeType || '';
    if (mime.includes('image')) return '📷 صورة';
    if (mime.includes('video')) return '🎥 فيديو';
    if (mime.includes('audio')) return '🎵 ملف صوتي';
    return '📄 مستند';
  }
  if (m.sticker) return '🎨 ملصق';
  if (m.voice) return '🎙️ رسالة صوتية';
  if (m.media) return '📎 وسائط';
  if (m.action) return '🔔 إشعار';
  return 'رسالة جديدة';
}

// 5. Dialogs (Real Chats, Groups, Channels)
router.get('/dialogs', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 500, 1000);
    const includeArchived = req.query.archived !== 'false';

    // Fetch main dialogs and archived dialogs to ensure all channels (even muted/archived) are loaded
    const mainPromise = client.getDialogs({ limit });
    const archivedPromise = includeArchived
      ? client.getDialogs({ folder: 1, limit: 300 }).catch(() => [])
      : Promise.resolve([]);

    const [mainDialogs, archivedDialogs] = await Promise.all([mainPromise, archivedPromise]);

    const seenIds = new Set<string>();
    const allDialogs: any[] = [];
    for (const d of [...(mainDialogs || []), ...(archivedDialogs || [])]) {
      const idStr = d.id?.toString();
      if (idStr && !seenIds.has(idStr)) {
        seenIds.add(idStr);
        allDialogs.push(d);
      }
    }

    const formatted = allDialogs.map((d: any) => {
      const entity = d.entity || {};
      let type = 'user';
      if (d.isChannel) {
        type = entity.megagroup ? 'group' : 'channel';
      } else if (d.isGroup) {
        type = 'group';
      }

      const lastMsgText = d.message ? getMessagePreviewText(d.message) : '';

      return {
        id: d.id?.toString(),
        title: d.title || d.name || entity.firstName || entity.username || 'Chat',
        name: d.name || '',
        username: entity.username || '',
        phone: entity.phone || '',
        type,
        isUser: Boolean(d.isUser),
        isGroup: Boolean(d.isGroup || (d.isChannel && entity.megagroup)),
        isChannel: Boolean(d.isChannel && !entity.megagroup),
        pinned: Boolean(d.pinned),
        unreadCount: d.unreadCount || 0,
        unreadMentionsCount: d.unreadMentionsCount || 0,
        date: d.date ? d.date * 1000 : Date.now(),
        lastMessage: d.message ? {
          id: d.message.id,
          text: lastMsgText,
          date: d.message.date ? d.message.date * 1000 : Date.now(),
          out: Boolean(d.message.out),
          media: Boolean(d.message.media),
          mediaType: d.message.media?.className || null,
        } : null,
      };
    });

    res.json({
      success: true,
      dialogs: sanitizeTelegramData(formatted),
      total: formatted.length,
      channelsCount: formatted.filter((d: any) => d.isChannel).length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch dialogs' });
  }
});

async function getTelegramPeer(client: any, chatId: string) {
  if (!chatId) return chatId;

  let peer: any = chatId;
  if (/^-?\d+$/.test(chatId)) {
    try {
      peer = BigInt(chatId);
    } catch {
      peer = chatId;
    }
  }

  try {
    return await client.getInputEntity(peer);
  } catch {
    try {
      return await client.getEntity(peer);
    } catch {
      try {
        const dialogs = await client.getDialogs({ limit: 100 });
        for (const d of dialogs) {
          const dId = d.id?.toString();
          if (
            dId === chatId ||
            (dId && chatId && dId.replace(/^-100/, '').replace(/^-/, '') === chatId.replace(/^-100/, '').replace(/^-/, ''))
          ) {
            if (d.inputEntity) return d.inputEntity;
            if (d.entity) return d.entity;
          }
        }
      } catch {}

      if (typeof chatId === 'string' && chatId.startsWith('-100')) {
        const cleanId = BigInt(chatId.slice(4));
        try {
          return await client.getInputEntity(cleanId);
        } catch {
          try {
            return await client.getEntity(cleanId);
          } catch {}
        }
      }

      return peer;
    }
  }
}

// 6. Messages for a specific Chat
router.get('/messages/:chatId', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offsetId = req.query.offsetId ? parseInt(req.query.offsetId as string, 10) : 0;
    const search = (req.query.search as string) || undefined;

    let peer = await getTelegramPeer(client, String(chatId));

    let messages: any[];
    try {
      messages = await client.getMessages(peer, {
        limit,
        offsetId,
        search,
      });
    } catch (getErr) {
      await client.getDialogs({ limit: 100 });
      peer = await getTelegramPeer(client, String(chatId));
      messages = await client.getMessages(peer, {
        limit,
        offsetId,
        search,
      });
    }

    const formatted = messages.map((m: any) => {
      const mediaInfo = extractMediaDetails(m, String(chatId));

      return {
        id: m.id,
        chatId,
        senderId: m.senderId?.toString() || null,
        senderName: m.sender ? (m.sender.firstName ? `${m.sender.firstName} ${m.sender.lastName || ''}`.trim() : m.sender.username || m.sender.title) : null,
        text: m.text || m.message || getMessagePreviewText(m),
        date: m.date ? (typeof m.date === 'number' && m.date < 2000000000 ? m.date * 1000 : m.date) : Date.now(),
        out: Boolean(m.out),
        replyToMsgId: m.replyTo?.replyToMsgId || null,
        views: m.views || null,
        forwards: m.forwards || null,
        media: mediaInfo,
      };
    });

    res.json({ success: true, messages: sanitizeTelegramData(formatted) });
  } catch (err: any) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ success: false, error: err?.message || err?.errorMessage || 'Failed to fetch messages' });
  }
});

// 7. Send Text Message
router.post('/messages/send', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId, message, replyTo } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ success: false, error: 'chatId and message are required' });
    }

    console.log(`[Telegram Send Requested] Chat: ${chatId}, Length: ${message.length}, ReplyTo: ${replyTo || 'none'}`);

    let peer = await getTelegramPeer(client, String(chatId));

    const options: any = {
      message: String(message),
    };

    if (replyTo && !isNaN(Number(replyTo))) {
      options.replyTo = Number(replyTo);
    }

    let sent: any;
    try {
      sent = await client.sendMessage(peer, options);
    } catch (sendErr: any) {
      if (options.replyTo) {
        delete options.replyTo;
        sent = await client.sendMessage(peer, options);
      } else {
        await client.getDialogs({ limit: 100 });
        peer = await getTelegramPeer(client, String(chatId));
        sent = await client.sendMessage(peer, options);
      }
    }

    const formattedMessage = sanitizeTelegramData({
      id: sent.id,
      chatId: String(chatId),
      senderId: sent.senderId ? sent.senderId.toString() : null,
      text: sent.message || message,
      date: sent.date ? (typeof sent.date === 'number' && sent.date < 2000000000 ? sent.date * 1000 : sent.date) : Date.now(),
      out: true,
      replyToMsgId: replyTo ? parseInt(replyTo, 10) : null,
      media: null,
    });

    console.log(`[Telegram Send Result] Message ID Received: ${sent.id}, Chat: ${chatId}`);

    // Emit event so WebSockets broadcast to UI
    telegramManager.emit('new_message', formattedMessage);

    res.json({
      success: true,
      message: formattedMessage,
    });
  } catch (err: any) {
    console.error('Send message error:', err);
    let errMsg = err?.message || err?.errorMessage || err?.toString() || 'Failed to send message';
    if (errMsg.includes('CHAT_ADMIN_REQUIRED')) {
      errMsg = 'لا تملك صلاحية النشر في هذه القناة (النشر للمشرفين فقط)';
    } else if (errMsg.includes('USER_BANNED_IN_CHANNEL')) {
      errMsg = 'تم تقييد إرسال الرسائل في هذه المجموعة';
    }
    res.status(500).json({ success: false, error: errMsg });
  }
});

// 8. Upload and Send Media/File
router.post('/messages/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId, caption, replyTo } = req.body;
    const file = req.file;

    if (!chatId || !file) {
      return res.status(400).json({ success: false, error: 'chatId and file are required' });
    }

    console.log(`[Telegram Upload Requested] Chat: ${chatId}, File: ${file.originalname} (${file.size} bytes)`);

    let peer = await getTelegramPeer(client, String(chatId));

    const { CustomFile } = await import('telegram/client/uploads.js');
    const toUpload = new CustomFile(
      file.originalname || 'file',
      file.size,
      '',
      file.buffer
    );

    const options: any = {
      file: toUpload,
      caption: caption || '',
      forceDocument: !file.mimetype.startsWith('image/'),
    };

    if (replyTo && !isNaN(Number(replyTo))) {
      options.replyTo = Number(replyTo);
    }

    let sent: any;
    try {
      sent = await client.sendFile(peer, options);
    } catch (sendErr) {
      if (options.replyTo) {
        delete options.replyTo;
        sent = await client.sendFile(peer, options);
      } else {
        await client.getDialogs({ limit: 100 });
        peer = await getTelegramPeer(client, String(chatId));
        sent = await client.sendFile(peer, options);
      }
    }

    const formattedMessage = sanitizeTelegramData({
      id: sent.id,
      chatId: String(chatId),
      senderId: sent.senderId ? sent.senderId.toString() : null,
      text: sent.message || caption || (file.mimetype.startsWith('image/') ? '📷 صورة' : '📄 مستند'),
      date: sent.date ? (typeof sent.date === 'number' && sent.date < 2000000000 ? sent.date * 1000 : sent.date) : Date.now(),
      out: true,
      replyToMsgId: replyTo ? parseInt(replyTo, 10) : null,
      media: {
        type: file.mimetype.startsWith('image/') ? 'MessageMediaPhoto' : 'MessageMediaDocument',
        hasPhoto: file.mimetype.startsWith('image/'),
        hasDocument: !file.mimetype.startsWith('image/'),
        fileName: file.originalname,
        size: file.size,
      },
    });

    console.log(`[Telegram Send Result] File Message ID Received: ${sent.id}, Chat: ${chatId}`);

    // Emit event so WebSockets broadcast to UI
    telegramManager.emit('new_message', formattedMessage);

    res.json({
      success: true,
      message: formattedMessage,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    let errMsg = err?.message || err?.errorMessage || 'Failed to upload and send file';
    if (errMsg.includes('CHAT_ADMIN_REQUIRED')) {
      errMsg = 'لا تملك صلاحية النشر في هذه القناة (النشر للمشرفين فقط)';
    }
    res.status(500).json({ success: false, error: errMsg });
  }
});

// 9. Download Avatar / Profile Photo
const avatarCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>();

router.get('/avatar/:peerId', async (req: Request, res: Response) => {
  try {
    const { peerId } = req.params;
    const cached = avatarCache.get(peerId);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      res.setHeader('Content-Type', cached.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(cached.buffer);
    }

    const client = telegramManager.getClient();
    const peer = await getTelegramPeer(client, String(peerId));

    const buffer = await client.downloadProfilePhoto(peer, { isBig: false });
    if (buffer && buffer.length > 0) {
      avatarCache.set(peerId, { buffer: Buffer.from(buffer), mimeType: 'image/jpeg', timestamp: Date.now() });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    }

    // Default SVG fallback avatar
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#3b82f6"/><text x="50" y="58" font-family="Arial" font-size="34" fill="#ffffff" text-anchor="middle">TG</text></svg>`);
  } catch {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#64748b"/><text x="50" y="58" font-family="Arial" font-size="34" fill="#ffffff" text-anchor="middle">TG</text></svg>`);
  }
});

// 10. Media Streaming, Download, Thumbnail, and Gallery
router.get('/media/:chatId/:messageId', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId, messageId } = req.params;
    const msgIdNum = parseInt(messageId, 10);
    const forceDownload = req.query.download === '1' || req.query.download === 'true';

    const cacheFile = getCachePath(chatId, msgIdNum);
    const metaFile = getMetaPath(chatId, msgIdNum);

    // 1. If cached on disk, stream directly
    if (fs.existsSync(cacheFile) && fs.existsSync(metaFile)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        return await streamMediaFile(cacheFile, meta, req, res, forceDownload);
      } catch (readErr) {
        console.warn('[Media Cache] Read error, refetching:', readErr);
      }
    }

    // 2. Fetch message from Telegram
    const peer = await getTelegramPeer(client, String(chatId));
    const messages = await client.getMessages(peer, { ids: [msgIdNum] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    const msg = messages[0];
    const mediaDetails = extractMediaDetails(msg, String(chatId));
    if (!mediaDetails) {
      return res.status(404).json({ success: false, error: 'Could not extract media info' });
    }

    // 3. Download media from Telegram client
    const buffer = await client.downloadMedia(msg);
    if (!buffer) {
      return res.status(404).json({ success: false, error: 'Could not download media from Telegram' });
    }

    // 4. Save to cache
    try {
      fs.writeFileSync(cacheFile, buffer);
      fs.writeFileSync(
        metaFile,
        JSON.stringify(
          {
            mimeType: mediaDetails.mimeType,
            fileName: mediaDetails.fileName,
            size: buffer.length,
            duration: mediaDetails.duration,
            width: mediaDetails.width,
            height: mediaDetails.height,
          },
          null,
          2
        )
      );
    } catch (saveErr) {
      console.warn('[Media Cache] Save failed:', saveErr);
    }

    return await streamMediaFile(
      cacheFile,
      {
        mimeType: mediaDetails.mimeType,
        fileName: mediaDetails.fileName,
        size: buffer.length,
      },
      req,
      res,
      forceDownload
    );
  } catch (err: any) {
    console.error('Media fetch error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to stream media' });
  }
});

// Explicit download route
router.get('/download/:chatId/:messageId', async (req: Request, res: Response) => {
  req.query.download = '1';
  // Forward to media handler with download flag
  const client = telegramManager.getClient();
  const { chatId, messageId } = req.params;
  const msgIdNum = parseInt(messageId, 10);

  try {
    const cacheFile = getCachePath(chatId, msgIdNum);
    const metaFile = getMetaPath(chatId, msgIdNum);

    if (fs.existsSync(cacheFile) && fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      return await streamMediaFile(cacheFile, meta, req, res, true);
    }

    const peer = await getTelegramPeer(client, String(chatId));
    const messages = await client.getMessages(peer, { ids: [msgIdNum] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const msg = messages[0];
    const mediaDetails = extractMediaDetails(msg, String(chatId));
    const buffer = await client.downloadMedia(msg);
    if (!buffer) {
      return res.status(404).json({ error: 'Could not download media' });
    }

    try {
      fs.writeFileSync(cacheFile, buffer);
      fs.writeFileSync(
        metaFile,
        JSON.stringify(
          {
            mimeType: mediaDetails?.mimeType || 'application/octet-stream',
            fileName: mediaDetails?.fileName || `file_${msgIdNum}`,
            size: buffer.length,
          },
          null,
          2
        )
      );
    } catch {}

    return await streamMediaFile(
      cacheFile,
      {
        mimeType: mediaDetails?.mimeType || 'application/octet-stream',
        fileName: mediaDetails?.fileName || `file_${msgIdNum}`,
        size: buffer.length,
      },
      req,
      res,
      true
    );
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to download file' });
  }
});

// Thumbnail Route
router.get('/thumb/:chatId/:messageId', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const msgIdNum = parseInt(messageId, 10);
    const thumbFile = getThumbPath(chatId, msgIdNum);

    if (fs.existsSync(thumbFile)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(thumbFile);
    }

    const client = telegramManager.getClient();
    const peer = await getTelegramPeer(client, String(chatId));
    const messages = await client.getMessages(peer, { ids: [msgIdNum] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const msg = messages[0];
    let thumbBuffer: any = null;
    try {
      thumbBuffer = await client.downloadMedia(msg, { thumb: 1 });
    } catch {
      try {
        thumbBuffer = await client.downloadMedia(msg, { thumb: 0 });
      } catch {
        thumbBuffer = await client.downloadMedia(msg);
      }
    }

    if (thumbBuffer && thumbBuffer.length > 0) {
      try {
        fs.writeFileSync(thumbFile, thumbBuffer);
      } catch {}
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(thumbBuffer);
    }

    // Default fallback
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#1e293b"/><path d="M28 32l12 16 8-10 12 16H20z" fill="#0284c7"/></svg>`);
  } catch (err: any) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#1e293b"/><path d="M28 32l12 16 8-10 12 16H20z" fill="#64748b"/></svg>`);
  }
});

// Media Info / Metadata Route
router.get('/media-info/:chatId/:messageId', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const msgIdNum = parseInt(messageId, 10);
    const metaFile = getMetaPath(chatId, msgIdNum);

    if (fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      return res.json({ success: true, meta });
    }

    const client = telegramManager.getClient();
    const peer = await getTelegramPeer(client, String(chatId));
    const messages = await client.getMessages(peer, { ids: [msgIdNum] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    const details = extractMediaDetails(messages[0], String(chatId));
    res.json({ success: true, meta: details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch media info' });
  }
});

// 11. Chat Media Gallery Endpoint
router.get('/media-gallery/:chatId', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId } = req.params;
    const type = (req.query.type as string) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 60, 100);
    const offsetId = req.query.offsetId ? parseInt(req.query.offsetId as string, 10) : 0;
    const search = (req.query.search as string) || undefined;

    const peer = await getTelegramPeer(client, String(chatId));

    // Fetch batch of messages
    const rawMessages = await client.getMessages(peer, {
      limit: 100,
      offsetId,
      search,
    });

    const items: any[] = [];

    for (const m of rawMessages) {
      const mediaDetails = extractMediaDetails(m, String(chatId));
      const text = m.text || m.message || '';

      // Check URL links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const links = text.match(urlRegex) || [];

      if (mediaDetails) {
        let itemType: string = 'document';
        if (mediaDetails.isPhoto) itemType = 'photo';
        else if (mediaDetails.isVideo) itemType = 'video';
        else if (mediaDetails.isVoice) itemType = 'voice';
        else if (mediaDetails.isAudio) itemType = 'audio';
        else itemType = 'document';

        if (type === 'all' || type === itemType) {
          items.push({
            id: m.id,
            chatId: String(chatId),
            messageId: m.id,
            type: itemType,
            date: m.date ? (typeof m.date === 'number' && m.date < 2000000000 ? m.date * 1000 : m.date) : Date.now(),
            text,
            senderName: (m.sender as any)?.firstName || (m.sender as any)?.title || (m.out ? 'You' : 'Sender'),
            media: mediaDetails,
          });
        }
      }

      if ((type === 'all' || type === 'link') && links.length > 0) {
        for (const linkUrl of links) {
          items.push({
            id: m.id,
            chatId: String(chatId),
            messageId: m.id,
            type: 'link',
            date: m.date ? (typeof m.date === 'number' && m.date < 2000000000 ? m.date * 1000 : m.date) : Date.now(),
            text,
            senderName: (m.sender as any)?.firstName || (m.sender as any)?.title || (m.out ? 'You' : 'Sender'),
            linkUrl,
          });
        }
      }

      if (items.length >= limit) break;
    }

    res.json({
      success: true,
      items: sanitizeTelegramData(items),
      count: items.length,
    });
  } catch (err: any) {
    console.error('Media gallery fetch error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch media gallery' });
  }
});

// 11. Real Contacts List
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const result: any = await client.invoke(new Api.contacts.GetContacts({ hash: BigInt(0) as any }));

    const users = (result.users || []).map((u: any) => ({
      id: u.id?.toString(),
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      username: u.username || '',
      phone: u.phone || '',
      mutualContact: Boolean(u.mutualContact),
      verified: Boolean(u.verified),
      premium: Boolean(u.premium),
      status: u.status?.className || 'UserStatusOffline',
    }));

    res.json({ success: true, contacts: sanitizeTelegramData(users) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch contacts' });
  }
});

// 12. Active Devices / Sessions List
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const result: any = await client.invoke(new Api.account.GetAuthorizations());

    const authorizations = (result.authorizations || []).map((auth: any) => ({
      hash: auth.hash?.toString(),
      deviceModel: auth.deviceModel || 'Unknown Device',
      platform: auth.platform || 'Unknown OS',
      systemVersion: auth.systemVersion || '',
      appName: auth.appName || '',
      appVersion: auth.appVersion || '',
      dateCreated: auth.dateCreated ? auth.dateCreated * 1000 : null,
      dateActive: auth.dateActive ? auth.dateActive * 1000 : null,
      ip: auth.ip || '',
      country: auth.country || '',
      region: auth.region || '',
      current: Boolean(auth.current),
    }));

    res.json({ success: true, authorizations: sanitizeTelegramData(authorizations) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch sessions' });
  }
});

// 13. Mark as read (Real Telegram MTProto)
router.post('/read', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId, maxId } = req.body;
    const maxIdNum = maxId ? parseInt(maxId, 10) : 0;

    const peer = await getTelegramPeer(client, String(chatId));

    try {
      await client.markAsRead(peer, maxIdNum > 0 ? maxIdNum : undefined);
    } catch (readErr) {
      try {
        const inputEntity: any = await client.getInputEntity(peer);
        if (inputEntity.className === 'InputChannel' || inputEntity.channelId) {
          await client.invoke(
            new Api.channels.ReadHistory({
              channel: inputEntity,
              maxId: maxIdNum,
            })
          );
        } else {
          await client.invoke(
            new Api.messages.ReadHistory({
              peer: inputEntity,
              maxId: maxIdNum,
            })
          );
        }
      } catch (innerErr) {
        console.warn('[Telegram Read Warning]:', innerErr);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to mark as read' });
  }
});

// 13.1 Mark all as read (Real Telegram MTProto Batch)
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    let { chatIds } = req.body;

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      const dialogs = await client.getDialogs({ limit: 500 });
      chatIds = dialogs
        .filter((d: any) => (d.unreadCount || 0) > 0 || (d.unreadMentionsCount || 0) > 0)
        .map((d: any) => d.id?.toString())
        .filter(Boolean);
    }

    if (!chatIds || chatIds.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    // Process concurrently in chunks of 8 to ensure speed without MTProto flood
    const CHUNK_SIZE = 8;
    for (let i = 0; i < chatIds.length; i += CHUNK_SIZE) {
      const chunk = chatIds.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async (cId: string) => {
          try {
            const peer = await getTelegramPeer(client, String(cId));
            try {
              await client.markAsRead(peer);
            } catch {
              const inputEntity: any = await client.getInputEntity(peer);
              if (inputEntity.className === 'InputChannel' || inputEntity.channelId) {
                await client.invoke(
                  new Api.channels.ReadHistory({
                    channel: inputEntity,
                    maxId: 0,
                  })
                );
              } else {
                await client.invoke(
                  new Api.messages.ReadHistory({
                    peer: inputEntity,
                    maxId: 0,
                  })
                );
              }
            }
          } catch {
            // ignore individual chat error
          }
        })
      );
    }

    res.json({ success: true, count: chatIds.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to mark all as read' });
  }
});

// 14. Forward Messages (Real Telegram MTProto)
router.post('/messages/forward', async (req: Request, res: Response) => {
  try {
    const { fromChatId, toChatId, messageIds } = req.body;
    if (!fromChatId || !toChatId || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fromChatId, toChatId, and messageIds array are required' });
    }

    const result = await telegramManager.forwardMessages(fromChatId, toChatId, messageIds.map(Number));
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to forward messages' });
  }
});

// 15. Delete Messages (Real Telegram MTProto)
router.post('/messages/delete', async (req: Request, res: Response) => {
  try {
    const { chatId, messageIds, revoke = true } = req.body;
    if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'chatId and messageIds are required' });
    }

    const result = await telegramManager.deleteMessages(chatId, messageIds.map(Number), Boolean(revoke));
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete messages' });
  }
});

// 16. Search Messages
router.get('/messages/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) {
      return res.json({ success: true, messages: [] });
    }

    const messages = await telegramManager.searchGlobalMessages(query, 50);
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Search failed' });
  }
});

// 17. Send Reaction (Real Telegram MTProto)
router.post('/messages/react', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId, messageId, emoji } = req.body;
    if (!chatId || !messageId) {
      return res.status(400).json({ success: false, error: 'chatId and messageId are required' });
    }

    const peer = await getTelegramPeer(client, String(chatId));
    const inputEntity = await client.getInputEntity(peer);

    if (emoji) {
      await client.invoke(
        new Api.messages.SendReaction({
          peer: inputEntity,
          msgId: Number(messageId),
          reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
        })
      );
    } else {
      await client.invoke(
        new Api.messages.SendReaction({
          peer: inputEntity,
          msgId: Number(messageId),
          reaction: [],
        })
      );
    }
    res.json({ success: true, emoji, messageId });
  } catch (err: any) {
    const errMsg = err?.errorMessage || err?.message || String(err) || '';
    if (errMsg.includes('MESSAGE_NOT_MODIFIED')) {
      // MTProto standard response when reaction is already set or already removed
      return res.json({ success: true, notModified: true, emoji: req.body.emoji, messageId: req.body.messageId });
    }
    console.warn('[Telegram Reaction Warning]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to send reaction' });
  }
});

// 18. Pin / Unpin Message (Real Telegram MTProto)
router.post('/messages/pin', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { chatId, messageId, unpin = false } = req.body;
    if (!chatId || !messageId) {
      return res.status(400).json({ success: false, error: 'chatId and messageId are required' });
    }

    const peer = await getTelegramPeer(client, String(chatId));
    const inputEntity = await client.getInputEntity(peer);

    await client.invoke(
      new Api.messages.UpdatePinnedMessage({
        peer: inputEntity,
        id: Number(messageId),
        unpin: Boolean(unpin),
        silent: false,
        pmOneside: false,
      })
    );
    res.json({ success: true, messageId, pinned: !unpin });
  } catch (err: any) {
    const errMsg = err?.errorMessage || err?.message || String(err) || '';
    if (errMsg.includes('MESSAGE_NOT_MODIFIED')) {
      return res.json({ success: true, notModified: true, messageId: req.body.messageId, pinned: !req.body.unpin });
    }
    console.warn('[Telegram Pin Warning]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to update pin' });
  }
});

// 19. Global Discovery & Search in Telegram Public Directory (Deep MTProto contacts.Search & ResolveUsername)
router.get('/global-search', async (req: Request, res: Response) => {
  try {
    const rawQuery = (req.query.q as string) || '';
    if (!rawQuery.trim()) {
      return res.json({
        success: true,
        query: '',
        totalResults: 0,
        channels: [],
        groups: [],
        users: [],
      });
    }

    const client = telegramManager.getClient();
    const q = rawQuery.trim();
    const excludeJoined = req.query.excludeJoined !== 'false'; // Exclude joined chats by default

    // Check if input is a Telegram link or @username
    // e.g. https://t.me/durov, t.me/telegram, @telegram, or plain username
    let cleanUsername = '';
    const linkMatch = q.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{3,32})/i);
    if (linkMatch && linkMatch[1]) {
      cleanUsername = linkMatch[1];
    } else if (q.startsWith('@')) {
      cleanUsername = q.slice(1).trim();
    } else if (/^[a-zA-Z0-9_]{4,32}$/.test(q) && !q.includes(' ')) {
      cleanUsername = q;
    }

    // Retrieve user's existing dialog IDs and usernames to filter out already joined chats
    const myDialogIds = new Set<string>();
    const myDialogUsernames = new Set<string>();
    try {
      const dialogs = await client.getDialogs({ limit: 1000 });
      for (const d of dialogs) {
        if (d.id) {
          const sId = d.id.toString();
          myDialogIds.add(sId);
          myDialogIds.add(sId.replace(/^-100/, '').replace(/^-/, ''));
        }
        const u = (d.entity as any)?.username || (d as any)?.username;
        if (u) {
          myDialogUsernames.add(String(u).toLowerCase());
        }
        if (d.title) {
          myDialogUsernames.add(String(d.title).toLowerCase().trim());
        }
      }
    } catch {
      // Continue even if dialog fetch fails
    }

    const channels: any[] = [];
    const groups: any[] = [];
    const users: any[] = [];
    const seenIds = new Set<string>();

    const addEntity = (entity: any) => {
      if (!entity || !entity.id) return;
      const rawId = entity.id.toString();
      if (seenIds.has(rawId)) return;
      seenIds.add(rawId);

      const isChannel = entity.className === 'Channel' || entity.broadcast;
      const isMegagroup = Boolean(entity.megagroup || entity.gigagroup);
      const isChat = entity.className === 'Chat' || (!entity.broadcast && isMegagroup);
      const isUser = entity.className === 'User' || entity.bot !== undefined;

      const formattedId = isChannel ? `-100${rawId}` : rawId;
      const cleanCheckId = rawId.replace(/^-100/, '').replace(/^-/, '');

      const username = entity.username || (entity.usernames && entity.usernames[0]?.username) || null;
      const usernameLower = username ? username.toLowerCase() : '';

      const isJoined =
        myDialogIds.has(formattedId) ||
        myDialogIds.has(rawId) ||
        myDialogIds.has(cleanCheckId) ||
        (Boolean(usernameLower) && myDialogUsernames.has(usernameLower));

      const title =
        entity.title ||
        `${entity.firstName || ''} ${entity.lastName || ''}`.trim() ||
        entity.username ||
        'بدون اسم';

      const participantsCount = entity.participantsCount || null;
      const verified = Boolean(entity.verified);
      const scam = Boolean(entity.scam);
      const fake = Boolean(entity.fake);
      const isBot = Boolean(entity.bot);

      const item = {
        id: formattedId,
        rawId,
        title,
        username,
        type: isUser ? (isBot ? 'bot' : 'user') : isChannel && !isMegagroup ? 'channel' : 'group',
        isChannel: isChannel && !isMegagroup,
        isGroup: isChat || isMegagroup,
        isUser,
        isBot,
        participantsCount,
        verified,
        scam,
        fake,
        hasPhoto: Boolean(entity.photo),
        isJoined,
        about: entity.about || null,
      };

      if (item.isChannel) {
        channels.push(item);
      } else if (item.isGroup) {
        groups.push(item);
      } else {
        users.push(item);
      }
    };

    // Deep Batch Fetching: execute concurrent query variations for balanced channels, groups, and bots
    const searchTasks: Promise<any>[] = [];

    // 1. Direct username / link resolution if applicable
    if (cleanUsername) {
      searchTasks.push(
        client
          .invoke(new Api.contacts.ResolveUsername({ username: cleanUsername }))
          .catch(() => null)
      );
    }

    // 2. Query variations to dig deep and discover 50-60+ results
    const baseQuery = cleanUsername || q;
    const variants = new Set<string>();
    variants.add(baseQuery);

    const words = baseQuery.split(/\s+/).filter((w) => w.length > 2);
    words.forEach((w) => variants.add(w));

    // Specific entity modifiers to balance Channels, Groups, and Bots
    if (!cleanUsername || cleanUsername.length > 3) {
      variants.add(`${baseQuery} bot`);
      variants.add(`${baseQuery}_bot`);
      variants.add(`${baseQuery} group`);
      variants.add(`${baseQuery} chat`);
      variants.add(`${baseQuery} channel`);
    }

    for (const variant of Array.from(variants).slice(0, 6)) {
      searchTasks.push(
        client
          .invoke(
            new Api.contacts.Search({
              q: variant,
              limit: 50,
            })
          )
          .catch(() => null)
      );
    }

    const results = await Promise.allSettled(searchTasks);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const val: any = r.value;
        if (Array.isArray(val.chats)) val.chats.forEach(addEntity);
        if (Array.isArray(val.users)) val.users.forEach(addEntity);
      }
    }

    // Filter results to exclude already joined chats when excludeJoined is active (default)
    const finalChannels = excludeJoined ? channels.filter((c) => !c.isJoined) : channels;
    const finalGroups = excludeJoined ? groups.filter((g) => !g.isJoined) : groups;
    const finalUsers = excludeJoined ? users.filter((u) => !u.isJoined) : users;

    res.json({
      success: true,
      query: rawQuery,
      excludeJoined,
      totalResults: finalChannels.length + finalGroups.length + finalUsers.length,
      unfilteredTotal: channels.length + groups.length + users.length,
      channels: finalChannels,
      groups: finalGroups,
      users: finalUsers,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to search Telegram directory' });
  }
});

// 20. Join Channel / Supergroup (MTProto channels.JoinChannel)
router.post('/channels/join', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const { channelId, username } = req.body;
    if (!channelId && !username) {
      return res.status(400).json({ success: false, error: 'channelId or username is required' });
    }

    let peer: any;
    if (username) {
      peer = await client.getInputEntity(username);
    } else {
      peer = await getTelegramPeer(client, String(channelId));
    }

    const inputEntity = await client.getInputEntity(peer);
    await client.invoke(
      new Api.channels.JoinChannel({
        channel: inputEntity,
      })
    );

    res.json({ success: true, joined: true, channelId, username });
  } catch (err: any) {
    const errMsg = err?.errorMessage || err?.message || '';
    if (errMsg.includes('USER_ALREADY_PARTICIPANT')) {
      return res.json({ success: true, joined: true, alreadyJoined: true });
    }
    console.warn('[Join Channel Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to join channel' });
  }
});

// 21. Channel / Group Preview (Recent messages and details before joining)
router.get('/channels/preview', async (req: Request, res: Response) => {
  try {
    const client = telegramManager.getClient();
    const peerQuery = (req.query.peer as string) || '';
    if (!peerQuery) {
      return res.status(400).json({ success: false, error: 'peer is required' });
    }

    let peer: any;
    if (peerQuery.startsWith('@') || /^[a-zA-Z0-9_]+$/.test(peerQuery)) {
      peer = await client.getEntity(peerQuery.replace(/^@/, ''));
    } else {
      peer = await getTelegramPeer(client, peerQuery);
    }

    const entity: any = await client.getEntity(peer);
    const messages = await client.getMessages(peer, { limit: 25 });

    const title =
      entity.title ||
      `${entity.firstName || ''} ${entity.lastName || ''}`.trim() ||
      entity.username ||
      'معاينة';
    const username = entity.username || (entity.usernames && entity.usernames[0]?.username) || null;
    const participantsCount = entity.participantsCount || null;
    const about = entity.about || null;
    const verified = Boolean(entity.verified);
    const isChannel = Boolean(entity.broadcast);
    const isGroup = Boolean(entity.megagroup || entity.gigagroup || entity.className === 'Chat');

    const formattedMessages = (messages || []).map((m: any) => ({
      id: m.id,
      text: m.text || m.message || '',
      date: m.date,
      views: m.views,
      forwards: m.forwards,
      media: Boolean(m.media),
      mediaType: m.media?.className || (m.media ? 'Media' : null),
    }));

    res.json({
      success: true,
      entity: {
        id: entity.id?.toString(),
        title,
        username,
        participantsCount,
        about,
        verified,
        isChannel,
        isGroup,
      },
      messages: formattedMessages,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to preview channel' });
  }
});

export default router;
