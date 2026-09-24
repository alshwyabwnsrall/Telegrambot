import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Film,
  Music,
  ExternalLink,
  RefreshCw,
  Search,
  Maximize2,
  File,
} from 'lucide-react';
import { TelegramMessage } from '../types/telegram.js';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: TelegramMessage | null;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [textFilter, setTextFilter] = useState('');

  const media = message?.media;
  const fileName = media?.fileName || `file_${message?.id}`;
  const mimeType = media?.mimeType || '';
  const mediaUrl = message ? `/api/telegram/media/${message.chatId}/${message.id}` : '';
  const downloadUrl = message ? `/api/telegram/download/${message.chatId}/${message.id}` : '';

  const isPdf = media?.isPdf || mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isTextOrCode =
    media?.isText ||
    media?.isCode ||
    mimeType.startsWith('text/') ||
    fileName.match(/\.(txt|json|js|ts|tsx|jsx|py|html|css|sh|sql|cpp|c|md|xml|log|csv|env|yml|yaml)$/i);
  const isVideo = media?.isVideo || mimeType.startsWith('video/');

  useEffect(() => {
    if (isOpen && message && isTextOrCode && !isPdf && !isVideo) {
      setLoadingText(true);
      setTextError(null);
      fetch(mediaUrl)
        .then((res) => {
          if (!res.ok) throw new Error('فشل جلب محتوى الملف النصي');
          return res.text();
        })
        .then((txt) => {
          setTextContent(txt);
          setLoadingText(false);
        })
        .catch((err) => {
          setTextError(err.message || 'خطأ أثناء قراءة الملف');
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
      setTextError(null);
    }
  }, [isOpen, message, isTextOrCode, isPdf, isVideo, mediaUrl]);

  if (!isOpen || !message || !media) return null;

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredLines = textContent
    ? textContent.split('\n').filter((line) => line.toLowerCase().includes(textFilter.toLowerCase()))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              {isPdf ? (
                <FileText className="w-5 h-5 text-rose-400" />
              ) : isTextOrCode ? (
                <FileCode className="w-5 h-5 text-emerald-400" />
              ) : isVideo ? (
                <Film className="w-5 h-5 text-purple-400" />
              ) : (
                <File className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{fileName}</h3>
              <p className="text-[11px] text-slate-400">
                {media.size ? `${(media.size / 1024).toFixed(1)} KB` : 'ملف تليجرام'} • {mimeType || 'مستند'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isTextOrCode && textContent && (
              <button
                onClick={handleCopyText}
                title="نسخ محتوى الملف"
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">نسخ النص</span>
              </button>
            )}

            <a
              href={downloadUrl}
              download={fileName}
              title="تنزيل الملف الأصلي إلى جهازك"
              className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-sky-400/20"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف</span>
            </a>

            <button
              onClick={onClose}
              title="إغلاق (Esc)"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 overflow-hidden bg-slate-950 relative flex flex-col">
          {/* 1. PDF Viewer */}
          {isPdf && (
            <div className="w-full h-full">
              <iframe
                src={`${mediaUrl}#toolbar=1`}
                title={fileName}
                className="w-full h-full border-0 bg-slate-900"
              />
            </div>
          )}

          {/* 2. Video Player Modal */}
          {isVideo && (
            <div className="w-full h-full flex items-center justify-center p-4 bg-black">
              <video
                src={mediaUrl}
                controls
                autoPlay
                preload="metadata"
                className="max-h-full max-w-full rounded-2xl shadow-2xl"
              />
            </div>
          )}

          {/* 3. Text / Code Viewer */}
          {isTextOrCode && !isPdf && !isVideo && (
            <div className="w-full h-full flex flex-col">
              {/* Search Inside Code */}
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث داخل محتوى الملف..."
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none flex-1 text-right"
                />
                {textFilter && (
                  <button
                    onClick={() => setTextFilter('')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Text content area */}
              <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200 select-text leading-relaxed" dir="ltr">
                {loadingText ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-sky-400">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                    <span className="text-xs text-slate-400">جاري قراءة محتوى الملف...</span>
                  </div>
                ) : textError ? (
                  <div className="h-full flex flex-col items-center justify-center text-rose-400 gap-2 text-center p-4">
                    <span>{textError}</span>
                    <a
                      href={downloadUrl}
                      download={fileName}
                      className="text-xs text-sky-400 underline"
                    >
                      تنزيل الملف مباشرة
                    </a>
                  </div>
                ) : textContent ? (
                  <pre className="whitespace-pre-wrap break-words">
                    {textFilter
                      ? filteredLines.join('\n')
                      : textContent}
                  </pre>
                ) : (
                  <div className="text-slate-500 text-center py-10">الملف فارغ</div>
                )}
              </div>
            </div>
          )}

          {/* 4. Unsupported Office / Binary File fallback */}
          {!isPdf && !isVideo && !isTextOrCode && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-300">
              <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 mb-5 shadow-2xl">
                <File className="w-10 h-10" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">{fileName}</h4>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                هذا النوع من الملفات ({mimeType || 'مستند'}) غير متاح للمعاينة المباشرة داخل المتصفح. يمكنك تنزيل الملف الأصلي وتشغيله في التطبيق المخصص على جهازك.
              </p>
              <a
                href={downloadUrl}
                download={fileName}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-2xl flex items-center gap-2 shadow-xl shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>تنزيل الملف الآن</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
