import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Film,
  Music,
  Mic,
  Maximize2,
  ExternalLink,
  Eye,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import { TelegramMessage, TelegramMediaInfo } from '../types/telegram.js';
import { useMediaPlayer } from '../context/MediaPlayerContext.js';

interface InlineMediaRendererProps {
  message: TelegramMessage;
  onOpenLightbox: (msg: TelegramMessage) => void;
  onOpenFileViewer: (msg: TelegramMessage) => void;
  isOut?: boolean;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const InlineMediaRenderer: React.FC<InlineMediaRendererProps> = ({
  message,
  onOpenLightbox,
  onOpenFileViewer,
  isOut = false,
}) => {
  const { currentTrack, isPlaying, togglePlayTrack } = useMediaPlayer();
  const [videoStarted, setVideoStarted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load media content using IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '250px' } // Preload when 250px near the viewport
      );
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setIsVisible(true);
    }
  }, []);

  const media = message.media;
  if (!media) return null;

  const mediaUrl = `/api/telegram/media/${message.chatId}/${message.id}`;
  const thumbUrl = `/api/telegram/thumb/${message.chatId}/${message.id}`;
  const downloadUrl = `/api/telegram/download/${message.chatId}/${message.id}`;

  const isTrackActive = currentTrack?.url === mediaUrl;
  const isThisPlaying = isTrackActive && isPlaying;

  // Render minimal placeholder until within/near viewport
  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className="w-full h-28 bg-slate-900/40 rounded-2xl border border-slate-800/60 flex items-center justify-center text-slate-500 gap-2 my-1"
      >
        <ImageIcon className="w-5 h-5 animate-pulse text-slate-600" />
        <span className="text-[11px]">وسائط تيليجرام</span>
      </div>
    );
  }

  // 1. Photo Renderer
  if (media.hasPhoto || media.isPhoto || media.type === 'MessageMediaPhoto') {
    return (
      <div
        ref={containerRef}
        className="relative group rounded-2xl overflow-hidden max-h-[360px] sm:max-h-[420px] bg-black/40 my-1 cursor-pointer w-full"
      >
        <img
          src={thumbUrl}
          alt={media.fileName || 'صورة تيليجرام'}
          onClick={() => onOpenLightbox(message)}
          className="w-full h-auto max-h-[360px] sm:max-h-[420px] object-cover rounded-2xl group-hover:scale-[1.01] transition-transform duration-200"
          loading="lazy"
          decoding="async"
        />

        {/* Action Overlay / Floating Buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLightbox(message);
            }}
            title="تكبير ومعاينة الصورة"
            className="p-2.5 bg-slate-900/90 hover:bg-sky-500 text-white rounded-xl pointer-events-auto shadow-xl transition-all cursor-pointer backdrop-blur-md flex items-center gap-1.5 text-xs font-medium"
          >
            <Maximize2 className="w-4 h-4" />
            <span>عرض</span>
          </button>
          <a
            href={downloadUrl}
            download={media.fileName || `photo_${message.id}.jpg`}
            onClick={(e) => e.stopPropagation()}
            title="تنزيل الصورة"
            className="p-2.5 bg-slate-900/90 hover:bg-sky-500 text-white rounded-xl pointer-events-auto shadow-xl transition-all cursor-pointer backdrop-blur-md flex items-center gap-1.5 text-xs font-medium"
          >
            <Download className="w-4 h-4" />
            <span>تحميل</span>
          </a>
        </div>
      </div>
    );
  }

  // 2. Video Renderer (Progressive Range Streaming with Enlarged Box & Download Controls)
  if (media.isVideo || (media.mimeType && media.mimeType.startsWith('video/'))) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-black/90 my-2 border border-slate-700/60 w-full max-w-[340px] sm:max-w-md shadow-lg shadow-black/40">
        {videoStarted ? (
          <div className="relative w-full">
            <video
              src={mediaUrl}
              controls
              autoPlay
              preload="metadata"
              className="w-full max-h-[320px] sm:max-h-[380px] object-contain rounded-2xl bg-black"
            />
            {/* Quick Action Top Bar while playing */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <a
                href={downloadUrl}
                download={media.fileName || `video_${message.id}.mp4`}
                title="تحميل الفيديو"
                className="p-2 bg-slate-900/90 hover:bg-sky-500 text-white rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل</span>
              </a>
              <button
                onClick={() => onOpenFileViewer(message)}
                title="فتح في المشغل الكامل"
                className="p-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setVideoStarted(true)}
            className="relative w-full h-56 sm:h-64 bg-slate-950 flex items-center justify-center cursor-pointer group"
          >
            <img
              src={thumbUrl}
              alt="Video Preview"
              className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Dark gradient shadow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

            {/* Large Play Button Overlay */}
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-sky-500/95 group-hover:bg-sky-400 group-hover:scale-110 text-slate-950 flex items-center justify-center shadow-2xl transition-all ring-4 ring-sky-500/30">
              <Play className="w-7 h-7 fill-slate-950 translate-x-0.5" />
            </div>

            {/* Video Meta Pill (Duration & Size) */}
            <div className="absolute bottom-3 right-3 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-white font-mono flex items-center gap-2 border border-white/10" dir="ltr">
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">{formatDuration(media.duration)}</span>
              {media.size && <span className="text-slate-300">• {formatFileSize(media.size)}</span>}
            </div>

            {/* Prominent Direct Download & Fullscreen Controls */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <a
                href={downloadUrl}
                download={media.fileName || `video_${message.id}.mp4`}
                onClick={(e) => e.stopPropagation()}
                title="تحميل الفيديو مباشرة"
                className="p-2.5 bg-slate-900/90 hover:bg-sky-500 text-white rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-slate-700/60 active:scale-95"
              >
                <Download className="w-4 h-4 text-sky-400 group-hover:text-white" />
                <span>تحميل</span>
              </a>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFileViewer(message);
                }}
                title="فتح في عارض الفيديو الكامل"
                className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer border border-slate-700/60 active:scale-95"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Voice Message Renderer
  if (media.isVoice) {
    const handleVoiceToggle = () => {
      togglePlayTrack({
        url: mediaUrl,
        downloadUrl,
        title: `رسالة صوتية (${formatDuration(media.duration)})`,
        subtitle: message.senderName || 'تيليجرام',
        duration: media.duration || 0,
        isPlaying: true,
        isVoice: true,
        chatId: message.chatId,
        messageId: message.id,
      });
    };

    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-2xl my-1 border transition-all ${
          isOut
            ? 'bg-sky-700/70 border-sky-500/80 text-white'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
        }`}
        dir="rtl"
      >
        <button
          onClick={handleVoiceToggle}
          title={isThisPlaying ? 'إيقاف مؤقت' : 'تشغيل الرسالة الصوتية'}
          className="w-10 h-10 rounded-2xl bg-sky-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-sky-400/20 hover:scale-105 transition-transform cursor-pointer"
        >
          {isThisPlaying ? (
            <Pause className="w-4 h-4 fill-slate-950" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950 -translate-x-0.5" />
          )}
        </button>

        {/* Waveform Visualization Bars */}
        <div className="flex-1 flex items-center gap-0.5 h-6">
          {(media.waveform && media.waveform.length > 0
            ? media.waveform.slice(0, 32)
            : Array.from({ length: 28 }, (_, i) => (i % 3 === 0 ? 20 : i % 2 === 0 ? 14 : 8))
          ).map((val, idx) => {
            const heightPx = Math.max(4, Math.min(22, (val / 32) * 22));
            return (
              <div
                key={idx}
                style={{ height: `${heightPx}px` }}
                className={`w-1 rounded-full transition-all ${
                  isThisPlaying
                    ? 'bg-sky-300 animate-pulse'
                    : isOut
                    ? 'bg-sky-200/60'
                    : 'bg-slate-500/60'
                }`}
              />
            );
          })}
        </div>

        {/* Duration */}
        <div className="text-[11px] font-mono shrink-0 opacity-90" dir="ltr">
          {formatDuration(media.duration)}
        </div>

        {/* Download Button */}
        <a
          href={downloadUrl}
          download={media.fileName || `voice_${message.id}.ogg`}
          title="تنزيل الرسالة الصوتية"
          className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // 4. Audio / Music Renderer
  if (media.isAudio || (media.mimeType && media.mimeType.startsWith('audio/'))) {
    const handleAudioToggle = () => {
      togglePlayTrack({
        url: mediaUrl,
        downloadUrl,
        title: media.title || media.fileName || 'ملف صوتي',
        subtitle: media.performer || message.senderName || 'تيليجرام',
        duration: media.duration || 0,
        isPlaying: true,
        isVoice: false,
        chatId: message.chatId,
        messageId: message.id,
      });
    };

    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-2xl my-1 border transition-all ${
          isOut
            ? 'bg-sky-700/70 border-sky-500/80 text-white'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
        }`}
        dir="rtl"
      >
        <button
          onClick={handleAudioToggle}
          title={isThisPlaying ? 'إيقاف مؤقت' : 'تشغيل المقطع'}
          className="w-10 h-10 rounded-2xl bg-sky-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-sky-400/20 hover:scale-105 transition-transform cursor-pointer"
        >
          {isThisPlaying ? (
            <Pause className="w-4 h-4 fill-slate-950" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950 -translate-x-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate">
            {media.title || media.fileName || 'مقطع صوتي'}
          </div>
          <div className="text-[10px] opacity-80 truncate flex items-center gap-1.5">
            {media.performer && <span>{media.performer} •</span>}
            <span dir="ltr">{formatDuration(media.duration)}</span>
            {media.size && <span>• {formatFileSize(media.size)}</span>}
          </div>
        </div>

        <a
          href={downloadUrl}
          download={media.fileName || `audio_${message.id}.mp3`}
          title="تنزيل الملف الصوتي الأصلي"
          className="p-2 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // 5. Document / PDF / Code / Archive Renderer
  const isPdf = media.isPdf || (media.mimeType && media.mimeType.includes('pdf'));
  const isCode = media.isCode;
  const isText = media.isText;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl my-1 border transition-all ${
        isOut
          ? 'bg-sky-700/60 border-sky-500/70 text-white'
          : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
      }`}
      dir="rtl"
    >
      <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
        {isPdf ? (
          <FileText className="w-5 h-5 text-rose-400" />
        ) : isCode ? (
          <FileCode className="w-5 h-5 text-emerald-400" />
        ) : isText ? (
          <FileText className="w-5 h-5 text-sky-300" />
        ) : (
          <File className="w-5 h-5 text-sky-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold truncate">
          {media.fileName || 'مستند تيليجرام'}
        </div>
        <div className="text-[10px] opacity-80">
          {formatFileSize(media.size)} {media.mimeType ? `• ${media.mimeType}` : ''}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Preview Button */}
        <button
          onClick={() => onOpenFileViewer(message)}
          title="معاينة الملف داخل الموقع"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Download Button */}
        <a
          href={downloadUrl}
          download={media.fileName || 'file'}
          title="تنزيل الملف الأصلي"
          className="p-2 text-sky-400 hover:text-sky-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
