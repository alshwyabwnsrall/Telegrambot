import React, { useState, useRef } from 'react';
import { Scissors, Copy, Check, X } from 'lucide-react';

interface TextSelectModalProps {
  isOpen: boolean;
  text: string;
  onClose: () => void;
  onCopy: (selectedText: string) => void;
}

export const TextSelectModal: React.FC<TextSelectModalProps> = ({
  isOpen,
  text,
  onClose,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        setSelectedText(text.substring(start, end));
      } else {
        setSelectedText('');
      }
    }
  };

  const handleCopySelection = () => {
    const toCopy = selectedText || text;
    onCopy(toCopy);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Scissors className="w-4 h-4 text-amber-400" />
            <span>تحديد ونسخ نص الرسالة</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          قم بتحديد النص المراد نسخه من المربع أدناه ثم اضغط على زر النسخ:
        </p>

        <textarea
          ref={textareaRef}
          defaultValue={text}
          onSelect={handleSelect}
          onMouseUp={handleSelect}
          onTouchEnd={handleSelect}
          rows={6}
          className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 font-sans leading-relaxed resize-none focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />

        {selectedText && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
            <span className="font-semibold block mb-1">الجزء المحدد للنسخ:</span>
            <span className="line-clamp-2 italic">"{selectedText}"</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleCopySelection}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ بنجاح!' : selectedText ? 'نسخ النص المحدد فقط' : 'نسخ الكل'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
