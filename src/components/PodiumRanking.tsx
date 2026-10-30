import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Crown, Share2 } from 'lucide-react';
import { Candidate } from '../types';

interface PodiumRankingProps {
  candidates: Candidate[];
  totalVotes: number;
  onOpenDetails: (candidate: Candidate) => void;
  onShareWinner: (candidate: Candidate) => void;
}

export const PodiumRanking: React.FC<PodiumRankingProps> = ({
  candidates,
  totalVotes,
  onOpenDetails,
  onShareWinner,
}) => {
  // Sort candidates
  const top1 = candidates[0];
  const top2 = candidates[1];
  const top3 = candidates[2];

  if (!top1 || top1.votes === 0) {
    return (
      <div className="p-6 rounded-2xl bg-black/40 border border-orange-500/20 text-center text-gray-400 text-sm max-w-2xl mx-auto my-6">
        <span className="text-3xl block mb-2 animate-bounce">🎃</span>
        <p className="font-cinzel font-bold text-orange-400 text-base mb-1">
          O Pódio dos Mortos Aguarda os Primeiros Votos!
        </p>
        <p className="text-xs text-gray-400">
          Vote na sua fantasia favorita para ver o ranking em tempo real ser coroado aqui.
        </p>
      </div>
    );
  }

  const renderPodiumItem = (
    c: Candidate | undefined,
    place: 1 | 2 | 3,
    heightClass: string,
    colorBorder: string,
    crownColor: string
  ) => {
    if (!c) return <div className="flex-1 opacity-20" />;

    const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
    const photo = c.photos && c.photos.length > 0 ? c.photos[0] : '';

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => onOpenDetails(c)}
        className={`flex-1 flex flex-col items-center cursor-pointer transition-all ${
          place === 1 ? 'order-2 z-10' : place === 2 ? 'order-1' : 'order-3'
        }`}
      >
        {/* Candidate Avatar & Crown */}
        <div className="relative mb-3 flex flex-col items-center">
          {place === 1 ? (
            <Crown className="w-8 h-8 text-yellow-400 animate-bounce -mb-1 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
          ) : (
            <div className={`text-xs font-cinzel font-bold px-2 py-0.5 rounded-full mb-1 ${crownColor}`}>
              #{place}
            </div>
          )}

          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 ${colorBorder} shadow-xl relative bg-black`}
          >
            {photo ? (
              <img src={photo} alt={c.costumeName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">👻</div>
            )}
          </div>

          <div className="absolute -bottom-2 px-2 py-0.5 rounded-md bg-black/90 border border-orange-500/40 text-[10px] font-mono text-orange-400 font-bold">
            {c.votes} {c.votes === 1 ? 'voto' : 'votos'}
          </div>
        </div>

        {/* Name */}
        <h4 className="text-xs sm:text-sm font-cinzel font-bold text-center text-white line-clamp-1 max-w-[120px] sm:max-w-[160px] mb-0.5">
          {c.costumeName}
        </h4>
        <span className="text-[10px] text-gray-400 text-center mb-2 line-clamp-1">
          {c.name}
        </span>

        {/* Podium Base Pillar */}
        <div
          className={`w-full ${heightClass} rounded-t-xl bg-gradient-to-b from-[#1c0d32] to-[#0d0617] border-t border-x border-orange-500/30 p-2 sm:p-3 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden`}
        >
          <div className="text-center">
            <span className="text-lg sm:text-2xl font-black font-creepster text-orange-500">
              #{place}
            </span>
          </div>

          <div className="w-full text-center">
            <div className="text-[11px] font-bold text-orange-300">{pct}%</div>
            <div className="text-[9px] text-gray-400">dos votos</div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="my-8 max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-base sm:text-lg font-cinzel font-bold text-orange-400 tracking-wide">
            PÓDIO EM TEMPO REAL
          </h3>
        </div>

        {top1 && top1.votes > 0 && (
          <button
            onClick={() => onShareWinner(top1)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold font-cinzel flex items-center gap-1.5 shadow-md shadow-orange-600/30 cursor-pointer transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar Campeão</span>
          </button>
        )}
      </div>

      {/* Podium Display */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 p-4 sm:p-6 rounded-3xl bg-black/60 border border-orange-500/30 glow-purple">
        {renderPodiumItem(
          top2,
          2,
          'h-24 sm:h-32',
          'border-slate-300 shadow-slate-300/30',
          'bg-slate-300 text-black'
        )}
        {renderPodiumItem(
          top1,
          1,
          'h-32 sm:h-44 border-orange-500/60',
          'border-amber-400 shadow-amber-400/50 scale-105',
          'bg-amber-400 text-black'
        )}
        {renderPodiumItem(
          top3,
          3,
          'h-20 sm:h-24',
          'border-amber-700 shadow-amber-700/30',
          'bg-amber-700 text-white'
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
        <Flame className="w-3.5 h-3.5 text-orange-500" />
        <span>Total de votos computados na competição: <strong className="text-orange-400">{totalVotes}</strong></span>
      </div>
    </div>
  );
};
