import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, CheckCircle, Eye, Images, Ghost } from 'lucide-react';
import { Candidate } from '../types';
import { spookyAudio } from '../utils/audio';

interface CandidateCardProps {
  candidate: Candidate;
  rankIndex: number;
  hasVotedOnThisPc: boolean;
  isMyVote: boolean;
  onVote: (candidate: Candidate) => void;
  onOpenDetails: (candidate: Candidate) => void;
  totalVotesAll: number;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  rankIndex,
  hasVotedOnThisPc,
  isMyVote,
  onVote,
  onOpenDetails,
  totalVotesAll,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const photos = candidate.photos && candidate.photos.length > 0
    ? candidate.photos
    : ['https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80'];

  const currentPhoto = photos[activePhotoIdx] || photos[0];
  const percentage = totalVotesAll > 0 ? Math.round((candidate.votes / totalVotesAll) * 100) : 0;

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVotedOnThisPc) return;
    spookyAudio.playThunder();
    onVote(candidate);
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0 && candidate.votes > 0) {
      return (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 text-black font-cinzel font-extrabold text-xs shadow-lg shadow-amber-500/40">
          <span>👑 1º LUGAR</span>
        </div>
      );
    }
    if (idx === 1 && candidate.votes > 0) {
      return (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-300/90 text-black font-cinzel font-bold text-xs shadow-md">
          <span>🥈 2º LUGAR</span>
        </div>
      );
    }
    if (idx === 2 && candidate.votes > 0) {
      return (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-700/90 text-white font-cinzel font-bold text-xs shadow-md">
          <span>🥉 3º LUGAR</span>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${
        isMyVote
          ? 'border-emerald-500/80 bg-[#120d22] shadow-2xl shadow-emerald-500/20'
          : 'border-orange-500/30 hover:border-orange-500/70 bg-[#0e071a]/90 hover:shadow-2xl hover:shadow-orange-600/25'
      }`}
    >
      {/* Visual Rank Badge */}
      {getRankBadge(rankIndex)}

      {/* Voted by this PC badge */}
      {isMyVote && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/90 text-black text-xs font-bold shadow-lg">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>SEU VOTO</span>
        </div>
      )}

      {/* Image Container with 1 or 2 Photo Switcher */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-black/80">
        <motion.img
          key={currentPhoto}
          initial={{ opacity: 0.8, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          src={currentPhoto}
          alt={candidate.costumeName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />

        {/* Dark gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e071a] via-transparent to-black/30 pointer-events-none" />

        {/* 2-Photo selector badge & switcher if 2 photos exist */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <Images className="w-3.5 h-3.5 text-orange-400" />
            <div className="flex gap-1">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx(idx);
                  }}
                  className={`w-5 h-5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    activePhotoIdx === idx
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/20 text-gray-300 hover:bg-white/40'
                  }`}
                  title={`Ver Foto ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category tag */}
        {candidate.category && candidate.category !== 'Todas' && (
          <div className="absolute bottom-3 left-3 z-20">
            <span className="px-2.5 py-1 rounded-md bg-purple-950/80 border border-purple-500/40 text-[11px] font-semibold text-purple-300 backdrop-blur-md">
              {candidate.category}
            </span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-cinzel font-bold text-lg text-white group-hover:text-orange-400 transition-colors line-clamp-1">
              {candidate.costumeName}
            </h3>
          </div>

          <p className="text-xs text-orange-300/90 font-medium mb-3 flex items-center gap-1">
            <Ghost className="w-3 h-3 text-orange-400" />
            <span>Participante: {candidate.name}</span>
          </p>

          <p className="text-xs text-gray-300/80 line-clamp-2 leading-relaxed mb-4">
            {candidate.description || 'Fantasia misteriosa pronta para aterrorizar o Halloween T99.'}
          </p>
        </div>

        {/* Votes Count and Percent Bar */}
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <span>{candidate.votes} {candidate.votes === 1 ? 'voto' : 'votos'}</span>
            </span>
            <span className="font-mono text-orange-400/90 text-xs font-bold">
              {percentage}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-black/60 border border-white/5 overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(percentage, candidate.votes > 0 ? 5 : 0)}%` }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDetails(candidate)}
              className="p-2.5 rounded-xl border border-white/10 hover:border-orange-500/40 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              title="Ver Fotos e História Completa"
            >
              <Eye className="w-4 h-4" />
            </button>

            {isMyVote ? (
              <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Voto Computado Neste PC</span>
              </div>
            ) : hasVotedOnThisPc ? (
              <button
                disabled
                className="flex-1 py-2.5 px-3 rounded-xl bg-gray-800/40 border border-gray-700/50 text-gray-500 font-medium text-xs cursor-not-allowed text-center"
              >
                Voto já utilizado neste PC
              </button>
            ) : (
              <button
                onClick={handleVoteClick}
                className="flex-1 py-2.5 px-4 rounded-xl font-cinzel font-bold text-xs tracking-wider text-white bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-orange-600/30 hover:shadow-orange-500/50 border border-orange-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-300" />
                <span>VOTAR NESTA FANTASIA</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
