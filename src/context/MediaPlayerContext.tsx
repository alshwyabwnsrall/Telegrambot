import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { ActiveAudioTrack } from '../types/telegram.js';

interface MediaPlayerContextType {
  currentTrack: ActiveAudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  playTrack: (track: ActiveAudioTrack) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  togglePlayTrack: (track: ActiveAudioTrack) => void;
  seekTo: (seconds: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  setSpeed: (speed: number) => void;
  closePlayer: () => void;
  skipBy: (seconds: number) => void;
}

const MediaPlayerContext = createContext<MediaPlayerContextType | undefined>(undefined);

export const MediaPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<ActiveAudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: any) => {
      console.warn('[Audio Player] Playback error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const playTrack = useCallback((track: ActiveAudioTrack) => {
    if (!audioRef.current) return;

    if (currentTrack?.url !== track.url) {
      audioRef.current.src = track.url;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.load();
      if (track.duration) {
        setDuration(track.duration);
      }
      setCurrentTime(0);
    }

    audioRef.current.play().catch((err) => {
      console.warn('[Audio Player] Autoplay error:', err);
    });

    setCurrentTrack({ ...track, isPlaying: true });
    setIsPlaying(true);
  }, [currentTrack, playbackRate, isMuted, volume]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const resumeTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, []);

  const togglePlayTrack = useCallback((track: ActiveAudioTrack) => {
    if (currentTrack?.url === track.url) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      playTrack(track);
    }
  }, [currentTrack, isPlaying, pauseTrack, resumeTrack, playTrack]);

  const seekTo = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const skipBy = useCallback((seconds: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(0, Math.min(audioRef.current.duration || 99999, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  }, []);

  const setVolumeLevel = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <MediaPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        isMuted,
        playTrack,
        pauseTrack,
        resumeTrack,
        togglePlayTrack,
        seekTo,
        setVolumeLevel,
        toggleMute,
        setSpeed,
        closePlayer,
        skipBy,
      }}
    >
      {children}
    </MediaPlayerContext.Provider>
  );
};

export function useMediaPlayer(): MediaPlayerContextType {
  const context = useContext(MediaPlayerContext);
  if (!context) {
    throw new Error('useMediaPlayer must be used within a MediaPlayerProvider');
  }
  return context;
}
