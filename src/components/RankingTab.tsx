import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Crown, Share2, Eye, Skull, Ghost } from 'lucide-react';
import { Candidate } from '../types';
import { PodiumRanking } from './PodiumRanking';

interface RankingTabProps {
  candidates: Candidate[];
  totalVotes: number;
  onOpenDetails: (candidate: Candidate) => void;
  onShareWinner: (candidate: Candidate) => void;
  onSwitchToVoting: () => void;
}

export const RankingTab: React.FC<RankingTabProps> = ({
  candidates,
  totalVotes,
  onOpenDetails,
  onShareWinner,
  onSwitchToVoting,
}) => {
  // Sorted candidates
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const leader = sorted[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="text-center py-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>CLASSIFICAÇÃO EM TEMPO REAL</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black font-creepster text-orange-500 text-glow-orange mb-2">
          PLACAR DOS VENCEDORES
        </h2>

        <p className="text-xs sm:text-sm text-gray-300">
          Acompanhe ao vivo a disputa pela melhor fantasia do T99 Halloween. Atualizado instantaneamente a cada voto!
        </p>
      </div>

      {/* Top 3 Podium */}
      <PodiumRanking
        candidates={sorted}
        totalVotes={totalVotes}
        onOpenDetails={onOpenDetails}
        onShareWinner={onShareWinner}
      />

      {/* Full Leaderboard List */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-orange-500/20 pb-3">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-500" />
            <h3 className="font-cinzel font-bold text-lg text-white">
              Tabela Completa de Classificação ({sorted.length})
            </h3>
          </div>

          {leader && leader.votes > 0 && (
            <button
              onClick={() => onShareWinner(leader)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-cinzel text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/30 cursor-pointer transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartilhar Líder</span>
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center bg-black/40 rounded-2xl border border-white/10 space-y-3">
            <Ghost className="w-10 h-10 text-orange-400 mx-auto animate-bounce" />
            <h4 className="font-cinzel font-bold text-white text-base">
              Nenhuma fantasia cadastrada
            </h4>
            <p className="text-xs text-gray-400">
              Cadastre as fantasias no painel do administrador para que elas apareçam no placar de líderes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((cand, idx) => {
              const rank = idx + 1;
              const percentage = totalVotes > 0 ? Math.round((cand.votes / totalVotes) * 100) : 0;
              const photo = cand.photos && cand.photos.length > 0 ? cand.photos[0] : '';

              const isTop1 = rank === 1 && cand.votes > 0;
              const isTop2 = rank === 2 && cand.votes > 0;
              const isTop3 = rank === 3 && cand.votes > 0;

              return (
                <motion.div
                  key={cand.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isTop1
                      ? 'bg-[#180b2c] border-amber-500/70 shadow-lg shadow-amber-500/20'
                      : isTop2
                      ? 'bg-[#120822] border-slate-400/50'
                      : isTop3
                      ? 'bg-[#120822] border-amber-700/50'
                      : 'bg-[#0d0617]/90 border-white/10'
                  }`}
                >
                  {/* Left: Position + Photo + Name */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    {/* Rank Badge */}
                    <div className="w-10 flex-shrink-0 text-center">
                      {isTop1 ? (
                        <Crown className="w-7 h-7 text-amber-400 mx-auto animate-bounce" />
                      ) : (
                        <span
                          className={`inline-block font-creepster text-xl sm:text-2xl ${
                            isTop2 ? 'text-slate-300' : isTop3 ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        >
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Candidate Photo Thumbnail */}
                    <div
                      onClick={() => onOpenDetails(cand)}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black border border-white/15 flex-shrink-0 cursor-pointer hover:border-orange-500 transition-colors"
                      title="Ver Detalhes"
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={cand.costumeName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🎃</div>
                      )}
                    </div>

                    {/* Costume & Participant Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => onOpenDetails(cand)}
                          className="font-cinzel font-bold text-sm sm:text-base text-white hover:text-orange-400 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {cand.costumeName}
                        </h4>
                        {isTop1 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Líder Atual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        Participante: <span className="text-orange-300 font-medium">{cand.name}</span>
                      </p>

                      {/* Percentage Bar on mobile & desktop */}
                      <div className="mt-2 flex items-center gap-2 max-w-xs">
                        <div className="flex-1 h-1.5 rounded-full bg-black/60 border border-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-700"
                            style={{ width: `${Math.max(percentage, cand.votes > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-orange-400 font-bold">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Votes Count & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="font-mono text-sm sm:text-base font-black text-orange-400 flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>{cand.votes}</span>
                        <span className="text-xs font-sans font-normal text-gray-400">
                          {cand.votes === 1 ? 'voto' : 'votos'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenDetails(cand)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                        title="Ver Fotos e Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onShareWinner(cand)}
                        className="p-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/40 text-orange-300 hover:text-white transition-colors cursor-pointer"
                        title="Compartilhar no WhatsApp/Redes"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA to Vote */}
        <div className="text-center pt-8">
          <button
            onClick={onSwitchToVoting}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-bold text-sm tracking-wider shadow-lg shadow-orange-600/30 cursor-pointer transition-all active:scale-95"
          >
            🎃 IR PARA A ABA DE VOTAÇÃO
          </button>
        </div>
      </div>
    </div>
  );
};
