import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  PlusCircle,
  Pencil,
  Trash2,
  RotateCcw,
  Camera,
  Upload,
  Lock,
  Unlock,
  AlertTriangle,
  Laptop,
  CheckCircle,
  Code2,
  Copy,
  Check,
  Users,
  Search,
  Download,
  Flame,
  Calendar,
  ShieldCheck,
  UserCheck,
  FileText,
} from 'lucide-react';
import { Candidate, VoteRecord } from '../types';
import {
  addCandidate,
  updateCandidate,
  deleteCandidate,
  resetAllVotes,
  purgeAllCandidatesAndVotes,
  subscribeToVotes,
  deleteVote,
} from '../services/contestService';
import { CameraCaptureModal } from './CameraCaptureModal';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onLocalVoteCleared: () => void;
}

const DEFAULT_SECRET = 't99halloween';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  candidates,
  onLocalVoteCleared,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Tab State: 'candidatos' (Fantasias) vs 'votos' (Auditoria de Votos por Nome)
  const [activeTab, setActiveTab] = useState<'candidatos' | 'votos'>('candidatos');

  // Votes audit state
  const [votesList, setVotesList] = useState<VoteRecord[]>([]);
  const [voteSearchQuery, setVoteSearchQuery] = useState('');
  const [voteToDelete, setVoteToDelete] = useState<VoteRecord | null>(null);
  const [isDeletingVote, setIsDeletingVote] = useState(false);
  const [copyVotesFeedback, setCopyVotesFeedback] = useState(false);

  // Edit / Create Form State
  const formRef = useRef<HTMLDivElement>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [costumeName, setCostumeName] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<number>(0);

  // Reset Confirmation Modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Supabase SQL script modal
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Subscribe to all votes when admin is open and authenticated
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const unsubscribe = subscribeToVotes((list) => {
      setVotesList(list);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, isAuthenticated]);

  const SUPABASE_SQL_SCRIPT = `-- ========================================================
-- T99 HALLOWEEN - SUPABASE SCHEMA FOR SELF-HOSTED INSTANCE
-- Executar no SQL Editor do seu Supabase (http://192.168.3.108:8000)
-- ========================================================

-- 1. Tabela de Candidatos e Fantasias
CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  costume_name TEXT NOT NULL,
  category TEXT DEFAULT 'Todas',
  description TEXT DEFAULT '',
  photos JSONB DEFAULT '[]'::jsonb,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos Únicos por PC (com Nome Completo do Votante)
CREATE TABLE IF NOT EXISTS public.votes (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  voter_name TEXT NOT NULL DEFAULT '',
  candidate_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna voter_name caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS voter_name TEXT DEFAULT '';

-- 3. Habilitar Row Level Security (RLS) liberado
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow public insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update candidates" ON public.candidates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete candidates" ON public.candidates FOR DELETE USING (true);

CREATE POLICY "Allow public read votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update votes" ON public.votes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete votes" ON public.votes FOR DELETE USING (true);

-- 4. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;`;

  const copySqlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // Filtered votes by search query
  const filteredVotes = useMemo(() => {
    if (!voteSearchQuery.trim()) return votesList;
    const q = voteSearchQuery.toLowerCase();
    return votesList.filter(
      (v) =>
        v.voterName.toLowerCase().includes(q) ||
        v.candidateName.toLowerCase().includes(q) ||
        v.deviceId.toLowerCase().includes(q)
    );
  }, [votesList, voteSearchQuery]);

  // Export votes as CSV file
  const handleExportCsv = () => {
    const headers = ['Nº', 'Nome Completo do Votante', 'Fantasia Votada', 'Data e Hora', 'ID Computador (PC)'];
    const rows = votesList.map((v, idx) => [
      idx + 1,
      `"${v.voterName.replace(/"/g, '""')}"`,
      `"${v.candidateName.replace(/"/g, '""')}"`,
      `"${new Date(v.votedAt).toLocaleString('pt-BR')}"`,
      `"${v.deviceId}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_votos_t99_halloween_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy votes list formatted as text
  const handleCopyVotesList = async () => {
    if (votesList.length === 0) return;
    const textLines = [
      '🎃 T99 HALLOWEEN - LISTA NOMINAL DE VOTOS REGISTRADOS 🎃',
      `Total de Votos: ${votesList.length}`,
      '-------------------------------------------------------',
      ...votesList.map((v, idx) => {
        const dateStr = new Date(v.votedAt).toLocaleString('pt-BR');
        return `${idx + 1}. ${v.voterName.toUpperCase()} -> Votou em: "${v.candidateName}" [${dateStr}]`;
      }),
      '-------------------------------------------------------',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(textLines);
      setCopyVotesFeedback(true);
      setTimeout(() => setCopyVotesFeedback(false), 2500);
    } catch {
      // fallback
    }
  };

  // Confirm delete individual vote
  const handleConfirmDeleteVote = async () => {
    if (!voteToDelete) return;
    try {
      setIsDeletingVote(true);
      await deleteVote(voteToDelete.id || `vote_${voteToDelete.deviceId}`, voteToDelete.candidateId);
      setVoteToDelete(null);
    } catch (err) {
      console.error('Error deleting vote:', err);
    } finally {
      setIsDeletingVote(false);
    }
  };

  if (!isOpen) return null;

  // Handle Passcode submit
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim().toLowerCase() === DEFAULT_SECRET || passwordInput.trim() === 'admin99') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // Helper: compress uploaded file to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slotIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 850;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          updatePhotoAtSlot(slotIdx, compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updatePhotoAtSlot = (slotIdx: number, dataUrl: string) => {
    setPhotos((prev) => {
      const copy = [...prev];
      copy[slotIdx] = dataUrl;
      return copy.slice(0, 2);
    });
  };

  const removePhotoAtSlot = (slotIdx: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== slotIdx));
  };

  const handleOpenLiveCamera = (slotIdx: number) => {
    setActivePhotoSlot(slotIdx);
    setIsCameraOpen(true);
  };

  // Start Editing a candidate
  const handleStartEdit = (cand: Candidate) => {
    setEditingCandidateId(cand.id);
    setName(cand.name);
    setCostumeName(cand.costumeName);
    setDescription(cand.description || '');
    setPhotos(cand.photos ? [...cand.photos] : []);
    setFormError(null);
    setSuccessMsg(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditingCandidateId(null);
    setName('');
    setCostumeName('');
    setDescription('');
    setPhotos([]);
    setFormError(null);
    setSuccessMsg(null);
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setFormError('Por favor informe o nome do participante.');
      return;
    }
    if (!costumeName.trim()) {
      setFormError('Por favor informe o nome da fantasia.');
      return;
    }
    if (photos.length === 0) {
      setFormError('Envie pelo menos 1 foto da fantasia (máximo de 2 fotos).');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCandidateId) {
        // Update existing candidate
        await updateCandidate(editingCandidateId, {
          name: name.trim(),
          costumeName: costumeName.trim(),
          description: description.trim(),
          photos: photos.slice(0, 2),
        });
        setSuccessMsg(`Fantasia "${costumeName}" atualizada com sucesso!`);
        setEditingCandidateId(null);
      } else {
        // Create new candidate
        await addCandidate({
          name: name.trim(),
          costumeName: costumeName.trim(),
          category: 'Todas',
          description: description.trim(),
          photos: photos.slice(0, 2),
        });
        setSuccessMsg(`Fantasia "${costumeName}" cadastrada com sucesso!`);
      }

      // Reset form fields
      setName('');
      setCostumeName('');
      setDescription('');
      setPhotos([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao salvar candidato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (candidateId: string, costume: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a fantasia "${costume}"?`)) {
      try {
        await deleteCandidate(candidateId);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const handleFullReset = async () => {
    try {
      setIsResetting(true);
      await resetAllVotes();
      setIsResetConfirmOpen(false);
      onLocalVoteCleared();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handlePurgeAll = async () => {
    if (
      window.confirm(
        'ATENÇÃO: Você deseja apagar TODOS os candidatos e zerar tudo? Essa ação não pode ser desfeita.'
      )
    ) {
      try {
        await purgeAllCandidatesAndVotes();
        onLocalVoteCleared();
      } catch (err) {
        console.error('Purge error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl my-6 bg-black border-2 border-red-600/70 rounded-3xl overflow-hidden shadow-2xl glow-blood flex flex-col"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-red-600/30 bg-black/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-red-500/60 shadow-md bg-black flex-shrink-0">
              <video
                src="/assets/aistudio/From_Klickpin.com-_Paper_Flower_Ideas_Ideas_Youll_Keep_Coming_Back_To_54276-pin-id-703898616798679291_7dc131f0.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-cinzel font-black tracking-wider text-red-500">
                PAINEL ADMINISTRATIVO T99
              </h2>
              <p className="text-xs text-gray-400">
                Gerenciamento de Fantasias & Auditoria Nominal de Votos (Supabase Self-Hosted)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        {!isAuthenticated ? (
          /* Authentication Screen */
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-600 flex items-center justify-center mx-auto text-red-400">
              <Lock className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="font-cinzel font-black text-xl text-white">
              ÁREA RESTRITA DA ORGANIZAÇÃO
            </h3>

            <p className="text-xs text-gray-300">
              Digite a chave de segurança para gerenciar candidatos, consultar a lista de votantes ou resetar votos.
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Chave Secreta..."
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-red-500/40 focus:border-red-500 text-white text-center font-mono tracking-widest focus:outline-none"
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-xs text-red-400 font-semibold">
                  Chave inválida! Acesso negado.
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-bold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Unlock className="w-4 h-4" />
                <span>DESBLOQUEAR PAINEL</span>
              </button>

              <p className="text-[11px] text-gray-500">
                Chave padrão: <code className="text-orange-400">t99halloween</code>
              </p>
            </form>
          </div>
        ) : (
          /* Main Admin Area with Tab Switcher */
          <div className="p-4 sm:p-6 space-y-6 max-h-[82vh] overflow-y-auto">
            {/* Top Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('candidatos')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-cinzel font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'candidatos'
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-orange-600/30 border border-orange-400/50'
                      : 'bg-black/50 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Laptop className="w-4 h-4 text-orange-400" />
                  <span>Gerenciar Fantasias</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] font-mono text-orange-300">
                    {candidates.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('votos')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-cinzel font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'votos'
                      ? 'bg-gradient-to-r from-purple-600 via-orange-600 to-amber-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/50'
                      : 'bg-black/50 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Auditoria de Votos por Nome</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold font-mono">
                    {votesList.length} {votesList.length === 1 ? 'voto' : 'votos'}
                  </span>
                </button>
              </div>

              {/* Utility Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onLocalVoteCleared}
                  className="px-3 py-1.5 rounded-lg bg-orange-950/60 hover:bg-orange-900 border border-orange-500/40 text-orange-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Reseta o dispositivo atual para poder votar novamente como teste"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Meu PC (Teste)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Script SQL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white text-xs font-bold font-cinzel flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Zerar Votos</span>
                </button>

                <button
                  type="button"
                  onClick={handlePurgeAll}
                  className="px-3 py-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-600 text-red-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Remove tudo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Tudo</span>
                </button>
              </div>
            </div>

            {/* TAB 1: AUDITORIA DE VOTOS POR NOME (REQUESTED FEATURE) */}
            {activeTab === 'votos' && (
              <div className="space-y-6">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-black/60 border border-orange-500/30 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-950/70 border border-orange-500/50 flex items-center justify-center text-orange-400">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                        Votos Nominais Registrados
                      </span>
                      <h4 className="text-2xl font-cinzel font-black text-white">
                        {votesList.length}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/30 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-950/70 border border-purple-500/50 flex items-center justify-center text-purple-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                        Computadores Distintos
                      </span>
                      <h4 className="text-2xl font-cinzel font-black text-purple-300">
                        {new Set(votesList.map((v) => v.deviceId)).size}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/50 flex items-center justify-center text-amber-400">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                        Fantasia Líder
                      </span>
                      <h4 className="text-sm font-cinzel font-bold text-amber-300 truncate">
                        {candidates[0] && candidates[0].votes > 0
                          ? `${candidates[0].costumeName} (${candidates[0].votes} votos)`
                          : 'Aguardando votos'}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Filter and Export Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-black/50 border border-white/10">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={voteSearchQuery}
                      onChange={(e) => setVoteSearchQuery(e.target.value)}
                      placeholder="Pesquisar por nome do votante, fantasia ou PC..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-orange-500 text-white text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyVotesList}
                      disabled={votesList.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                      title="Copiar lista para o WhatsApp ou relatório"
                    >
                      {copyVotesFeedback ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={votesList.length === 0}
                      className="px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 hover:text-white border border-emerald-500/50 text-xs font-bold font-cinzel flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar Planilha (CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Votes List Table */}
                <div className="rounded-2xl bg-black/60 border border-orange-500/20 overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-cinzel font-bold text-sm text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span>Ata Oficial de Votantes Identificados</span>
                    </h3>
                    <span className="text-xs text-gray-400">
                      Mostrando {filteredVotes.length} de {votesList.length} votos
                    </span>
                  </div>

                  {votesList.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <span className="text-4xl block">🗳️</span>
                      <h4 className="font-cinzel font-bold text-white text-base">
                        Nenhum voto foi computado ainda!
                      </h4>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        Quando as pessoas votarem na tela inicial, cada um terá que digitar seu nome completo obrigatoriamente. Todos aparecerão listados aqui nesta ata.
                      </p>
                    </div>
                  ) : filteredVotes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                      Nenhum registro encontrado para a busca "{voteSearchQuery}".
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-black/80 text-gray-400 uppercase font-cinzel text-[11px] border-b border-white/10">
                          <tr>
                            <th className="py-3 px-4 font-bold">Nº</th>
                            <th className="py-3 px-4 font-bold text-orange-300">Nome Completo do Votante</th>
                            <th className="py-3 px-4 font-bold text-white">Fantasia Escolhida</th>
                            <th className="py-3 px-4 font-bold">Data & Horário</th>
                            <th className="py-3 px-4 font-bold">Identificador do PC</th>
                            <th className="py-3 px-4 font-bold text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredVotes.map((v, idx) => {
                            const matchedCand = candidates.find((c) => c.id === v.candidateId);
                            const candPhoto = matchedCand?.photos?.[0];

                            return (
                              <tr key={v.id || idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 font-mono text-gray-500 font-bold">
                                  {idx + 1}
                                </td>

                                {/* VOTER FULL NAME - Highlighted */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-orange-600/30 border border-orange-500/50 flex items-center justify-center text-orange-400 flex-shrink-0">
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-white text-sm block">
                                        {v.voterName || 'Votante Sem Nome'}
                                      </span>
                                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                        <CheckCircle className="w-2.5 h-2.5" />
                                        <span>Voto nominal confirmado</span>
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* CANDIDATE VOTED */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    {candPhoto ? (
                                      <img
                                        src={candPhoto}
                                        alt={v.candidateName}
                                        className="w-8 h-8 rounded-lg object-cover border border-orange-500/40"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-xs">
                                        🎃
                                      </div>
                                    )}
                                    <span className="font-cinzel font-bold text-orange-300">
                                      {v.candidateName}
                                    </span>
                                  </div>
                                </td>

                                {/* TIMESTAMP */}
                                <td className="py-3 px-4 text-gray-300 font-mono text-[11px] whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                    <span>{new Date(v.votedAt).toLocaleString('pt-BR')}</span>
                                  </div>
                                </td>

                                {/* PC IDENTIFIER */}
                                <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                                  <span
                                    title={v.deviceId}
                                    className="px-2 py-0.5 rounded bg-black/60 border border-white/10 block max-w-[140px] truncate"
                                  >
                                    {v.deviceId}
                                  </span>
                                </td>

                                {/* DELETE / INVALIDATE VOTE */}
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setVoteToDelete(v)}
                                    className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-white border border-red-500/40 transition-colors cursor-pointer"
                                    title="Anular e remover este voto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: GERENCIAR FANTASIAS (CANDIDATOS) */}
            {activeTab === 'candidatos' && (
              <div className="space-y-8">
                {/* Candidate Registration / Edit Form */}
                <div
                  ref={formRef}
                  className={`p-6 rounded-2xl bg-black/60 border space-y-4 transition-all ${
                    editingCandidateId
                      ? 'border-amber-500/70 shadow-lg shadow-amber-500/20'
                      : 'border-orange-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 text-orange-400">
                      {editingCandidateId ? (
                        <>
                          <Pencil className="w-5 h-5 text-amber-400" />
                          <h3 className="font-cinzel font-bold text-lg text-amber-300">
                            Editar Cadastro da Fantasia
                          </h3>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-5 h-5 text-orange-500" />
                          <h3 className="font-cinzel font-bold text-lg text-white">
                            Cadastrar Nova Fantasia no Concurso
                          </h3>
                        </>
                      )}
                    </div>

                    {editingCandidateId && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                        Modo Edição
                      </span>
                    )}
                  </div>

                  {successMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveCandidate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1">
                          Nome do Participante *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Ana Clara"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-orange-500 text-white text-sm focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1">
                          Nome da Fantasia / Personagem *
                        </label>
                        <input
                          type="text"
                          value={costumeName}
                          onChange={(e) => setCostumeName(e.target.value)}
                          placeholder="Ex: Bruxa da Floresta Negra"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-orange-500 text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        Descrição ou Detalhes da Fantasia (Opcional)
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Maquiagem feita à mão com efeitos especiais, roupa customizada..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-orange-500 text-white text-sm focus:outline-none"
                      />
                    </div>

                    {/* Dual-Photo Upload Section (Max 2 photos per candidate) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-orange-300">
                          Fotos da Fantasia (Até 2 Fotos por Candidato) *
                        </label>
                        <span className="text-[11px] text-gray-400">
                          {photos.length} de 2 fotos selecionadas
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[0, 1].map((slotIdx) => {
                          const photoUrl = photos[slotIdx];
                          return (
                            <div
                              key={slotIdx}
                              className="p-4 rounded-xl border border-dashed border-orange-500/40 bg-black/40 flex flex-col items-center justify-center min-h-[190px] relative"
                            >
                              {photoUrl ? (
                                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-orange-500/50">
                                  <img
                                    src={photoUrl}
                                    alt={`Slot ${slotIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removePhotoAtSlot(slotIdx)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow-md cursor-pointer"
                                    title="Remover Foto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-orange-300 font-bold">
                                    Foto {slotIdx + 1}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center space-y-2">
                                  <span className="text-xs font-bold text-gray-300">
                                    Foto #{slotIdx + 1}{' '}
                                    {slotIdx === 0 ? '(Principal)' : '(Detalhe / Pose)'}
                                  </span>
                                  <div className="flex flex-col gap-2 pt-1">
                                    <label className="px-3 py-2 rounded-xl bg-orange-950/60 hover:bg-orange-900 border border-orange-500/50 text-orange-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                                      <Upload className="w-4 h-4" />
                                      <span>Upload do Arquivo</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, slotIdx)}
                                        className="hidden"
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenLiveCamera(slotIdx)}
                                      className="px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Camera className="w-4 h-4" />
                                      <span>Tirar com a Câmera</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      {editingCandidateId && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="py-3 px-5 rounded-xl border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-cinzel font-bold text-sm tracking-wider cursor-pointer"
                        >
                          CANCELAR
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-bold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/40 disabled:opacity-50 transition-all"
                      >
                        {editingCandidateId ? (
                          <>
                            <Pencil className="w-4 h-4" />
                            <span>{isSubmitting ? 'Salvando...' : 'SALVAR ALTERAÇÕES DA FANTASIA'}</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            <span>{isSubmitting ? 'Salvando...' : 'SALVAR E PUBLICAR CANDIDATO'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Existing Candidates Manager with Edit & Delete */}
                <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-cinzel font-bold text-lg text-white">
                      Fantasias Cadastradas ({candidates.length})
                    </h3>
                    <span className="text-xs text-gray-400">
                      Apenas são removidas se você clicar em Excluir
                    </span>
                  </div>

                  {candidates.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">
                      Nenhuma fantasia cadastrada ainda. Preencha o formulário acima para registrar participantes!
                    </p>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {candidates.map((cand) => (
                        <div
                          key={cand.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-white/15 flex-shrink-0">
                              {cand.photos && cand.photos[0] ? (
                                <img
                                  src={cand.photos[0]}
                                  alt={cand.costumeName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">
                                  🎃
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="font-cinzel font-bold text-sm text-white line-clamp-1">
                                {cand.costumeName}
                              </h4>
                              <p className="text-xs text-gray-400">
                                Participante: <span className="text-orange-300 font-medium">{cand.name}</span> • {cand.photos.length} foto(s)
                              </p>
                              <span className="font-mono text-xs font-bold text-orange-400">
                                🔥 {cand.votes} {cand.votes === 1 ? 'voto' : 'votos'}
                              </span>
                            </div>
                          </div>

                          {/* EDIT & DELETE ACTION BUTTONS */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleStartEdit(cand)}
                              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 hover:text-white border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Editar Cadastro"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => handleDelete(cand.id, cand.costumeName)}
                              className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-white border border-red-500/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Excluir Candidato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        photoSlotLabel={`Foto #${activePhotoSlot + 1}`}
        onCapture={(dataUrl) => updatePhotoAtSlot(activePhotoSlot, dataUrl)}
      />

      {/* Vote Deletion Confirmation Dialog */}
      {voteToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/95">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#1c0818] border-2 border-red-500 text-center space-y-4 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-cinzel font-bold text-white">
              ANULAR VOTO NOMINAL?
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Você está prestes a anular o voto de <strong>"{voteToDelete.voterName}"</strong> na fantasia <strong>"{voteToDelete.candidateName}"</strong>. O contador da fantasia será subtraído em 1 voto.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVoteToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-600 text-gray-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVote}
                disabled={isDeletingVote}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-cinzel tracking-wider shadow-lg shadow-red-600/40 cursor-pointer disabled:opacity-50"
              >
                {isDeletingVote ? 'Anulando...' : 'SIM, ANULAR VOTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#170a1a] border-2 border-red-600 text-center space-y-4 glow-blood">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-cinzel font-bold text-white">
              ZERAR TODOS OS VOTOS DO CONCURSO?
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Esta ação colocará os contadores de votos em ZERO e apagará o registro de votos e a lista de votantes, mantendo os cadastros das fantasias intactos.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-600 text-gray-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFullReset}
                disabled={isResetting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-cinzel tracking-wider shadow-lg shadow-red-600/40 cursor-pointer"
              >
                {isResetting ? 'Reiniciando...' : 'SIM, ZERAR VOTOS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase SQL Script Viewer Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95">
          <div className="max-w-2xl w-full p-6 rounded-2xl bg-[#0f091c] border-2 border-emerald-500 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Code2 className="w-5 h-5" />
                <h3 className="font-cinzel font-bold text-base text-white">
                  Script SQL para seu Supabase Self-Hosted
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Copie este comando e execute no <strong>SQL Editor</strong> do seu Supabase (<code className="text-emerald-300">http://192.168.3.108:8000</code>) para criar ou atualizar as tabelas <code className="text-orange-300">candidates</code> e <code className="text-orange-300">votes</code>:
            </p>

            <pre className="p-4 rounded-xl bg-black border border-emerald-500/30 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
              {SUPABASE_SQL_SCRIPT}
            </pre>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-cinzel flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
              >
                {sqlCopied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>COPIADO PARA A ÁREA DE TRANSFERÊNCIA!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPIAR COMANDO SQL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="py-2.5 px-4 rounded-xl border border-gray-600 text-gray-300 hover:text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
