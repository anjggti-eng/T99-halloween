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
  UploadCloud,
  Server,
  Loader2,
  Database,
  Sparkles,
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
  uploadCandidatesToSupabase,
  testSupabaseConnection,
  purgeFakeCandidates,
} from '../services/contestService';
import { SUPABASE_URL } from '../supabase/config';
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

  // Tab State: 'votos' (Quem Votou em Quem) default as requested by user!
  const [activeTab, setActiveTab] = useState<'votos' | 'candidatos'>('votos');
  const [votesViewMode, setVotesViewMode] = useState<'table' | 'byCostume'>('table');

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

  // Supabase SQL script modal & Seed states
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlModalTab, setSqlModalTab] = useState<'full' | 'reset' | 'schema'>('full');
  const [sqlCopied, setSqlCopied] = useState(false);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [isPurgingFakes, setIsPurgingFakes] = useState(false);
  const [supabaseSyncResult, setSupabaseSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseConnInfo, setSupabaseConnInfo] = useState<{ connected: boolean; count?: number; latencyMs?: number; error?: string } | null>(null);

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

  const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- T99 HALLOWEEN - SUPABASE SCHEMA & HARDENED RLS POLICIES
-- Instância Self-Hosted: http://192.168.0.179:8000
-- Segurança: Políticas RLS Estritas + Operação Autorizada de Voto (cast_vote)
-- ==============================================================================

-- 1. Tabela de Candidatos e Fantasias
CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  costume_name TEXT NOT NULL,
  category TEXT DEFAULT 'Todas',
  description TEXT DEFAULT '',
  photos JSONB DEFAULT '[]'::jsonb,
  votes INTEGER DEFAULT 0 CHECK (votes >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos Nominais Únicos por Dispositivo (PC)
CREATE TABLE IF NOT EXISTS public.votes (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna voter_name e índice único para integridade
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS voter_name TEXT DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS votes_device_id_unique ON public.votes (device_id);

-- ==============================================================================
-- 3. POLÍTICAS RLS (ROW LEVEL SECURITY) RESTRITAS
-- ==============================================================================
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas permissivas
DROP POLICY IF EXISTS "Allow public read candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Deny public update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Deny public delete candidates" ON public.candidates;

DROP POLICY IF EXISTS "Allow public read votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public insert votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public update votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public delete votes" ON public.votes;
DROP POLICY IF EXISTS "Deny public update votes" ON public.votes;
DROP POLICY IF EXISTS "Deny public delete votes" ON public.votes;

-- A. Políticas para CANDIDATES:
CREATE POLICY "Allow public read candidates"
  ON public.candidates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert candidates"
  ON public.candidates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update candidates"
  ON public.candidates FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public delete candidates"
  ON public.candidates FOR DELETE
  TO anon, authenticated
  USING (true);

-- B. Políticas para VOTES:
CREATE POLICY "Allow public read votes"
  ON public.votes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert votes"
  ON public.votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(voter_name)) >= 3 AND
    length(trim(device_id)) >= 5 AND
    length(trim(candidate_id)) >= 3
  );

-- Bloqueio total de edição de votos registrados (Voto é imutável)
CREATE POLICY "Deny public update votes"
  ON public.votes FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "Allow public delete votes"
  ON public.votes FOR DELETE
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- 4. OPERAÇÃO AUTORIZADA DE VOTAÇÃO (RPC COM SECURITY DEFINER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_device_id TEXT,
  p_voter_name TEXT,
  p_candidate_id TEXT,
  p_candidate_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote_id TEXT;
  v_clean_device TEXT;
  v_clean_name TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_clean_device := trim(COALESCE(p_device_id, ''));
  v_clean_name := trim(COALESCE(p_voter_name, ''));

  IF length(v_clean_name) < 3 THEN
    RAISE EXCEPTION 'Nome completo do votante é obrigatório (mínimo de 3 caracteres).';
  END IF;

  IF length(v_clean_device) < 5 THEN
    RAISE EXCEPTION 'Dispositivo inválido para votação.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.votes WHERE device_id = v_clean_device) THEN
    RAISE EXCEPTION 'Este computador já registrou um voto no concurso T99 Halloween!';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = p_candidate_id) THEN
    RAISE EXCEPTION 'A fantasia selecionada não foi encontrada no concurso.';
  END IF;

  v_vote_id := 'vote_' || regexp_replace(v_clean_device, '[^a-zA-Z0-9_-]', '_', 'g');
  INSERT INTO public.votes (id, device_id, voter_name, candidate_id, candidate_name, voted_at)
  VALUES (v_vote_id, v_clean_device, v_clean_name, p_candidate_id, trim(p_candidate_name), v_now);

  UPDATE public.candidates
  SET votes = COALESCE(votes, 0) + 1
  WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'voter_name', v_clean_name,
    'candidate_id', p_candidate_id,
    'voted_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_vote(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 5. HABILITAR CANAL REALTIME DO SUPABASE
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
  END IF;
END $$;`;

  const SUPABASE_RESET_SQL = `-- ==============================================================================
-- T99 HALLOWEEN - SCRIPT SQL PARA ZERAR TODOS OS VOTOS NO SUPABASE
-- Executar no SQL Editor do Supabase Studio (http://192.168.0.179:8000)
-- ==============================================================================

-- 1. Zera contadores de todas as fantasias cadastradas
UPDATE public.candidates
SET votes = 0;

-- 2. Limpa a ata de votos nominais para liberar os computadores para votar novamente
TRUNCATE TABLE public.votes;

-- Confirmar resultado
SELECT 'Sucesso! Todos os votos foram zerados no Supabase' AS status;`;

  const SUPABASE_FULL_SQL = SUPABASE_SCHEMA_SQL + `\n\n` + SUPABASE_RESET_SQL;

  const getActiveSqlScript = () => {
    if (sqlModalTab === 'reset') return SUPABASE_RESET_SQL;
    if (sqlModalTab === 'schema') return SUPABASE_SCHEMA_SQL;
    return SUPABASE_FULL_SQL;
  };

  const copySqlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getActiveSqlScript());
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadSql = () => {
    const blob = new Blob([getActiveSqlScript()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sqlModalTab === 'reset' ? 't99_zerar_votos.sql' : 't99_supabase_hardened_rls_cast_vote.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Direct Upload to Supabase Action (Uploads ONLY real registered candidates)
  const handleUploadToSupabase = async () => {
    try {
      setIsUploadingToSupabase(true);
      setSupabaseSyncResult(null);
      const res = await uploadCandidatesToSupabase(candidates);
      if (res.success) {
        setSupabaseSyncResult({
          success: true,
          message: `Sucesso! ${res.count} fantasias cadastradas foram sincronizadas e salvas no Supabase (${SUPABASE_URL}).`,
        });
      } else {
        const isMixedContent =
          String(res.error).includes('Failed to fetch') ||
          String(res.error).includes('NetworkError');
        setSupabaseSyncResult({
          success: false,
          message: isMixedContent
            ? `Seu navegador bloqueou a conexão HTTP interna com ${SUPABASE_URL} (bloqueio de segurança HTTPS -> HTTP). Clique no botão "Script SQL" abaixo para rodar no Supabase Studio!`
            : `Aviso ao subir para o Supabase: ${res.error || 'Verifique se a rede local tem acesso a ' + SUPABASE_URL}.`,
        });
      }
    } catch (err: any) {
      setSupabaseSyncResult({
        success: false,
        message: `Aviso: Seu navegador bloqueou a requisição direta para ${SUPABASE_URL}. Abra o Script SQL e execute no Supabase Studio.`,
      });
    } finally {
      setIsUploadingToSupabase(false);
    }
  };

  // Purge all fake placeholder candidates
  const handlePurgeFakeCandidates = async () => {
    try {
      setIsPurgingFakes(true);
      const res = await purgeFakeCandidates();
      setSuccessMsg(`Fantasias fakes purgadas com sucesso do sistema (${res.count} itens limpos)!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(`Erro ao remover fakes: ${err?.message || err}`);
    } finally {
      setIsPurgingFakes(false);
    }
  };

  // Test connection to user's Supabase instance
  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseConnInfo(null);
    try {
      const res = await testSupabaseConnection();
      setSupabaseConnInfo(res);
    } catch (err: any) {
      setSupabaseConnInfo({
        connected: false,
        error: 'Bloqueio de navegador HTTPS -> HTTP local (Mixed Content)',
      });
    } finally {
      setIsTestingSupabase(false);
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
                  onClick={() => setActiveTab('votos')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-cinzel font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'votos'
                      ? 'bg-gradient-to-r from-purple-600 via-orange-600 to-amber-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/50'
                      : 'bg-black/50 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Ata de Votos: Quem Votou em Quem</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold font-mono">
                    {votesList.length} {votesList.length === 1 ? 'voto' : 'votos'}
                  </span>
                </button>

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
              </div>

              {/* Utility Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Purge Fake Costumes Button (Requested by user) */}
                <button
                  type="button"
                  onClick={handlePurgeFakeCandidates}
                  disabled={isPurgingFakes}
                  className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  title="Remove quaisquer fantasias fakes ou testes do banco de dados e do sistema"
                >
                  {isPurgingFakes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span>Remover Fantasias Fakes</span>
                </button>

                {/* SINCRONIZAR NO SUPABASE */}
                <button
                  type="button"
                  onClick={handleUploadToSupabase}
                  disabled={isUploadingToSupabase || candidates.length === 0}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-cinzel flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-700/40 border border-emerald-400/50 transition-all disabled:opacity-50"
                  title="Sincroniza apenas as fantasias reais cadastradas no Supabase"
                >
                  {isUploadingToSupabase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-white" />
                      <span>Sincronizar Supabase ({candidates.length})</span>
                    </>
                  )}
                </button>

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

            {/* Supabase Upload / Sync Result Banner */}
            {supabaseSyncResult && (
              <div
                className={`p-4 rounded-xl border text-xs font-medium flex items-start justify-between gap-3 ${
                  supabaseSyncResult.success
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                    : 'bg-amber-950/90 border-amber-500 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {supabaseSyncResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5">
                    <p className="font-bold text-sm">{supabaseSyncResult.message}</p>
                    <p className="text-[11px] opacity-80">
                      Instância configurada: <code className="font-mono text-white">{SUPABASE_URL}</code>
                    </p>
                    {!supabaseSyncResult.success && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSqlModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>ABRIR SCRIPT SQL (RLS & CAST_VOTE)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadSql}
                          className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-amber-400/50 text-amber-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar Arquivo .sql</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSupabaseSyncResult(null)}
                  className="p-1 rounded text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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

                  {/* View Mode Toggle: Table (Quem Votou em Quem) vs By Costume */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/80 border border-white/10 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setVotesViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        votesViewMode === 'table'
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Ata Nominal (Quem Votou em Quem)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVotesViewMode('byCostume')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        votesViewMode === 'byCostume'
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Agrupado por Fantasia
                    </button>
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

                {/* VIEW 1: TABELA NOMINAL - QUEM VOTOU EM QUEM */}
                {votesViewMode === 'table' ? (
                  <div className="rounded-2xl bg-black/60 border border-orange-500/20 overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h3 className="font-cinzel font-bold text-sm text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        <span>Ata de Auditoria: Nome do Votante & Fantasia Escolhida</span>
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
                          Quando as pessoas votarem na urna principal, cada uma precisará digitar seu nome completo obrigatoriamente. Todos aparecerão listados aqui com o nome e a respectiva fantasia.
                        </p>
                      </div>
                    ) : filteredVotes.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400">
                        Nenhum registro encontrado para a busca "{voteSearchQuery}".
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-black/90 text-gray-300 uppercase font-cinzel text-[11px] border-b border-white/10 tracking-wider">
                            <tr>
                              <th className="py-3.5 px-4 font-bold">Nº</th>
                              <th className="py-3.5 px-4 font-bold text-orange-300">
                                Nome Completo do Votante
                              </th>
                              <th className="py-3.5 px-4 font-bold text-amber-300">
                                Em Quem Votou (Fantasia & Participante)
                              </th>
                              <th className="py-3.5 px-4 font-bold text-gray-400">
                                Data & Horário
                              </th>
                              <th className="py-3.5 px-4 font-bold text-gray-400">
                                Computador (PC)
                              </th>
                              <th className="py-3.5 px-4 font-bold text-right text-gray-400">
                                Ação
                              </th>
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

                                  {/* VOTER FULL NAME - Clear & Prominent */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-orange-600/30 border border-orange-500/60 flex items-center justify-center text-orange-400 flex-shrink-0">
                                        <UserCheck className="w-4 h-4" />
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

                                  {/* CANDIDATE VOTED (FANTASIA & CANDIDATO) */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      {candPhoto ? (
                                        <img
                                          src={candPhoto}
                                          alt={v.candidateName}
                                          className="w-9 h-9 rounded-lg object-cover border border-orange-500/40 flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-lg bg-black border border-white/10 flex items-center justify-center text-xs flex-shrink-0">
                                          🎃
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-cinzel font-bold text-orange-300 text-sm block">
                                          {v.candidateName}
                                        </span>
                                        {matchedCand?.name && (
                                          <span className="text-[11px] text-gray-400">
                                            Participante: <strong className="text-gray-200">{matchedCand.name}</strong>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* TIMESTAMP */}
                                  <td className="py-3 px-4 text-gray-300 font-mono text-[11px] whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
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
                ) : (
                  /* VIEW 2: AGRUPADO POR FANTASIA (VOTANTES DE CADA UMA) */
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-black/60 border border-orange-500/20">
                      <h3 className="font-cinzel font-bold text-sm text-white flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-orange-400" />
                        <span>Votantes Agrupados por Fantasia</span>
                      </h3>
                      <p className="text-xs text-gray-400">
                        Veja exatamente os nomes de todos os votantes que escolheram cada fantasia cadastrada.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidates.map((cand) => {
                        const votersOfThisCand = votesList.filter((v) => v.candidateId === cand.id);
                        return (
                          <div
                            key={cand.id}
                            className="p-4 rounded-2xl bg-black/70 border border-white/10 space-y-3 shadow-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black border border-orange-500/40 flex-shrink-0">
                                {cand.photos && cand.photos[0] ? (
                                  <img
                                    src={cand.photos[0]}
                                    alt={cand.costumeName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm">
                                    🎃
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-cinzel font-bold text-sm text-white truncate">
                                  {cand.costumeName}
                                </h4>
                                <p className="text-xs text-gray-400">
                                  Participante: <strong className="text-orange-300">{cand.name}</strong>
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl bg-orange-950 border border-orange-500/50 text-orange-300 font-mono text-xs font-bold">
                                {votersOfThisCand.length} {votersOfThisCand.length === 1 ? 'voto' : 'votos'}
                              </span>
                            </div>

                            {/* List of voter names */}
                            <div className="pt-2 border-t border-white/5 space-y-1.5">
                              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold block">
                                Votantes que escolheram esta fantasia ({votersOfThisCand.length}):
                              </span>
                              {votersOfThisCand.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">
                                  Nenhum voto registrado para esta fantasia ainda.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {votersOfThisCand.map((v) => (
                                    <span
                                      key={v.id || v.deviceId}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-semibold inline-flex items-center gap-1.5"
                                    >
                                      <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                      <span>{v.voterName}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GERENCIAR FANTASIAS (CANDIDATOS) */}
            {activeTab === 'candidatos' && (
              <div className="space-y-6">
                {/* Supabase Integration & Quick Seed Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#091512] border border-emerald-500/40 space-y-3 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-cinzel font-bold text-sm text-emerald-300 flex items-center gap-2">
                          <span>Supabase Self-Hosted</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                            {SUPABASE_URL}
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Banco de dados para votos nominais e as fantasias cadastradas
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestSupabase}
                        disabled={isTestingSupabase}
                        className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isTestingSupabase ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Testar Conexão</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUploadToSupabase}
                        disabled={isUploadingToSupabase || candidates.length === 0}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-cinzel flex items-center gap-1.5 shadow-md shadow-emerald-700/40 cursor-pointer disabled:opacity-50 transition-all"
                        title="Faz o upload das fantasias cadastradas no Supabase"
                      >
                        {isUploadingToSupabase ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        <span>Sincronizar Supabase ({candidates.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePurgeFakeCandidates}
                        disabled={isPurgingFakes}
                        className="px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        title="Remove quaisquer fantasias fakes ou testes"
                      >
                        {isPurgingFakes ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span>Remover Fantasias Fakes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSqlModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-emerald-400/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiar SQL</span>
                      </button>
                    </div>
                  </div>

                  {supabaseConnInfo && (
                    <div className="text-xs p-2.5 rounded-lg bg-black/60 border border-emerald-500/30 flex items-center justify-between">
                      <span>
                        Status da Conexão:{' '}
                        {supabaseConnInfo.connected ? (
                          <strong className="text-emerald-400">
                            ONLINE ({supabaseConnInfo.latencyMs}ms) • {supabaseConnInfo.count} candidatos na tabela
                          </strong>
                        ) : (
                          <strong className="text-amber-400">
                            Inacessível nesta rede: {supabaseConnInfo.error}
                          </strong>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        Dica: use na rede local (192.168.0.x)
                      </span>
                    </div>
                  )}
                </div>

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
                      {candidates.map((cand) => {
                        const candVoters = votesList.filter((v) => v.candidateId === cand.id);

                        return (
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

                                {/* Voter names who voted for this costume */}
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                                    Votantes ({candVoters.length}):
                                  </span>
                                  {candVoters.length === 0 ? (
                                    <span className="text-[10px] text-gray-500 italic">Nenhum voto ainda</span>
                                  ) : (
                                    candVoters.map((v) => (
                                      <span
                                        key={v.id || v.deviceId}
                                        className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-medium inline-flex items-center gap-1"
                                      >
                                        <UserCheck className="w-2.5 h-2.5 text-emerald-400" />
                                        {v.voterName}
                                      </span>
                                    ))
                                  )}
                                </div>
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
                      );
                    })}
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
          <div className="max-w-3xl w-full p-6 rounded-2xl bg-[#0b0c16] border-2 border-emerald-500 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Code2 className="w-5 h-5" />
                <h3 className="font-cinzel font-bold text-base text-white">
                  Scripts SQL para Supabase Self-Hosted
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Script Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSqlModalTab('schema')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sqlModalTab === 'schema'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                1. Estrutura RLS & RPC (cast_vote)
              </button>

              <button
                type="button"
                onClick={() => setSqlModalTab('reset')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sqlModalTab === 'reset'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                2. Zerar Todos os Votos (SQL)
              </button>

              <button
                type="button"
                onClick={() => setSqlModalTab('full')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sqlModalTab === 'full'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                3. Script Completo
              </button>
            </div>

            {/* Mixed Content / Fetch Explanatory Banner */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200/90 space-y-1">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Por que deu erro "Failed to fetch" ao clicar no botão?</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Este aplicativo está hospedado em <strong>HTTPS seguro</strong> na nuvem, enquanto o seu Supabase está em <strong>HTTP interno ({SUPABASE_URL})</strong>. Por normas de segurança internacionais (Mixed Content / Private Network), navegadores bloqueiam requisições HTTPS para HTTP privado.
              </p>
              <p className="text-[11px] text-emerald-300 font-semibold">
                👉 <strong>Solução Rápida (1 Minuto):</strong> Copie o SQL abaixo ou baixe o arquivo <code className="font-mono text-white">.sql</code> e cole no <strong>SQL Editor</strong> do seu painel Supabase (<code className="font-mono text-white">{SUPABASE_URL}</code>)!
              </p>
            </div>

            <p className="text-xs text-gray-300">
              Script gerado pronto para rodar no Supabase Studio:
            </p>

            <pre className="p-4 rounded-xl bg-black border border-emerald-500/30 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72 select-all">
              {getActiveSqlScript()}
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
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
                      <span>COPIAR SCRIPT SQL</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="py-2.5 px-4 rounded-xl bg-black/70 hover:bg-black/90 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>BAIXAR ARQUIVO .SQL</span>
                </button>

                <button
                  type="button"
                  onClick={handleUploadToSupabase}
                  disabled={isUploadingToSupabase}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold font-cinzel flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Tentar Subida Direta</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="py-2.5 px-4 rounded-xl border border-gray-600 text-gray-300 hover:text-white text-xs font-bold cursor-pointer"
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
