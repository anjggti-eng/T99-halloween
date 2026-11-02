import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Share2, Copy, Check, Download, Trophy, Crown, Flame } from 'lucide-react';
import { Candidate } from '../types';

interface WinnerShareModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  rank?: number;
}

export const WinnerShareModal: React.FC<WinnerShareModalProps> = ({
  candidate,
  onClose,
  rank = 1,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);

  if (!candidate) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://t99halloween.app';
  const shareText = `🎃 *T99 HALLOWEEN - VOTAÇÃO DA MELHOR FANTASIA!* 🎃\nA fantasia "${candidate.costumeName}" (por ${candidate.name}) está concorrendo ao título com ${candidate.votes} votos!\nVote agora e veja as fotos: ${currentUrl}`;

  const shareToWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToTwitter = () => {
    const text = `🎃 T99 HALLOWEEN - "${candidate.costumeName}" está arrasando na votação com ${candidate.votes} votos! Confira:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const downloadFlyerCard = () => {
    setIsGeneratingFlyer(true);
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGeneratingFlyer(false);
      return;
    }

    // Background gothic dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1100);
    grad.addColorStop(0, '#130924');
    grad.addColorStop(0.5, '#090412');
    grad.addColorStop(1, '#180709');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 1100);

    // Decorative Halloween border
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, 840, 1040);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 820, 1020);

    // Top Title
    ctx.fillStyle = '#ff7b00';
    ctx.font = 'bold 54px Creepster, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎃 T99 HALLOWEEN 🎃', 450, 110);

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('VOTAÇÃO DA MELHOR FANTASIA', 450, 155);

    // Winner Rank Badge
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`🏆 DESTAQUE #${rank} NO RANKING 🏆`, 450, 195);

    // Draw Candidate Image
    const photoUrl = candidate.photos && candidate.photos.length > 0 ? candidate.photos[0] : '';
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const finishCanvas = () => {
      // Costume Name
      ctx.fillStyle = '#ffedd5';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(candidate.costumeName, 450, 850);

      // Participant Name
      ctx.fillStyle = '#fb923c';
      ctx.font = '28px sans-serif';
      ctx.fillText(`Participante: ${candidate.name}`, 450, 895);

      // Votes Count Box
      ctx.fillStyle = '#220b38';
      ctx.beginPath();
      ctx.roundRect(250, 930, 400, 70, 20);
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(`🔥 ${candidate.votes} VOTOS`, 450, 977);

      // Footer
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.fillText('Regra: 1 Voto Único por Computador • Acesse e vote!', 450, 1035);

      // Trigger download
      const a = document.createElement('a');
      a.download = `t99-halloween-${candidate.costumeName.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setIsGeneratingFlyer(false);
    };

    if (photoUrl) {
      img.onload = () => {
        // Draw photo in rounded rect area
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(100, 220, 700, 570, 24);
        ctx.clip();
        ctx.drawImage(img, 100, 220, 700, 570);
        ctx.restore();

        // Border around photo
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(100, 220, 700, 570, 24);
        ctx.stroke();

        finishCanvas();
      };
      img.onerror = () => {
        finishCanvas();
      };
      img.src = photoUrl;
    } else {
      finishCanvas();
    }
  };

  const mainPhoto = candidate.photos && candidate.photos.length > 0 ? candidate.photos[0] : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-black/95 border-2 border-orange-500/50 rounded-3xl overflow-hidden shadow-2xl glow-orange"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orange-500/20 bg-black/40">
          <div className="flex items-center gap-2 text-orange-400">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-cinzel font-bold text-base text-white">
              Compartilhar Vencedor nas Redes
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-black/60 border border-orange-500/30 flex items-center gap-4">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={candidate.costumeName}
                className="w-20 h-20 rounded-xl object-cover border border-orange-500/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-purple-950 flex items-center justify-center text-3xl">
                🎃
              </div>
            )}
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Posição #{rank} no Concurso</span>
              </span>
              <h4 className="font-cinzel font-bold text-lg text-white line-clamp-1">
                {candidate.costumeName}
              </h4>
              <p className="text-xs text-gray-300">Por: {candidate.name}</p>
              <span className="text-xs font-mono font-bold text-orange-400 mt-1 inline-block">
                🔥 {candidate.votes} {candidate.votes === 1 ? 'voto' : 'votos'}
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={shareToWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar no WhatsApp</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={shareToTwitter}
                className="py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Postar no X / Twitter</span>
              </button>

              <button
                onClick={shareToFacebook}
                className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Postar no Facebook</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Texto e Link Copiados com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-orange-400" />
                  <span>Copiar Link de Votação</span>
                </>
              )}
            </button>

            <button
              onClick={downloadFlyerCard}
              disabled={isGeneratingFlyer}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-cinzel font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingFlyer ? 'Gerando Card Amaldiçoado...' : 'Baixar Card / Flyer do Campeão'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
