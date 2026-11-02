import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Flame, AlertCircle, ShieldCheck } from 'lucide-react';
import { Candidate } from '../types';
import { spookyAudio } from '../utils/audio';

interface VoterNameModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVote: (candidate: Candidate, voterName: string) => Promise<void>;
}

export const VoterNameModal: React.FC<VoterNameModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onConfirmVote,
}) => {
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pre-fill if voter previously entered their name on this device
      const savedName = localStorage.getItem('t99_voter_full_name');
      if (savedName) {
        setFullName(savedName);
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Por favor, informe o seu nome completo antes de votar.');
      return;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2 || trimmed.length < 4) {
      setError('Por favor, digite seu nome e sobrenome completo (ex: Maria Souza).');
      return;
    }

    try {
      setIsSubmitting(true);
      spookyAudio.playThunder();
      localStorage.setItem('t99_voter_full_name', trimmed);
      await onConfirmVote(candidate, trimmed);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar voto. Tente novamente.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const candidatePhoto =
    candidate.photos && candidate.photos.length > 0
      ? candidate.photos[0]
      : 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=600&q=80';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg my-8 bg-[#10081d] border-2 border-orange-500/60 rounded-3xl overflow-hidden shadow-2xl glow-orange flex flex-col"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between p-5 border-b border-orange-500/20 bg-black/60">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-flicker">🎃</span>
              <div>
                <h3 className="font-cinzel font-black text-lg text-orange-400">
                  Identificação do Votante
                </h3>
                <p className="text-[11px] text-gray-400">
                  Obrigatório para validar o voto no concurso T99
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Candidate Summary Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-orange-950/40 border border-orange-500/30">
              <img
                src={candidatePhoto}
                alt={candidate.costumeName}
                className="w-16 h-16 rounded-xl object-cover border border-orange-500/40 flex-shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                  Você está votando em:
                </span>
                <h4 className="font-cinzel font-black text-white text-base truncate">
                  {candidate.costumeName}
                </h4>
                <p className="text-xs text-gray-300 truncate">
                  Participante: <strong className="text-orange-300">{candidate.name}</strong>
                </p>
              </div>
            </div>

            {/* Instruction Notice */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-500/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <p className="font-semibold text-amber-300 mb-0.5">
                  Voto Único e Auditável
                </p>
                <p className="text-gray-400 text-[11px]">
                  Antes de votar é <strong>obrigatório</strong> informar seu nome completo. Os administradores têm acesso à lista de votantes para garantir a integridade do concurso.
                </p>
              </div>
            </div>

            {/* Full Name Input Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span>Seu Nome Completo (Nome e Sobrenome) <span className="text-red-400">*</span></span>
                </span>
                <span className="text-[10px] text-orange-400 font-mono font-normal">
                  Obrigatório
                </span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                placeholder="Ex: Carlos Eduardo da Silva"
                className="w-full px-4 py-3.5 rounded-2xl bg-black/70 border border-orange-500/40 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder-gray-500 text-sm focus:outline-none transition-all shadow-inner"
                autoFocus
                autoComplete="name"
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3 py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-bold text-xs tracking-wider shadow-lg shadow-orange-600/40 hover:shadow-orange-500/60 border border-orange-400/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>REGISTRANDO VOTO...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
                    <span>CONFIRMAR MEU VOTO 🎃</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
