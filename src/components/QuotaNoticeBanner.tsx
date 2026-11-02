import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, X, RefreshCw } from 'lucide-react';

interface QuotaNoticeBannerProps {
  onDismiss?: () => void;
}

export const QuotaNoticeBanner: React.FC<QuotaNoticeBannerProps> = ({ onDismiss }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    if (onDismiss) onDismiss();
  };

  const consoleUrl =
    'https://console.firebase.google.com/project/regal-pixel-c6pck/firestore/databases/ai-studio-6c5bdde6-075e-4799-b40a-f917f079582c/data?openUpgradeDialog=true';

  return (
    <div className="relative z-30 bg-gradient-to-r from-red-950/90 via-amber-950/90 to-purple-950/90 border-b border-amber-500/50 p-3 sm:p-4 text-xs sm:text-sm text-amber-200 shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="font-cinzel font-bold text-amber-300">
              Limite de Cota Gratuita do Firebase Firestore Atingido (Quota Exceeded)
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">
              O limite de leituras diárias gratuitas do Firestore foi atingido neste projeto. A cota será renovada automaticamente amanhã à meia-noite pelo Firebase. O aplicativo ativou o <strong>modo de persistência local</strong> para que você continue visualizando, cadastrando e navegando pelas fantasias sem interrupções!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
          <a
            href={consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Ver no Console Firebase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://firebase.google.com/pricing#cloud-firestore"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs transition-colors hidden lg:flex items-center gap-1"
          >
            <span>Preços & Cotas</span>
          </a>

          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
