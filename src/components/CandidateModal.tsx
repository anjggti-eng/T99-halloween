import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, CheckCircle, Share2, ZoomIn, Ghost, User, Tag } from 'lucide-react';
import { Candidate } from '../types';
import { spookyAudio } from '../utils/audio';

interface CandidateModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  hasVotedOnThisPc: boolean;
  isMyVote: boolean;
  onVote: (candidate: Candidate) => void;
  onShare: (candidate: Candidate) => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  candidate,
  onClose,
  hasVotedOnThisPc,
  isMyVote,
  onVote,
  onShare,
}) => {
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  if (!candidate) return null;

  const photos = candidate.photos && candidate.photos.length > 0
    ? candidate.photos
    : ['https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80'];

  const handleVote = () => {
    if (hasVotedOnThisPc) return;
    spookyAudio.playThunder();
    onVote(candidate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl my-8 bg-[#10081d] border-2 border-orange-500/40 rounded-3xl overflow-hidden shadow-2xl glow-orange flex flex-col"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-orange-500/20 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-flicker">🎃</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-cinzel font-extrabold text-orange-400">
                {candidate.costumeName}
              </h2>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-orange-400" />
                <span>Vestida por: <strong className="text-white">{candidate.name}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShare(candidate)}
              className="p-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/40 text-orange-300 hover:text-white transition-colors cursor-pointer"
              title="Compartilhar Fantasia"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Photo Grid: Up to 2 photos side by side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-orange-300 tracking-wider flex items-center gap-1.5 uppercase font-cinzel">
                <Ghost className="w-3.5 h-3.5 text-orange-400" />
                <span>Galeria da Fantasia ({photos.length} de até 2 fotos)</span>
              </span>
              <span className="text-[11px] text-gray-400">Clique para ampliar</span>
            </div>

            <div
              className={`grid gap-4 ${
                photos.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {photos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => setZoomPhoto(photoUrl)}
                  className="group relative aspect-4/3 rounded-2xl overflow-hidden border border-orange-500/30 bg-black cursor-pointer shadow-lg"
                >
                  <img
                    src={photoUrl}
                    alt={`${candidate.costumeName} - Foto ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />

                  {/* Tag label */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-bold text-orange-400 border border-white/10">
                    Foto {idx + 1}
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/75 backdrop-blur-md text-white opacity-80 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-4 h-4 text-orange-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details & Story */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {candidate.category && candidate.category !== 'Todas' && (
                <span className="px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-xs font-semibold text-purple-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{candidate.category}</span>
                </span>
              )}

              <span className="px-3 py-1 rounded-full bg-orange-950/80 border border-orange-500/50 text-xs font-semibold text-orange-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>{candidate.votes} {candidate.votes === 1 ? 'Voto' : 'Votos'}</span>
              </span>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">
                Origem & Concepção do Monstro
              </h4>
              <p className="text-sm text-gray-200 leading-relaxed font-sans">
                {candidate.description || 'Nenhum detalhe adicional informado. Deixe que a aparência assustadora fale por si!'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Voting Action */}
        <div className="p-5 border-t border-orange-500/20 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-400 text-center sm:text-left">
            {isMyVote ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Você já elegeu este candidato como a melhor fantasia no seu PC!</span>
              </span>
            ) : hasVotedOnThisPc ? (
              <span className="text-amber-400/90">
                Seu computador já votou em outro candidato nesta rodada do concurso.
              </span>
            ) : (
              <span>Lembre-se: Cada PC possui apenas 1 voto único e irrevogável!</span>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <button
              onClick={() => onShare(candidate)}
              className="py-3 px-5 rounded-xl border border-orange-500/40 hover:bg-orange-600/20 text-orange-300 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar</span>
            </button>

            {isMyVote ? (
              <div className="py-3 px-6 rounded-xl bg-emerald-600/30 border border-emerald-500 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>VOTO GARANTIDO</span>
              </div>
            ) : hasVotedOnThisPc ? (
              <button
                disabled
                className="py-3 px-6 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-500 font-semibold text-xs cursor-not-allowed"
              >
                Voto Já Realizado
              </button>
            ) : (
              <button
                onClick={handleVote}
                className="w-full sm:w-auto py-3 px-8 rounded-xl font-cinzel font-bold text-sm tracking-wider text-white bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-orange-600/40 hover:shadow-orange-500/60 border border-orange-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
                <span>VOTAR AGORA (1 VOTO POR PC)</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lightbox Zoom */}
      <AnimatePresence>
        {zoomPhoto && (
          <div
            onClick={() => setZoomPhoto(null)}
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              src={zoomPhoto}
              alt="Ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-orange-500/30"
            />
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
