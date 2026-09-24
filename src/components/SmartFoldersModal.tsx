import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Folder,
  Check,
  Search,
  RotateCcw,
  Layers,
  ChevronLeft,
  Megaphone,
  Users,
  User,
  Info,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext.js';
import { SmartFolder } from '../types/telegram.js';
import { areChatIdsEqual } from '../context/TelegramContext.js';

interface SmartFoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_EMOJIS = ['📁', '📊', '🤖', '📰', '💼', '🎓', '🎬', '🛍️', '🕋', '💬', '⭐', '🔥', '🚀', '📌', '🎯', '💡'];

export const SmartFoldersModal: React.FC<SmartFoldersModalProps> = ({ isOpen, onClose }) => {
  const {
    dialogs,
    folders,
    selectedFolderId,
    setSelectedFolderId,
    autoCategorizeWithAi,
    isCategorizingWithAi,
    createCustomFolder,
    deleteCustomFolder,
    toggleChatInFolder,
    resetFoldersToDefault,
  } = useTelegram();

  // Create new folder form state
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');

  // Edit folder chats state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const editingFolder = useMemo(() => {
    return folders.find((f) => f.id === editingFolderId);
  }, [folders, editingFolderId]);

  const filteredDialogsForEdit = useMemo(() => {
    if (!chatSearchQuery.trim()) return dialogs;
    const q = chatSearchQuery.toLowerCase();
    return dialogs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.username && d.username.toLowerCase().includes(q))
    );
  }, [dialogs, chatSearchQuery]);

  if (!isOpen) return null;

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;
    createCustomFolder(newFolderTitle.trim(), newFolderIcon);
    setNewFolderTitle('');
    setNewFolderIcon('📁');
    setIsCreating(false);
  };

  const getChatCountForFolder = (folder: SmartFolder): number => {
    if (folder.filterType === 'all') return dialogs.length;
    if (folder.filterType === 'channels') return dialogs.filter((d) => d.isChannel).length;
    if (folder.filterType === 'groups') return dialogs.filter((d) => d.isGroup).length;
    if (folder.filterType === 'users') return dialogs.filter((d) => d.isUser).length;
    if (folder.filterType === 'unread') return dialogs.filter((d) => d.unreadCount > 0).length;
    return dialogs.filter((d) => folder.chatIds?.some((id) => areChatIdsEqual(id, d.id))).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>المجلدات والتبويبات الذكية</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  مدعوم بالذكاء الاصطناعي
                </span>
              </h3>
              <p className="text-xs text-slate-400">فرز وتصنيف القنوات والمجموعات بدقة فائقة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Action Banner */}
        <div className="p-4 bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-purple-950/30 border-b border-slate-800/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">الفرز الذكي بالذكاء الاصطناعي (AI Sort)</h4>
                <p className="text-[11px] text-slate-300">
                  يقوم الذكاء الاصطناعي بتحليل جميع قنواتك الـ {dialogs.length} وفرزها تلقائياً حسب التخصص (تداول، تقنية، أخبار، إلخ).
                </p>
              </div>
            </div>
            <button
              onClick={() => autoCategorizeWithAi()}
              disabled={isCategorizingWithAi || dialogs.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95 shrink-0"
            >
              {isCategorizingWithAi ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ الفرز الذكي...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>بدء الفرز بالذكاء الاصطناعي</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Sub-view: Edit chat members of a folder */}
          {editingFolder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{editingFolder.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">تخصيص محادثات: {editingFolder.title}</h4>
                    <p className="text-[11px] text-slate-400">حدد القنوات والمجموعات التي تود ضمها إلى هذا المجلد</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>تم والعودة</span>
                </button>
              </div>

              {/* Chat Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن قناة أو مجموعة لضمها للمجلد..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Chat selection list */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {filteredDialogsForEdit.map((d) => {
                  const isInFolder = editingFolder.chatIds.some((id) => areChatIdsEqual(id, d.id));
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleChatInFolder(editingFolder.id, d.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        isInFolder
                          ? 'bg-sky-600/20 border-sky-500/50 text-white'
                          : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                            isInFolder ? 'bg-sky-500 border-sky-400 text-white' : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {isInFolder && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">{d.title}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            {d.isChannel && <Megaphone className="w-3 h-3 text-sky-400" />}
                            {d.isGroup && <Users className="w-3 h-3 text-indigo-400" />}
                            {d.isUser && <User className="w-3 h-3 text-emerald-400" />}
                            <span>{d.isChannel ? 'قناة' : d.isGroup ? 'مجموعة' : 'خاص'}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{d.unreadCount > 0 ? `${d.unreadCount} غير مقروء` : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Folders List Header with Add Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">قائمة التبويبات والمجلدات الحالية ({folders.length})</span>
                <button
                  onClick={() => setIsCreating((prev) => !prev)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء مجلد مخصص</span>
                </button>
              </div>

              {/* Create New Folder Inline Form */}
              {isCreating && (
                <form onSubmit={handleCreateFolder} className="p-3.5 bg-slate-800/70 border border-slate-700 rounded-2xl space-y-3 animate-fade-in">
                  <div className="text-xs font-bold text-white">إضافة مجلد جديد</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="اسم المجلد (مثال: قنوات هامة، عملات، دراسة...)"
                      value={newFolderTitle}
                      onChange={(e) => setNewFolderTitle(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newFolderTitle.trim()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-xl cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  {/* Icon Quick Select */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-base">
                    <span className="text-[11px] text-slate-400 shrink-0 ml-1">الأيقونة:</span>
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setNewFolderIcon(emoji)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                          newFolderIcon === emoji ? 'bg-sky-500/30 scale-110 ring-1 ring-sky-400' : 'hover:bg-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </form>
              )}

              {/* Folders List */}
              <div className="space-y-2">
                {folders.map((folder) => {
                  const count = getChatCountForFolder(folder);
                  const isSelected = selectedFolderId === folder.id;
                  const isBuiltIn = ['all', 'channels', 'groups', 'users', 'unread'].includes(folder.id);

                  return (
                    <div
                      key={folder.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-sky-600/15 border-sky-500/50 text-white'
                          : 'bg-slate-800/40 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{folder.icon || '📁'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{folder.title}</h4>
                            {folder.isAiGenerated && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                AI
                              </span>
                            )}
                            {folder.isCustom && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                مخصص
                              </span>
                            )}
                          </div>
                          {folder.description && (
                            <p className="text-[10px] text-slate-400 truncate">{folder.description}</p>
                          )}
                          <div className="text-[11px] text-sky-400 font-mono mt-0.5">
                            {count} {folder.filterType === 'channels' ? 'قناة' : 'محادثة'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Select Folder Button */}
                        <button
                          onClick={() => {
                            setSelectedFolderId(folder.id);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? 'المحدد حالياً' : 'عرض المحادثات'}
                        </button>

                        {/* Edit Chat Assignments (Custom or AI folders) */}
                        {!isBuiltIn && (
                          <button
                            onClick={() => setEditingFolderId(folder.id)}
                            title="تعديل القنوات المضمنة في هذا المجلد"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                          >
                            <Folder className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Custom or AI Folder */}
                        {!isBuiltIn && (
                          <button
                            onClick={() => deleteCustomFolder(folder.id)}
                            title="حذف المجلد"
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            onClick={() => resetFoldersToDefault()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة التبويبات الافتراضية</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
