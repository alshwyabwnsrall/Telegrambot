import React, { memo, useState, useRef, useCallback } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Copy,
  Forward,
  Bookmark,
  CornerUpLeft,
  Languages,
  Sparkles,
  Link,
  Square,
  CheckSquare,
  Heart,
} from 'lucide-react';
import { TelegramMessage, TelegramDialog, MessageTranslation } from '../types/telegram.js';
import { InlineMediaRenderer } from './InlineMediaRenderer.js';
import { MessageTranslationBlock } from './MessageTranslationBlock.js';
import { safeString } from '../utils/safeRender.js';

interface MessageRowProps {
  msg: TelegramMessage;
  index: number;
  activeChat: TelegramDialog;
  isOut: boolean;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  replyMsg?: TelegramMessage | null;
  isUnreadBoundary: boolean;
  translation?: MessageTranslation;
  showOriginal: boolean;
  targetLanguage: string;
  onToggleSelect: (id: number) => void;
  onOpenLightbox: (msg: TelegramMessage) => void;
  onOpenFileViewer: (msg: TelegramMessage) => void;
  onRetrySend: (text: string, replyTo?: number) => void;
  onCopy: (text: string, title?: string) => void;
  onForward: (id: number) => void;
  onBookmark: (msg: TelegramMessage) => void;
  onReply: (msg: TelegramMessage) => void;
  onTranslateSingle: (msg: TelegramMessage) => void;
  onOpenAiAssistant: (msg: TelegramMessage) => void;
  onOpenContextMenu?: (msg: TelegramMessage) => void;
  onDoubleTapReact?: (msg: TelegramMessage) => void;
}

function formatMessageTime(dateStr?: string | number): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MessageRow = memo<MessageRowProps>(({
  msg,
  activeChat,
  isOut,
  isSelected,
  isMultiSelectMode,
  replyMsg,
  isUnreadBoundary,
  translation,
  showOriginal,
  targetLanguage,
  onToggleSelect,
  onOpenLightbox,
  onOpenFileViewer,
  onRetrySend,
  onCopy,
  onForward,
  onBookmark,
  onReply,
  onTranslateSingle,
  onOpenAiAssistant,
  onOpenContextMenu,
  onDoubleTapReact,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [heartPopping, setHeartPopping] = useState(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const longPressTimerRef = useRef<any>(null);
  const lastTapRef = useRef(0);
  const hapticTriggeredRef = useRef(false);

  // Clear long press timer safely
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Touch Start Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMultiSelectMode) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isSwipingRef.current = false;
    hapticTriggeredRef.current = false;

    // Start long-press detection
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (onOpenContextMenu && !isSwipingRef.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        onOpenContextMenu(msg);
      }
    }, 420);
  };

  // Touch Move Handler (Swipe to reply)
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    // If moved significantly in Y or X, cancel long-press
    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
      clearLongPress();
    }

    // Horizontal swipe gesture (Swipe Left to reply)
    if (Math.abs(diffX) > Math.abs(diffY) && diffX < -10) {
      isSwipingRef.current = true;
      const offset = Math.max(-80, Math.min(0, diffX));
      setSwipeOffset(offset);

      if (offset <= -45 && !hapticTriggeredRef.current) {
        hapticTriggeredRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15);
        }
      }
    }
  };

  // Touch End Handler
  const handleTouchEnd = () => {
    clearLongPress();

    // Check if swipe triggered reply
    if (swipeOffset <= -45) {
      onReply(msg);
    }
    setSwipeOffset(0);

    // Double Tap detection (within 300ms)
    if (!isSwipingRef.current) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        // Double tap confirmed!
        setHeartPopping(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([15, 30, 20]);
        }
        if (onDoubleTapReact) {
          onDoubleTapReact(msg);
        }
        setTimeout(() => setHeartPopping(false), 900);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
    isSwipingRef.current = false;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenContextMenu) {
      onOpenContextMenu(msg);
    }
  };

  const replyProgress = Math.min(1, Math.abs(swipeOffset) / 45);

  return (
    <>
      {/* Unread Messages Separator */}
      {isUnreadBoundary && (
        <div
          id="unread-boundary"
          style={{ scrollMarginTop: '80px' }}
          className="scroll-mt-20 py-3.5 flex items-center justify-center gap-3 my-3 select-none"
          dir="rtl"
        >
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-sky-500/30 to-sky-500/60" />
          <div className="text-[12px] font-bold text-sky-200 bg-sky-950/90 border border-sky-500/40 px-4 py-1.5 rounded-full shadow-lg shadow-sky-950/50 backdrop-blur-md flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-sm shadow-sky-400" />
            <span>رسائل غير مقروءة</span>
            <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {activeChat.unreadCount}
            </span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-sky-500/30 to-sky-500/60" />
        </div>
      )}

      {/* Row container: explicit dir="ltr" ensures isOut is ALWAYS Right, !isOut is ALWAYS Left */}
      <div
        id={`msg-${msg.id}`}
        data-msg-id={msg.id}
        data-is-out={isOut ? 'true' : 'false'}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', msg.text || '');
        }}
        dir="ltr"
        className={`w-full flex items-end gap-2 group transition-all relative my-1.5 select-none ${
          isOut ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Multi-Select Checkbox */}
        {isMultiSelectMode && (
          <button
            onClick={() => onToggleSelect(msg.id)}
            className="mb-3 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer shrink-0"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-sky-400 fill-sky-400/20" />
            ) : (
              <Square className="w-5 h-5 text-slate-500" />
            )}
          </button>
        )}

        {/* Swipe-to-reply Action Indicator Bubble */}
        {swipeOffset < -5 && (
          <div
            style={{
              opacity: replyProgress,
              transform: `scale(${0.6 + replyProgress * 0.4})`,
            }}
            className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 transition-transform shrink-0"
          >
            <CornerUpLeft className="w-4 h-4" />
          </div>
        )}

        {/* Bubble Container with Long-press, Swipe, and Double Tap */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          style={{
            transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
            transition: swipeOffset === 0 ? 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
          }}
          dir="rtl"
          className={`relative max-w-[88%] sm:max-w-xl p-3.5 sm:p-4 shadow-md transition-shadow active:scale-[0.995] select-none ${
            isSelected
              ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950'
              : ''
          } ${
            msg.failed
              ? 'bg-rose-950/80 border border-rose-600/70 text-rose-100 rounded-2xl rounded-br-xs'
              : isOut
              ? 'bg-sky-600 text-white rounded-2xl rounded-br-xs shadow-sky-950/20'
              : 'bg-[#182533] border border-slate-800 text-slate-100 rounded-2xl rounded-bl-xs shadow-slate-950/30'
          }`}
        >
          {/* Heart Pop Animation */}
          {heartPopping && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-ping">
              <Heart className="w-14 h-14 text-rose-500 fill-rose-500 drop-shadow-xl" />
            </div>
          )}

          {/* Sender Name in groups/channels */}
          {!isOut && msg.senderName && (
            <div className="text-[13px] font-bold text-sky-300 mb-1 flex items-center justify-between">
              <span>{safeString(msg.senderName)}</span>
            </div>
          )}

          {/* Replying quote */}
          {replyMsg && (
            <div
              className={`mb-2.5 p-2 rounded-xl text-xs border-r-2 cursor-pointer ${
                isOut
                  ? 'bg-sky-700/60 border-sky-300 text-sky-100'
                  : 'bg-slate-900/60 border-sky-500 text-slate-300'
              }`}
            >
              <div className="font-semibold text-[11px] text-sky-300">
                {replyMsg.senderName || (replyMsg.out ? 'أنت' : 'الرسالة')}
              </div>
              <div className="truncate">{replyMsg.text || 'وسائط'}</div>
            </div>
          )}

          {/* Media Content with Lazy Loading */}
          {msg.media && (
            <div className="mb-2 w-full">
              <InlineMediaRenderer
                message={msg}
                isOut={isOut}
                onOpenLightbox={onOpenLightbox}
                onOpenFileViewer={onOpenFileViewer}
              />
            </div>
          )}

          {/* Text Message with Clear 16px Mobile-Friendly Typography */}
          {msg.text && (
            <div className="text-[15px] sm:text-[16px] whitespace-pre-wrap break-words leading-[1.55] select-text font-sans tracking-normal">
              {msg.text}
            </div>
          )}

          {/* Message Translation Block */}
          {msg.text && (
            <MessageTranslationBlock
              translation={translation}
              isOut={isOut}
              showOriginal={showOriginal}
              onRetry={() => onTranslateSingle(msg)}
            />
          )}

          {/* Footer (Time & Status Checks) neatly docked */}
          <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-slate-300/85">
            <span className="font-mono">{formatMessageTime(msg.date)}</span>
            {isOut && (
              msg.sending ? (
                <span title="جاري الإرسال إلى Telegram..." className="flex items-center text-sky-200">
                  <Clock className="w-3.5 h-3.5 animate-pulse text-sky-200" />
                </span>
              ) : msg.failed ? (
                <button
                  onClick={() => {
                    if (msg.text) onRetrySend(msg.text, msg.replyToMsgId || undefined);
                  }}
                  className="flex items-center gap-1 text-rose-300 hover:text-white bg-rose-900/60 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                  title="فشل الإرسال. انقر لإعادة المحاولة"
                >
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  <span className="text-[9px] font-medium">إعادة المحاولة</span>
                </button>
              ) : (
                <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
              )
            )}
          </div>

          {/* Quick Action Toolbar on Hover (Desktop) */}
          <div
            className={`absolute -top-3.5 ${
              isOut ? 'left-2' : 'right-2'
            } hidden sm:group-hover:flex items-center gap-1 bg-slate-900 border border-slate-700/90 rounded-2xl p-1 shadow-xl z-20 animate-fade-in`}
          >
            {/* Context menu opener */}
            {onOpenContextMenu && (
              <button
                onClick={() => onOpenContextMenu(msg)}
                title="خيارات الرسالة وقائمة التفاعلات"
                className="p-1.5 text-sky-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            )}

            {/* Copy full message */}
            <button
              onClick={() => onCopy(msg.text || '', activeChat.title)}
              title="نسخ الرسالة بالكامل"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>

            {/* Forward */}
            <button
              onClick={() => onForward(msg.id)}
              title="تحويل الرسالة عبر MTProto"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Forward className="w-3 h-3" />
            </button>

            {/* Bookmark */}
            <button
              onClick={() => onBookmark(msg)}
              title="حفظ في المحفوظات"
              className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Bookmark className="w-3 h-3" />
            </button>

            {/* Reply */}
            <button
              onClick={() => onReply(msg)}
              title="الرد على الرسالة"
              className="p-1.5 text-slate-300 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <CornerUpLeft className="w-3 h-3" />
            </button>

            {/* AI Translate Single Message */}
            {msg.text && (
              <button
                onClick={() => onTranslateSingle(msg)}
                title="ترجمة هذه الرسالة فورياً بالذكاء الاصطناعي"
                className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <Languages className="w-3 h-3" />
              </button>
            )}

            {/* AI Message Assistant */}
            <button
              onClick={() => onOpenAiAssistant(msg)}
              title="أدوات الذكاء الاصطناعي (رد، تلخيص، ترجمة، استخراج بيانات)"
              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
            </button>

            {/* Link copy */}
            {activeChat.username && (
              <button
                onClick={() => {
                  const link = `https://t.me/${activeChat.username}/${msg.id}`;
                  onCopy(link, 'رابط الرسالة');
                }}
                title="نسخ رابط تيليجرام للرسالة"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <Link className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

MessageRow.displayName = 'MessageRow';
