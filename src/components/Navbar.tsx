import React from 'react';
import { Volume2, VolumeX, Flame, Play, ShieldAlert, PlusCircle, Trophy } from 'lucide-react';
import { spookyAudio } from '../utils/audio';

interface NavbarProps {
  totalVotes: number;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  onReplayIntro: () => void;
  onOpenAdmin: () => void;
  onQuickAdd?: () => void;
  activeTab: 'votacao' | 'ranking';
  onSelectTab: (tab: 'votacao' | 'ranking') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalVotes,
  isAudioPlaying,
  onToggleAudio,
  onReplayIntro,
  onOpenAdmin,
  onQuickAdd,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-orange-500/20 bg-black/95 backdrop-blur-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Logo / Brand with Animated Monster Video Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 border-orange-500 shadow-lg shadow-orange-600/40 bg-black flex-shrink-0">
            <video
              src="/assets/aistudio/From_Klickpin.com-_Paper_Flower_Ideas_Ideas_Youll_Keep_Coming_Back_To_54276-pin-id-703898616798679291_7dc131f0.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black font-creepster tracking-wider text-orange-500 text-glow-orange">
                T99 HALLOWEEN
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/30 text-red-400 border border-red-500/30">
                2026 LIVE
              </span>
            </div>
            <p className="text-[11px] font-cinzel text-gray-300 hidden sm:block">
              Votação da Melhor Fantasia • 1 Voto Por Computador
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Votação / Ranking) */}
        <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-orange-500/30">
          <button
            onClick={() => onSelectTab('votacao')}
            className={`px-3 sm:px-5 py-1.5 rounded-xl text-xs font-cinzel font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'votacao'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md shadow-orange-600/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🎃</span>
            <span>Votação</span>
          </button>

          <button
            onClick={() => onSelectTab('ranking')}
            className={`px-3 sm:px-5 py-1.5 rounded-xl text-xs font-cinzel font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ranking'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Ranking</span>
          </button>
        </div>

        {/* Global Controls & Secret Admin Icon */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Register Candidate Button */}
          {onQuickAdd && (
            <button
              onClick={onQuickAdd}
              className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/40 text-orange-300 hover:text-white text-xs font-bold font-cinzel flex items-center gap-1.5 cursor-pointer transition-all"
              title="Cadastrar Nova Fantasia no Concurso"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Cadastrar Fantasia</span>
            </button>
          )}

          {/* Total Votes Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-950/60 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold shadow-inner">
            <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            <span>{totalVotes}</span>
            <span className="hidden md:inline text-[11px] font-sans font-normal text-gray-400">
              {totalVotes === 1 ? 'voto' : 'votos'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAudioPlaying
                ? 'bg-purple-950/80 border-purple-500/60 text-purple-300 shadow-md shadow-purple-900/40'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
            title={isAudioPlaying ? 'Silenciar Áudio Sombrio' : 'Ativar Áudio Sombrio'}
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="hidden xl:inline text-[11px]">Áudio Ativo</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-gray-400" />
                <span className="hidden xl:inline text-[11px]">Sem Som</span>
              </>
            )}
          </button>

          {/* Replay Intro Video */}
          <button
            onClick={() => {
              spookyAudio.playGothicBell();
              onReplayIntro();
            }}
            className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/90 border border-orange-500/40 hover:border-orange-500 text-orange-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            title="Rever vídeo da Bruxa do T99 em tela cheia"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden md:inline">Vídeo</span>
          </button>

          {/* Hidden Admin Access Trigger */}
          <button
            onClick={onOpenAdmin}
            className="p-2 rounded-xl bg-black/60 hover:bg-red-950/80 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
            title="Portal Oculto dos Mestres (Admin)"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
