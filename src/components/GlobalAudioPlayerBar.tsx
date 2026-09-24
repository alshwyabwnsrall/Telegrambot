import React from 'react';
import { useMediaPlayer } from '../context/MediaPlayerContext.js';
import { useTelegram } from '../context/TelegramContext.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  X,
  Music,
  Mic,
  Maximize2,
} from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const GlobalAudioPlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isMuted,
    pauseTrack,
    resumeTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    setSpeed,
    closePlayer,
    skipBy,
  } = useMediaPlayer();

  const { isMobile, selectedChatId, activeTab } = useTelegram();

  if (!currentTrack) return null;

  const isMobileNavVisible = isMobile && (!selectedChatId || activeTab !== 'chats');

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlayback = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleSpeedCycle = () => {
    if (playbackRate === 1) setSpeed(1.25);
    else if (playbackRate === 1.25) setSpeed(1.5);
    else if (playbackRate === 1.5) setSpeed(2);
    else setSpeed(1);
  };

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-50 bg-slate-900/95 backdrop-blur-xl border border-sky-500/30 rounded-3xl p-3 sm:px-5 sm:py-3.5 shadow-2xl shadow-sky-950/40 text-white animate-fade-in transition-all ${
        isMobileNavVisible ? 'bottom-16' : 'bottom-3'
      }`}
      dir="rtl"
    >
      {/* Progress Bar Top */}
      <div className="relative w-full mb-2 group">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime || 0}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
        />
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            {currentTrack.isVoice ? <Mic className="w-5 h-5 animate-pulse" /> : <Music className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {currentTrack.title || (currentTrack.isVoice ? 'رسالة صوتية من تيليجرام' : 'ملف صوتي')}
            </div>
            {currentTrack.subtitle && (
              <div className="text-[11px] text-slate-400 truncate">
                {currentTrack.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Skip 10s backward */}
          <button
            onClick={() => skipBy(-10)}
            title="رجوع 10 ثوانٍ"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayback}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            className="p-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-sky-500/30 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />}
          </button>

          {/* Skip 10s forward */}
          <button
            onClick={() => skipBy(10)}
            title="تقديم 10 ثوانٍ"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Speed Toggle */}
          <button
            onClick={handleSpeedCycle}
            title="سرعة التشغيل"
            className="px-2 py-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl transition-colors cursor-pointer"
          >
            {playbackRate}x
          </button>
        </div>

        {/* Volume & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Volume */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-xl">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Download Original File */}
          {currentTrack.downloadUrl && (
            <a
              href={currentTrack.downloadUrl}
              download={currentTrack.title || 'audio.mp3'}
              title="تنزيل الملف الصوتي الأصلي من تيليجرام"
              className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* Close */}
          <button
            onClick={closePlayer}
            title="إغلاق المشغل"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
