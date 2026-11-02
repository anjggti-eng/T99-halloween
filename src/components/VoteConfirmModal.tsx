import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, ShieldAlert, User, AlertCircle, CheckCircle, Skull } from 'lucide-react';
import { Candidate } from '../types';
import { spookyAudio } from '../utils/audio';

interface VoteConfirmModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  onClose: () => void;
  onConfirm: (candidate: Candidate, voterFullName: string) => Promise<void>;
  hasVotedOnThisPc: boolean;
}

export const VoteConfirmModal: React.FC<VoteConfirmModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onConfirm,
  hasVotedOnThisPc,
}) => {
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill previously stored name if available
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('t99_voter_full_name');
      if (saved) {
        setFullName(saved);
      }
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !candidate) return null;

  const candidatePhoto =
    candidate.photos && candidate.photos[0]
      ? candidate.photos[0]
      : 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMsg('Por favor, informe seu nome completo antes de votar.');
      return;
    }

    const words = cleanName.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      setErrorMsg('Digite seu nome e sobrenome completo (ex: Mariana Souza).');
      return;
    }

    if (cleanName.length < 5) {
      setErrorMsg('O nome completo deve conter pelo menos 5 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      spookyAudio.playThunder();
      // Store in browser storage for convenience
      localStorage.setItem('t99_voter_full_name', cleanName);
      await onConfirm(candidate, cleanName);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao confirmar o voto.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 25 }}
        className="relative w-full max-w-lg bg-black/95 border-2 border-orange-500 rounded-3xl overflow-hidden shadow-2xl glow-orange"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-orange-500/30 bg-black/40">
          <div className="flex items-center gap-2.5 text-orange-400">
            <Skull className="w-5 h-5 text-red-500" />
            <h2 className="font-cinzel font-black text-base sm:text-lg text-white">
              CONFIRMAÇÃO NOMINAL DE VOTO
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Candidate Card Summary */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-black/50 border border-orange-500/30">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-orange-500/50">
              <img
                src={candidatePhoto}
                alt={candidate.costumeName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400 font-cinzel">
                Fantasia Selecionada:
              </span>
              <h3 className="font-cinzel font-bold text-base text-white truncate">
                {candidate.costumeName}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <User className="w-3 h-3 text-orange-400" />
                <span>Participante: <strong className="text-orange-300">{candidate.name}</strong></span>
              </p>
            </div>
          </div>

          {/* Mandatory Name Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-orange-400" />
                <span>Seu Nome Completo (Obrigatório) *</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">
                Identificação na Urna
              </span>
            </div>

            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Digite seu Nome e Sobrenome..."
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl bg-black/70 border-2 border-orange-500/50 focus:border-orange-400 text-white placeholder-gray-500 text-sm focus:outline-none shadow-inner tracking-wide"
            />
            <p className="text-[11px] text-gray-400">
              * O nome completo é arquivado junto ao voto e ficará visível na auditoria da organização.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-orange-950/40 border border-orange-500/40 flex items-start gap-2.5 text-xs text-orange-200/90 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Regra do Concurso T99 Halloween:</strong>
              Cada computador tem direito a apenas 1 voto único. Ao confirmar, seu voto será registrado nominalmente e este computador será bloqueado para novas votações.
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-xl bg-red-950/70 border border-red-500/80 text-red-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-3 px-5 rounded-xl border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-xs font-bold font-cinzel transition-colors cursor-pointer"
            >
              CANCELAR
            </button>

            <button
              type="submit"
              disabled={isSubmitting || hasVotedOnThisPc}
              className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-600/40 border border-orange-400/50 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>REGISTRANDO VOTO NOMINAL...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
                  <span>CONFIRMAR MEU VOTO</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
