import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { Api } from 'telegram';

const DATA_DIR = path.join(process.cwd(), 'data');
const MEDIA_CACHE_DIR = path.join(DATA_DIR, 'media_cache');
const THUMB_CACHE_DIR = path.join(DATA_DIR, 'thumb_cache');

if (!fs.existsSync(MEDIA_CACHE_DIR)) {
  fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(THUMB_CACHE_DIR)) {
  fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });
}

export interface ExtractedMediaInfo {
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
  mimeType: string;
  fileName: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  performer?: string;
  title?: string;
  waveform?: number[];
  url: string;
  thumbUrl?: string;
  downloadUrl: string;
  supportsStreaming?: boolean;
}

export function extractMediaDetails(m: any, chatId: string): ExtractedMediaInfo | null {
  if (!m || !m.media) return null;

  const msgId = m.id;
  const url = `/api/telegram/media/${chatId}/${msgId}`;
  const thumbUrl = `/api/telegram/thumb/${chatId}/${msgId}`;
  const downloadUrl = `/api/telegram/download/${chatId}/${msgId}`;

  // 1. Photo
  if (m.photo || m.media.photo || m.media.className === 'MessageMediaPhoto') {
    return {
      type: 'MessageMediaPhoto',
      hasPhoto: true,
      isPhoto: true,
      mimeType: 'image/jpeg',
      fileName: `photo_${msgId}.jpg`,
      size: m.photo?.sizes ? Math.max(...m.photo.sizes.map((s: any) => s.size || (s.w && s.h ? s.w * s.h : 0) || 0), 100000) : 100000,
      url,
      thumbUrl,
      downloadUrl,
    };
  }

  // 2. Document / Video / Audio / Voice
  if (m.document || m.media.document || m.media.className === 'MessageMediaDocument') {
    const doc = m.document || m.media.document;
    if (!doc) {
      return {
        type: 'MessageMediaDocument',
        hasDocument: true,
        isDocument: true,
        mimeType: 'application/octet-stream',
        fileName: `file_${msgId}`,
        size: 0,
        url,
        downloadUrl,
      };
    }

    const mime = (doc.mimeType || '').toLowerCase();
    const attributes = doc.attributes || [];

    const filenameAttr = attributes.find((a: any) => a.className === 'DocumentAttributeFilename' || a.fileName);
    const videoAttr = attributes.find((a: any) => a.className === 'DocumentAttributeVideo');
    const audioAttr = attributes.find((a: any) => a.className === 'DocumentAttributeAudio');
    const imageSizeAttr = attributes.find((a: any) => a.className === 'DocumentAttributeImageSize');

    let fileName = filenameAttr?.fileName || `file_${msgId}`;
    const size = doc.size ? Number(doc.size) : 0;

    // Check if video
    const isVideo = Boolean(videoAttr) || mime.startsWith('video/');
    if (isVideo) {
      if (!fileName.includes('.')) fileName += '.mp4';
      return {
        type: 'MessageMediaDocument',
        hasDocument: true,
        isVideo: true,
        mimeType: mime || 'video/mp4',
        fileName,
        size,
        duration: videoAttr?.duration || 0,
        width: videoAttr?.w || 0,
        height: videoAttr?.h || 0,
        supportsStreaming: Boolean(videoAttr?.supportsStreaming),
        url,
        thumbUrl,
        downloadUrl,
      };
    }

    // Check if voice message
    const isVoice = Boolean(audioAttr?.voice) || (mime.startsWith('audio/') && (mime.includes('ogg') || mime.includes('opus')));
    if (isVoice) {
      if (!fileName.includes('.')) fileName += '.ogg';
      let waveformArr: number[] = [];
      if (audioAttr?.waveform) {
        try {
          waveformArr = Array.from(Buffer.isBuffer(audioAttr.waveform) ? audioAttr.waveform : Buffer.from(audioAttr.waveform));
        } catch {}
      }
      return {
        type: 'MessageMediaDocument',
        hasDocument: true,
        isVoice: true,
        isAudio: true,
        mimeType: mime || 'audio/ogg',
        fileName,
        size,
        duration: audioAttr?.duration || 0,
        waveform: waveformArr,
        url,
        downloadUrl,
      };
    }

    // Check if audio / music
    const isAudio = Boolean(audioAttr) || mime.startsWith('audio/');
    if (isAudio) {
      if (!fileName.includes('.')) fileName += '.mp3';
      return {
        type: 'MessageMediaDocument',
        hasDocument: true,
        isAudio: true,
        mimeType: mime || 'audio/mpeg',
        fileName,
        size,
        duration: audioAttr?.duration || 0,
        title: audioAttr?.title || undefined,
        performer: audioAttr?.performer || undefined,
        url,
        thumbUrl,
        downloadUrl,
      };
    }

    // Document types
    const lowerName = fileName.toLowerCase();
    const isPdf = mime.includes('pdf') || lowerName.endsWith('.pdf');
    const isText = mime.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.log') || lowerName.endsWith('.csv');
    const isCode =
      lowerName.endsWith('.js') ||
      lowerName.endsWith('.ts') ||
      lowerName.endsWith('.tsx') ||
      lowerName.endsWith('.jsx') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.py') ||
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.css') ||
      lowerName.endsWith('.sh') ||
      lowerName.endsWith('.sql') ||
      lowerName.endsWith('.cpp') ||
      lowerName.endsWith('.c') ||
      lowerName.endsWith('.java') ||
      lowerName.endsWith('.rs') ||
      lowerName.endsWith('.go') ||
      lowerName.endsWith('.md');

    return {
      type: 'MessageMediaDocument',
      hasDocument: true,
      isDocument: true,
      isPdf,
      isText,
      isCode,
      mimeType: mime || 'application/octet-stream',
      fileName,
      size,
      width: imageSizeAttr?.w,
      height: imageSizeAttr?.h,
      url,
      thumbUrl: (mime.startsWith('image/') || isPdf) ? thumbUrl : undefined,
      downloadUrl,
    };
  }

  return {
    type: m.media.className || 'MessageMedia',
    mimeType: 'application/octet-stream',
    fileName: `media_${msgId}`,
    size: 0,
    url,
    downloadUrl,
  };
}

/**
 * Handle HTTP Range request for streaming media or send full response with caching
 */
export async function streamMediaFile(
  filePath: string,
  meta: { mimeType: string; fileName: string; size: number },
  req: Request,
  res: Response,
  forceDownload = false
) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (forceDownload) {
    const encodedName = encodeURIComponent(meta.fileName || 'download');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
  } else {
    const safeDisplay = (meta.fileName || 'file').replace(/["\r\n]/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${safeDisplay}"`);
  }

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
      'Content-Type': meta.mimeType,
    });

    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}

export function getCachePath(chatId: string, messageId: number | string): string {
  const safeChat = String(chatId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(MEDIA_CACHE_DIR, `${safeChat}_${messageId}.dat`);
}

export function getMetaPath(chatId: string, messageId: number | string): string {
  const safeChat = String(chatId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(MEDIA_CACHE_DIR, `${safeChat}_${messageId}.meta.json`);
}

export function getThumbPath(chatId: string, messageId: number | string): string {
  const safeChat = String(chatId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(THUMB_CACHE_DIR, `thumb_${safeChat}_${messageId}.jpg`);
}
