import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { TelegramMessage } from '../types/telegram.js';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMessage: TelegramMessage | null;
  allMessages: TelegramMessage[];
  chatTitle?: string;
  onSelectMessage?: (msg: TelegramMessage) => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  currentMessage,
  allMessages,
  chatTitle,
  onSelectMessage,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract all photo messages in order
  const photoMessages = allMessages.filter(
    (m) => m.media && (m.media.hasPhoto || m.media.isPhoto || m.media.type === 'MessageMediaPhoto')
  );

  useEffect(() => {
    if (currentMessage) {
      const idx = photoMessages.findIndex((m) => m.id === currentMessage.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
    setZoom(1);
    setRotation(0);
    setLoading(true);
  }, [currentMessage]);

  const activeMsg = photoMessages[currentIndex] || currentMessage;

  const handleNext = useCallback(() => {
    if (photoMessages.length > 1) {
      const nextIdx = (currentIndex + 1) % photoMessages.length;
      setCurrentIndex(nextIdx);
      setZoom(1);
      setRotation(0);
      setLoading(true);
      if (onSelectMessage && photoMessages[nextIdx]) {
        onSelectMessage(photoMessages[nextIdx]);
      }
    }
  }, [currentIndex, photoMessages, onSelectMessage]);

  const handlePrev = useCallback(() => {
    if (photoMessages.length > 1) {
      const prevIdx = (currentIndex - 1 + photoMessages.length) % photoMessages.length;
      setCurrentIndex(prevIdx);
      setZoom(1);
      setRotation(0);
      setLoading(true);
      if (onSelectMessage && photoMessages[prevIdx]) {
        onSelectMessage(photoMessages[prevIdx]);
      }
    }
  }, [currentIndex, photoMessages, onSelectMessage]);

  const handleZoomIn = () => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleCopyImage = async () => {
    if (!activeMsg) return;
    const mediaUrl = `/api/telegram/media/${activeMsg.chatId}/${activeMsg.id}`;
    try {
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        await navigator.clipboard.writeText(window.location.origin + mediaUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Copy image error:', err);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
      else if (e.key === '0') handleResetZoom();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !activeMsg) return null;

  const mediaUrl = `/api/telegram/media/${activeMsg.chatId}/${activeMsg.id}`;
  const downloadUrl = `/api/telegram/download/${activeMsg.chatId}/${activeMsg.id}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none animate-fade-in"
      dir="rtl"
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between text-white py-2 px-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">
              {chatTitle ? `صورة من: ${chatTitle}` : 'عارض الصور'}
            </div>
            <div className="text-[11px] text-slate-400">
              {photoMessages.length > 0 ? `الصورة ${currentIndex + 1} من ${photoMessages.length}` : 'معاينة كاملة'}
              {activeMsg.date && ` • ${new Date(activeMsg.date).toLocaleDateString()}`}
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            title="تصغير (-)"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom indicator & Reset */}
          <button
            onClick={handleResetZoom}
            title="إعادة ضبط الحجم (0)"
            className="px-2.5 py-1 text-xs font-mono font-bold text-sky-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            title="تكبير (+)"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Rotate */}
          <button
            onClick={handleRotate}
            title="تدوير الصورة"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Copy Image */}
          <button
            onClick={handleCopyImage}
            title="نسخ الصورة للحافظة"
            className="p-2 text-slate-300 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title="ملء الشاشة"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download Original */}
          <a
            href={downloadUrl}
            download={`photo_${activeMsg.id}.jpg`}
            title="تنزيل الصورة الأصلية من تيليجرام"
            className="p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            title="إغلاق (Esc)"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden my-3">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sky-400 z-10">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs text-slate-300">جاري جلب الصورة الأصلية من خوادم تيليجرام...</span>
          </div>
        )}

        <img
          src={mediaUrl}
          alt="Telegram Photo High Resolution"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out',
          }}
          className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl cursor-grab active:cursor-grabbing"
        />

        {/* Navigation Arrows */}
        {photoMessages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              title="الصورة السابقة (السهم الأيمن)"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white border border-slate-700 shadow-xl transition-all cursor-pointer z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              title="الصورة التالية (السهم الأيسر)"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white border border-slate-700 shadow-xl transition-all cursor-pointer z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Footer Caption & Thumbnail Strip */}
      <div className="w-full max-w-4xl text-center z-20">
        {activeMsg.text && (
          <div className="inline-block bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl text-xs text-slate-200 mb-2 max-w-xl mx-auto truncate">
            {activeMsg.text}
          </div>
        )}

        {photoMessages.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-full">
            {photoMessages.slice(0, 12).map((m, idx) => (
              <button
                key={m.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoom(1);
                  setLoading(true);
                }}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  currentIndex === idx ? 'border-sky-400 scale-105 shadow-lg shadow-sky-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={`/api/telegram/thumb/${m.chatId}/${m.id}`}
                  alt="Thumb"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
