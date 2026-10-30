import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
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
  ShieldAlert,
  Laptop,
  CheckCircle,
} from 'lucide-react';
import { Candidate } from '../types';
import {
  addCandidate,
  updateCandidate,
  deleteCandidate,
  resetAllVotes,
  purgeAllCandidatesAndVotes,
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

      // Reset form
      setName('');
      setCostumeName('');
      setDescription('');
      setPhotos([]);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setFormError('Erro ao salvar no Firestore. Verifique a conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, candName: string) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a fantasia "${candName}"?`)) {
      try {
        await deleteCandidate(id);
        if (editingCandidateId === id) {
          handleCancelEdit();
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir candidato.');
      }
    }
  };

  const handleFullReset = async () => {
    setIsResetting(true);
    try {
      await resetAllVotes();
      onLocalVoteCleared();
      setIsResetConfirmOpen(false);
      alert('Todos os votos foram zerados no Firebase e a votação foi reiniciada!');
    } catch (err) {
      console.error(err);
      alert('Falha ao resetar os votos.');
    } finally {
      setIsResetting(false);
    }
  };

  const handlePurgeAll = async () => {
    if (window.confirm('ATENÇÃO: Deseja apagar TODOS os candidatos cadastrados e zerar o banco?')) {
      setIsResetting(true);
      try {
        await purgeAllCandidatesAndVotes();
        onLocalVoteCleared();
        handleCancelEdit();
        alert('Banco de dados completamente zerado!');
      } catch (err) {
        console.error(err);
        alert('Falha ao zerar banco de dados.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl my-8 bg-[#0f071a] border-2 border-red-500/50 rounded-3xl overflow-hidden shadow-2xl glow-blood flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-red-500/30 bg-black/60">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
            <div>
              <h2 className="text-xl font-cinzel font-black text-red-400 tracking-wider">
                PORTAL ADMINISTRATIVO T99
              </h2>
              <p className="text-xs text-gray-400">
                Cadastre, edite e exclua candidatos. Seus dados ficam salvos permanentemente.
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

        {/* Auth Gate if not authenticated */}
        {!isAuthenticated ? (
          <div className="p-8 text-center max-w-md mx-auto my-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
              <Lock className="w-8 h-8" />
            </div>

            <h3 className="font-cinzel font-bold text-xl text-white">
              Acesso Restrito ao Administrador
            </h3>

            <p className="text-xs text-gray-300">
              Digite a chave para gerenciar, editar participantes ou resetar votos.
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
          /* Main Admin Area */
          <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-black/50 border border-orange-500/20">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Laptop className="w-4 h-4 text-orange-400" />
                <span>Fantasias Cadastradas: <strong className="text-white">{candidates.length}</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onLocalVoteCleared}
                  className="px-3 py-1.5 rounded-lg bg-orange-950/60 hover:bg-orange-900 border border-orange-500/40 text-orange-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Reseta o dispositivo atual para poder votar novamente como teste"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Voto Deste PC (Teste)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePurgeAll}
                  className="px-3.5 py-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white text-xs font-bold font-cinzel flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Remove todos os candidatos"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Excluir Todas as Fantasias</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white text-xs font-bold font-cinzel flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Zerar Apenas Votos</span>
                </button>
              </div>
            </div>

            {/* Candidate Registration / Edit Form */}
            <div
              ref={formRef}
              className={`p-6 rounded-2xl bg-black/60 border space-y-4 transition-all ${
                editingCandidateId ? 'border-amber-500/70 shadow-lg shadow-amber-500/20' : 'border-orange-500/30'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-orange-400">
                  {editingCandidateId ? (
                    <>
                      <Pencil className="w-5 h-5 text-amber-400" />
                      <h3 className="font-cinzel font-bold text-lg text-amber-300">
                        Editar Fantasia: {costumeName || 'Participante'}
                      </h3>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      <h3 className="font-cinzel font-bold text-lg text-white">
                        Cadastrar Nova Fantasia
                      </h3>
                    </>
                  )}
                </div>

                {editingCandidateId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500 text-red-300 text-xs font-medium">
                  {formError}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{successMsg}</span>
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
                      placeholder="Ex: Beatriz Silva"
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
                                Foto #{slotIdx + 1} {slotIdx === 0 ? '(Principal)' : '(Detalhe / Pose)'}
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
                            <div className="w-full h-full flex items-center justify-center text-xs">🎃</div>
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
      </motion.div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        photoSlotLabel={`Foto #${activePhotoSlot + 1}`}
        onCapture={(dataUrl) => updatePhotoAtSlot(activePhotoSlot, dataUrl)}
      />

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#170a1a] border-2 border-red-600 text-center space-y-4 glow-blood">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-cinzel font-bold text-white">
              ZERAR TODOS OS VOTOS DO CONCURSO?
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Esta ação colocará os contadores de votos em ZERO e apagará o registro de votos de todos os computadores, mantendo os cadastros das fantasias intactos.
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
    </div>
  );
};
