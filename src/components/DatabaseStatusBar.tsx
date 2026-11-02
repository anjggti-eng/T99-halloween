import React, { useState } from 'react';
import { Database, Server, CheckCircle, ExternalLink, X, Code2 } from 'lucide-react';
import { SUPABASE_URL } from '../supabase/config';

interface DatabaseStatusBarProps {
  onOpenSqlHelper?: () => void;
}

export const DatabaseStatusBar: React.FC<DatabaseStatusBarProps> = ({ onOpenSqlHelper }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="relative z-30 bg-black/90 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-200 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Banco de Dados: <strong>Supabase Self-Hosted</strong> (<code className="text-emerald-300 font-mono text-[11px]">{SUPABASE_URL}</code>)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onOpenSqlHelper && (
            <button
              onClick={onOpenSqlHelper}
              className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              <span>Ver SQL das Tabelas</span>
            </button>
          )}

          <span className="text-[10px] text-gray-400 hidden md:inline">
            Acesso ilimitado sem limite de cotas
          </span>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
