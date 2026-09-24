import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Film,
  Mic,
  Music,
  FileText,
  Link as LinkIcon,
  Search,
  Download,
  Eye,
  Play,
  Pause,
  ExternalLink,
  RefreshCw,
  CheckSquare,
  Square,
  Check,
  Archive,
  Layers,
  StopCircle,
  FileArchive,
  ArrowDownToLine,
} from 'lucide-react';
import JSZip from 'jszip';
import { ChatMediaItem, TelegramMessage, BulkDownloadProgress } from '../types/telegram.js';
import { useMediaPlayer } from '../context/MediaPlayerContext.js';

interface ChatMediaGalleryProps {
  chatId: string;
  chatTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (msg: TelegramMessage) => void;
  onSelectFile: (msg: TelegramMessage) => void;
  onJumpToMessage?: (messageId: number) => void;
}

type GalleryTab = 'all' | 'photo' | 'video' | 'voice' | 'audio' | 'document' | 'link';

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

export const ChatMediaGallery: React.FC<ChatMediaGalleryProps> = ({
  chatId,
  chatTitle,
  isOpen,
  onClose,
  onSelectPhoto,
  onSelectFile,
}) => {
  const [activeTab, setActiveTab] = useState<GalleryTab>('photo');
  const [items, setItems] = useState<ChatMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Multi-select & Bulk download state
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [bulkProgress, setBulkProgress] = useState<BulkDownloadProgress | null>(null);
  const cancelBulkRef = useRef<boolean>(false);

  const { currentTrack, isPlaying, togglePlayTrack } = useMediaPlayer();

  const fetchGalleryItems = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    try {
      const typeParam = activeTab === 'all' ? '' : `&type=${activeTab}`;
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/telegram/media-gallery/${chatId}?limit=120${typeParam}${searchParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      setError(err.message || 'فشل جلب وسائط المحادثة');
    } finally {
      setLoading(false);
    }
  }, [chatId, activeTab, searchQuery]);

  useEffect(() => {
    if (isOpen && chatId) {
      fetchGalleryItems();
      setSelectedItemIds([]);
    }
  }, [isOpen, chatId, activeTab, fetchGalleryItems]);

  const toggleSelectItem = useCallback((id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((i) => i.id));
    }
  }, [items, selectedItemIds.length]);

  const getMediaFileName = (item: ChatMediaItem): string => {
    if (item.media?.fileName) return item.media.fileName;
    if (item.type === 'photo') return `photo_${item.messageId}.jpg`;
    if (item.type === 'video') return `video_${item.messageId}.mp4`;
    if (item.type === 'voice') return `voice_${item.messageId}.ogg`;
    if (item.type === 'audio') return `audio_${item.messageId}.mp3`;
    return `file_${item.messageId}.bin`;
  };

  // Bulk Download as ZIP Archive
  const handleBulkDownloadZip = async () => {
    const targetItems = items.filter((i) => selectedItemIds.includes(i.id));
    if (targetItems.length === 0) return;

    cancelBulkRef.current = false;
    setBulkProgress({
      isDownloading: true,
      total: targetItems.length,
      current: 0,
      percent: 0,
      statusText: 'بدء تجهيز الملفات...',
    });

    try {
      const zip = new JSZip();
      const usedFileNames = new Set<string>();

      for (let i = 0; i < targetItems.length; i++) {
        if (cancelBulkRef.current) break;

        const item = targetItems[i];
        let fileName = getMediaFileName(item);

        // Deduplicate file names inside the zip archive
        if (usedFileNames.has(fileName)) {
          const parts = fileName.split('.');
          const ext = parts.length > 1 ? `.${parts.pop()}` : '';
          const name = parts.join('.');
          fileName = `${name}_${item.messageId}${ext}`;
        }
        usedFileNames.add(fileName);

        setBulkProgress({
          isDownloading: true,
          total: targetItems.length,
          current: i + 1,
          percent: Math.round(((i + 1) / targetItems.length) * 100),
          currentFileName: fileName,
          statusText: `تحميل: ${fileName} (${i + 1}/${targetItems.length})`,
        });

        try {
          const res = await fetch(`/api/telegram/download/${item.chatId}/${item.messageId}`);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(fileName, blob);
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch media for item ${item.id}`, fetchErr);
        }
      }

      if (!cancelBulkRef.current) {
        setBulkProgress((prev) =>
          prev ? { ...prev, statusText: 'جارٍ ضغط الأرشيف وإنشاء ملف ZIP...' } : null
        );

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        const cleanChatName = chatTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'telegram';
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${cleanChatName}_media_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (err: any) {
      console.error('Bulk zip error:', err);
    } finally {
      setBulkProgress(null);
    }
  };

  // Bulk Consecutive Download (Direct to browser)
  const handleBulkDownloadDirect = async () => {
    const targetItems = items.filter((i) => selectedItemIds.includes(i.id));
    if (targetItems.length === 0) return;

    cancelBulkRef.current = false;
    setBulkProgress({
      isDownloading: true,
      total: targetItems.length,
      current: 0,
      percent: 0,
      statusText: 'بدء التنزيل المباشر...',
    });

    for (let i = 0; i < targetItems.length; i++) {
      if (cancelBulkRef.current) break;
      const item = targetItems[i];
      const fileName = getMediaFileName(item);

      setBulkProgress({
        isDownloading: true,
        total: targetItems.length,
        current: i + 1,
        percent: Math.round(((i + 1) / targetItems.length) * 100),
        currentFileName: fileName,
        statusText: `تنزيل: ${fileName}`,
      });

      const a = document.createElement('a');
      a.href = `/api/telegram/download/${item.chatId}/${item.messageId}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Short delay between triggers to prevent browser throttle
      await new Promise((r) => setTimeout(r, 300));
    }

    setBulkProgress(null);
  };

  if (!isOpen) return null;

  const toTelegramMessage = (item: ChatMediaItem): TelegramMessage => ({
    id: item.messageId,
    chatId: item.chatId,
    text: item.text || '',
    date: item.date,
    out: false,
    senderName: item.senderName,
    media: item.media,
  });

  return (
    <div
      className="fixed inset-y-0 left-0 w-full sm:w-[460px] md:w-[500px] bg-slate-900/98 backdrop-blur-2xl border-r border-slate-800 shadow-2xl z-40 flex flex-col animate-slide-left select-none text-white"
      dir="rtl"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">معرض الوسائط والتحميل الجماعي</h3>
            <p className="text-[11px] text-slate-400 truncate">{chatTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Multi-Select Mode Toggle */}
          <button
            onClick={() => {
              setIsMultiSelect((prev) => !prev);
              setSelectedItemIds([]);
            }}
            title="تبديل وضع التحديد المتعدد"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isMultiSelect
                ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>تحديد متعدد</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800/80 overflow-x-auto text-xs scrollbar-none shrink-0">
        <button
          onClick={() => setActiveTab('photo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === 'photo' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>الصور</span>
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === 'video' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>الفيديو</span>
        </button>

        <button
          onClick={() => setActiveTab('voice')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === 'voice' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>الصوتيات</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === 'audio' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>الموسيقى</span>
        </button>

        <button
          onClick={() => setActiveTab('document')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === 'document' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>الملفات</span>
        </button>

        <button
          onClick={() => setActiveTab('link')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === 'link' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>الروابط</span>
        </button>
      </div>

      {/* Search & Multi-Select Toolbar */}
      <div className="p-3 border-b border-slate-800/80 space-y-2.5 shrink-0 bg-slate-900/60">
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-2xl border border-slate-700/60 focus-within:border-sky-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="بحث في وسائط هذه المحادثة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGalleryItems()}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none text-right"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTimeout(fetchGalleryItems, 50);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              مسح
            </button>
          )}
        </div>

        {/* Multi-Selection Control Bar */}
        {isMultiSelect && (
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-800/90 rounded-2xl border border-sky-500/30 animate-fade-in">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 font-semibold cursor-pointer text-[11px]"
              >
                {selectedItemIds.length === items.length && items.length > 0
                  ? 'إلغاء تحديد الكل'
                  : `تحديد الكل (${items.length})`}
              </button>
              <span className="text-[11px] text-sky-400 font-mono">
                {selectedItemIds.length} محددة
              </span>
            </div>

            {selectedItemIds.length > 0 && (
              <div className="flex items-center gap-1.5">
                {/* Download as ZIP */}
                <button
                  onClick={handleBulkDownloadZip}
                  title="تحميل كافة الوسائط المحددة في أرشيف ZIP مضغوط"
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>تحميل ZIP</span>
                </button>

                {/* Direct Download */}
                <button
                  onClick={handleBulkDownloadDirect}
                  title="تنزيل متتابع مباشر للملفات"
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Real-time Bulk Download Progress Banner */}
        {bulkProgress && (
          <div className="p-3 bg-sky-950/60 border border-sky-500/40 rounded-2xl space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-300 truncate max-w-[280px]">
                {bulkProgress.statusText}
              </span>
              <span className="font-mono text-sky-400">{bulkProgress.percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-200"
                style={{ width: `${bulkProgress.percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 font-mono">
                {bulkProgress.current} من {bulkProgress.total} ملفات
              </span>
              <button
                onClick={() => {
                  cancelBulkRef.current = true;
                  setBulkProgress(null);
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>إلغاء التحميل</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-sky-400">
            <RefreshCw className="w-7 h-7 animate-spin" />
            <span className="text-xs text-slate-400">جاري جلب الوسائط الحقيقية من تيليجرام...</span>
          </div>
        ) : error ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-rose-400 mb-3">{error}</p>
            <button
              onClick={fetchGalleryItems}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
            <p className="text-xs">لا توجد وسائط مطابقة في هذه المحادثة</p>
          </div>
        ) : (
          <>
            {/* 1. Photos Grid */}
            {activeTab === 'photo' && (
              <div className="grid grid-cols-3 gap-2">
                {items.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isMultiSelect) {
                          toggleSelectItem(item.id);
                        } else {
                          onSelectPhoto(toTelegramMessage(item));
                        }
                      }}
                      className={`relative group aspect-square rounded-2xl overflow-hidden bg-slate-950 border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-500 ring-2 ring-sky-500/50 scale-[0.98]'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={`/api/telegram/thumb/${item.chatId}/${item.messageId}`}
                        alt="Thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />

                      {/* Multi-select Checkbox Overlay */}
                      {isMultiSelect ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className="absolute top-2 right-2 z-10"
                        >
                          <div
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shadow-lg transition-all ${
                              isSelected
                                ? 'bg-sky-500 border-sky-400 text-white'
                                : 'bg-slate-950/70 border-white/50 text-transparent hover:border-white'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Videos Grid */}
            {activeTab === 'video' && (
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isMultiSelect) {
                          toggleSelectItem(item.id);
                        } else {
                          onSelectFile(toTelegramMessage(item));
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden bg-slate-950 border aspect-video cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-500 ring-2 ring-sky-500/50'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={`/api/telegram/thumb/${item.chatId}/${item.messageId}`}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-75"
                        loading="lazy"
                      />

                      {/* Multi-Select Checkbox */}
                      {isMultiSelect ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className="absolute top-2 right-2 z-10"
                        >
                          <div
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shadow-lg transition-all ${
                              isSelected
                                ? 'bg-sky-500 border-sky-400 text-white'
                                : 'bg-slate-950/70 border-white/50 text-transparent hover:border-white'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
                          </div>
                        </div>
                      )}

                      {item.media?.duration && (
                        <div
                          className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-mono text-white"
                          dir="ltr"
                        >
                          {formatDuration(item.media.duration)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Voice Messages List */}
            {activeTab === 'voice' && (
              <div className="space-y-2">
                {items.map((item) => {
                  const mediaUrl = `/api/telegram/media/${item.chatId}/${item.messageId}`;
                  const isTrackActive = currentTrack?.url === mediaUrl;
                  const isThisPlaying = isTrackActive && isPlaying;
                  const isSelected = selectedItemIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => isMultiSelect && toggleSelectItem(item.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      {isMultiSelect && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 border-sky-400 text-white'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayTrack({
                            url: mediaUrl,
                            downloadUrl: `/api/telegram/download/${item.chatId}/${item.messageId}`,
                            title: `تسجيل صوتي (${formatDuration(item.media?.duration)})`,
                            subtitle: item.senderName || chatTitle,
                            duration: item.media?.duration || 0,
                            isPlaying: true,
                            isVoice: true,
                            chatId: item.chatId,
                            messageId: item.messageId,
                          });
                        }}
                        className="w-10 h-10 rounded-2xl bg-sky-500 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-sky-500/20"
                      >
                        {isThisPlaying ? (
                          <Pause className="w-4 h-4 fill-slate-950" />
                        ) : (
                          <Play className="w-4 h-4 fill-slate-950 -translate-x-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">
                          {item.senderName || 'رسالة صوتية'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span dir="ltr">{formatDuration(item.media?.duration)}</span>
                          <span>• {new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <a
                        href={`/api/telegram/download/${item.chatId}/${item.messageId}`}
                        download={`voice_${item.messageId}.ogg`}
                        title="تنزيل الرسالة الصوتية"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Music / Audio List */}
            {activeTab === 'audio' && (
              <div className="space-y-2">
                {items.map((item) => {
                  const mediaUrl = `/api/telegram/media/${item.chatId}/${item.messageId}`;
                  const isTrackActive = currentTrack?.url === mediaUrl;
                  const isThisPlaying = isTrackActive && isPlaying;
                  const isSelected = selectedItemIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => isMultiSelect && toggleSelectItem(item.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      {isMultiSelect && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 border-sky-400 text-white'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayTrack({
                            url: mediaUrl,
                            downloadUrl: `/api/telegram/download/${item.chatId}/${item.messageId}`,
                            title: item.media?.title || item.media?.fileName || 'ملف صوتي',
                            subtitle: item.media?.performer || item.senderName,
                            duration: item.media?.duration || 0,
                            isPlaying: true,
                            isVoice: false,
                            chatId: item.chatId,
                            messageId: item.messageId,
                          });
                        }}
                        className="w-10 h-10 rounded-2xl bg-sky-500 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-sky-500/20"
                      >
                        {isThisPlaying ? (
                          <Pause className="w-4 h-4 fill-slate-950" />
                        ) : (
                          <Play className="w-4 h-4 fill-slate-950 -translate-x-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">
                          {item.media?.title || item.media?.fileName || 'مقطع صوتي'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.media?.performer || item.senderName} • {formatFileSize(item.media?.size)}
                        </div>
                      </div>

                      <a
                        href={`/api/telegram/download/${item.chatId}/${item.messageId}`}
                        download={item.media?.fileName || `audio_${item.messageId}.mp3`}
                        title="تنزيل الملف الصوتي"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. Documents List */}
            {activeTab === 'document' && (
              <div className="space-y-2">
                {items.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => isMultiSelect && toggleSelectItem(item.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      {isMultiSelect && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 border-sky-400 text-white'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}

                      <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">
                          {item.media?.fileName || 'مستند'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatFileSize(item.media?.size)} • {new Date(item.date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFile(toTelegramMessage(item));
                          }}
                          title="معاينة الملف"
                          className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/telegram/download/${item.chatId}/${item.messageId}`}
                          download={item.media?.fileName || 'file'}
                          title="تنزيل الملف"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-sky-400 hover:text-sky-300 rounded-xl transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 6. Links List */}
            {activeTab === 'link' && (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="w-9 h-9 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-400 hover:underline truncate block"
                        dir="ltr"
                      >
                        {item.linkUrl}
                      </a>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.text || item.senderName}
                      </div>
                    </div>

                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
