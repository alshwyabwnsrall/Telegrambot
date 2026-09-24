import React, { useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import { BookmarkedMessage } from '../types/telegram.js';
import {
  Bookmark,
  Folder,
  Trash2,
  Copy,
  Forward,
  Download,
  Plus,
  Search,
  MessageSquare,
  Clock,
  Sparkles,
} from 'lucide-react';
import { safeString } from '../utils/safeRender.js';

export const BookmarksView: React.FC = () => {
  const {
    bookmarks,
    loadingBookmarks,
    removeBookmark,
    updateBookmarkCollection,
    copyToClipboard,
    setForwardModalOpen,
    setMessagesToForward,
    selectChat,
    setActiveTab,
    showNotification,
  } = useTelegram();

  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [customCollections, setCustomCollections] = useState<string[]>([
    'المفضلة',
    'التداول',
    'الذهب',
    'البرمجة',
    'أفكار',
    'هام',
    'روابط',
  ]);

  const allCollections = Array.from(
    new Set([...customCollections, ...bookmarks.map((b) => b.collection)])
  );

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesCollection =
      selectedCollection === 'all' || b.collection.toLowerCase() === selectedCollection.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      b.text.toLowerCase().includes(search.toLowerCase()) ||
      b.chatTitle.toLowerCase().includes(search.toLowerCase()) ||
      b.senderName.toLowerCase().includes(search.toLowerCase());
    return matchesCollection && matchesSearch;
  });

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return;
    const name = newCollectionName.trim();
    if (!customCollections.includes(name)) {
      setCustomCollections((prev) => [...prev, name]);
      setSelectedCollection(name);
      setNewCollectionName('');
      showNotification('success', `تم إنشاء تصنيف جديد باسم "${name}"`);
    }
  };

  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    if (filteredBookmarks.length === 0) return;
    let blob: Blob;
    const filename = `bookmarks_${selectedCollection}_${Date.now()}.${format}`;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(filteredBookmarks, null, 2)], { type: 'application/json' });
    } else if (format === 'csv') {
      const headers = ['Chat', 'Sender', 'Date', 'Collection', 'Text'];
      const rows = filteredBookmarks.map((b) => [
        `"${b.chatTitle.replace(/"/g, '""')}"`,
        `"${b.senderName.replace(/"/g, '""')}"`,
        `"${new Date(b.date * 1000).toISOString()}"`,
        `"${b.collection.replace(/"/g, '""')}"`,
        `"${b.text.replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } else {
      const text = filteredBookmarks
        .map(
          (b) =>
            `----------------------------------------\nChat: ${b.chatTitle}\nSender: ${b.senderName} (${new Date(
              b.date * 1000
            ).toLocaleString()})\nCollection: ${b.collection}\n\n${b.text}\n`
        )
        .join('\n');
      blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', `تم تصدير ${filteredBookmarks.length} رسالة محفوظة بنجاح!`);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-100" dir="rtl">
      {/* Collections Sidebar */}
      <div className="w-64 border-l border-slate-800 bg-[#0b141a]/95 flex flex-col p-4 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">تصنيفات الحفظ</h2>
          </div>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-mono">
            {bookmarks.length}
          </span>
        </div>

        {/* Add new collection */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
            placeholder="مجلد تصنيف جديد..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none text-right"
          />
          <button
            onClick={handleAddCollection}
            title="إضافة تصنيف"
            className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Collections List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          <button
            onClick={() => setSelectedCollection('all')}
            className={`w-full text-right px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
              selectedCollection === 'all'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              <span>جميع الرسائل المحفوظة</span>
            </div>
            <span className="text-[10px] opacity-75">{bookmarks.length}</span>
          </button>

          {allCollections.map((col) => {
            const count = bookmarks.filter((b) => b.collection.toLowerCase() === col.toLowerCase()).length;
            const isSelected = selectedCollection.toLowerCase() === col.toLowerCase();
            return (
              <button
                key={col}
                onClick={() => setSelectedCollection(col)}
                className={`w-full text-right px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="w-3.5 h-3.5" />
                  <span className="truncate">{col}</span>
                </div>
                <span className="text-[10px] opacity-75">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white capitalize">
              {selectedCollection === 'all' ? 'جميع الرسائل المحفوظة' : selectedCollection}
            </h1>
            <span className="text-xs text-slate-400">
              ({filteredBookmarks.length} رسالة)
            </span>
          </div>

          {/* Search & Export */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في المحفوظات..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none text-right"
              />
            </div>

            <div className="flex gap-1 bg-slate-900 border border-slate-700 p-1 rounded-xl text-xs" dir="ltr">
              <button
                onClick={() => handleExport('txt')}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تصدير كنص TXT"
              >
                TXT
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تصدير كجدول CSV"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تصدير كبيانات JSON"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Bookmarked Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredBookmarks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">لا توجد رسائل محفوظة في هذا التصنيف</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  يمكنك حفظ أي رسالة من تيليجرام بالنقر على زر الحفظ بجوارها أو إضافتها إلى أي تصنيف تريده.
                </p>
              </div>
            </div>
          ) : (
            filteredBookmarks.map((bm) => (
              <div
                key={bm.id}
                className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3 group"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sky-400">{safeString(bm.senderName)}</span>
                    <span className="text-slate-500">في</span>
                    <button
                      onClick={() => {
                        selectChat(bm.chatId);
                        setActiveTab('chats');
                      }}
                      className="font-medium text-slate-300 hover:text-white underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{safeString(bm.chatTitle)}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]" dir="ltr">
                      <Clock className="w-3 h-3" />
                      {new Date(bm.date * 1000).toLocaleString()}
                    </span>

                    {/* Collection Tag Dropdown */}
                    <select
                      value={bm.collection}
                      onChange={(e) => updateBookmarkCollection(bm.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[10px] text-amber-400 font-semibold outline-none cursor-pointer"
                    >
                      {allCollections.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Message Body */}
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 text-right">
                  {bm.text}
                </div>

                {/* Quick Actions Footer */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    معرف الرسالة: #{bm.messageId} • تم الحفظ في {new Date(bm.savedAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        copyToClipboard(bm.text, bm.chatTitle);
                        showNotification('success', 'تم نسخ النص إلى الحافظة');
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="نسخ النص"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setMessagesToForward([bm.messageId]);
                        setForwardModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="تحويل الرسالة"
                    >
                      <Forward className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeBookmark(bm.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title="حذف من المحفوظات"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
