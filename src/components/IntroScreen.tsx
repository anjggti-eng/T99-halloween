import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, FastForward } from 'lucide-react';
import { spookyAudio } from '../utils/audio';

interface IntroScreenProps {
  onEnter: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnter }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [needsSoundInteraction, setNeedsSoundInteraction] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    // Always start muted to guarantee smooth autoplay across all browsers without abort errors
    video.muted = true;
    setIsAudioMuted(true);
    setNeedsSoundInteraction(true);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        if (error?.name !== 'AbortError') {
          console.warn('Video autoplay notice:', error?.message || error);
        }
      });
    }

    return () => {
      if (video) {
        try {
          video.pause();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const unmuteSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsAudioMuted(false);
      setNeedsSoundInteraction(false);
      spookyAudio.playGothicBell();
    }
  };

  const handleVideoEnd = () => {
    spookyAudio.startAmbient();
    spookyAudio.playThunder();
    onEnter();
  };

  const handleSkip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
    }
    spookyAudio.startAmbient();
    onEnter();
  };

  return (
    <div
      onClick={needsSoundInteraction ? unmuteSound : undefined}
      className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden flex items-center justify-center cursor-pointer"
    >
      {/* Fullscreen Video */}
      <video
        ref={videoRef}
        src="/assets/aistudio/Bruxa_assusta_com_risada_sombria_ad122cfa_aeeabed5.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="w-full h-full object-cover"
      />

      {/* Floating Skip button */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={handleSkip}
          className="px-4 py-2 rounded-full bg-black/75 hover:bg-black/95 backdrop-blur-md border border-orange-500/50 text-orange-300 hover:text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xl transition-all"
        >
          <span>Pular para a Votação</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Unmute button if browser blocked sound */}
      <AnimatePresence>
        {needsSoundInteraction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
          >
            <button
              onClick={unmuteSound}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 border border-yellow-300/60 text-white font-cinzel font-black text-sm tracking-wider flex items-center gap-3 shadow-2xl shadow-orange-600/80 animate-pulse cursor-pointer hover:scale-105 transition-all"
            >
              <VolumeX className="w-5 h-5 text-yellow-300 animate-bounce" />
              <span>CLIQUE NA TELA PARA ATIVAR O ÁUDIO DA BRUXA</span>
              <Volume2 className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Bottom watermark */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-orange-500/30">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[11px] font-creepster text-orange-400 tracking-wider">
            T99 HALLOWEEN
          </span>
        </div>
      </div>
    </div>
  );
};
