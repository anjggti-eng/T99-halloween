import React, { useState } from 'react';
import { Server, CheckCircle, X, Code2, UploadCloud, Loader2 } from 'lucide-react';
import { SUPABASE_URL } from '../supabase/config';
import { uploadCandidatesToSupabase } from '../services/contestService';

interface DatabaseStatusBarProps {
  onOpenSqlHelper?: () => void;
  onUploadSuccess?: () => void;
}

export const DatabaseStatusBar: React.FC<DatabaseStatusBarProps> = ({
  onOpenSqlHelper,
  onUploadSuccess,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleQuickUpload = async () => {
    try {
      setIsUploading(true);
      setUploadStatus(null);
      const res = await uploadCandidatesToSupabase();
      if (res.success) {
        setUploadStatus(`Sucesso! ${res.count} fantasias enviadas ao Supabase.`);
        if (onUploadSuccess) onUploadSuccess();
      } else {
        const isMixed = String(res.error).includes('Failed to fetch');
        setUploadStatus(
          isMixed
            ? 'Navegador bloqueou HTTPS -> HTTP. Abrindo Script SQL!'
            : `Aviso: ${res.error}`
        );
        if (isMixed && onOpenSqlHelper) {
          onOpenSqlHelper();
        }
      }
    } catch {
      setUploadStatus('Navegador bloqueou requisição local. Abrindo Script SQL!');
      if (onOpenSqlHelper) onOpenSqlHelper();
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadStatus(null), 7000);
    }
  };

  if (isDismissed) return null;

  return (
    <div className="relative z-30 bg-black/95 border-b border-emerald-500/30 px-3 sm:px-4 py-2 text-xs text-emerald-200 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center md:text-left">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
          <Server className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            Banco de Dados: <strong>Supabase</strong> (<code className="text-emerald-300 font-mono text-[11px]">{SUPABASE_URL}</code>)
          </span>
          {uploadStatus && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400/60 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 animate-pulse">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              {uploadStatus}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Quick Upload Button */}
          <button
            onClick={handleQuickUpload}
            disabled={isUploading}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-emerald-700/40 transition-all cursor-pointer disabled:opacity-50"
            title="Upload das 14 fantasias oficiais para o Supabase (ou gera o Script SQL se houver bloqueio HTTPS)"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Subindo ao Supabase...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>SUBIR NO SUPABASE (14 Fantasias)</span>
              </>
            )}
          </button>

          {onOpenSqlHelper && (
            <button
              onClick={onOpenSqlHelper}
              className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Visualizar ou copiar scripts SQL para executar no Supabase Studio"
            >
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span>Ver SQL (14 Fantasias)</span>
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-gray-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Fechar barra"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
