import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  Skull,
  Ghost,
  Flame,
  Info,
  Lock,
  Share2,
  PlusCircle,
  Trophy,
} from 'lucide-react';
import { Candidate } from './types';
import {
  subscribeToCandidates,
  checkDeviceVote,
  castVote,
} from './services/contestService';
import { getDeviceId, getLocalVote, setLocalVote, clearLocalVote, LocalVoteInfo } from './utils/device';
import { spookyAudio } from './utils/audio';
import { fireHalloweenConfetti } from './utils/confetti';
import { IntroScreen } from './components/IntroScreen';
import { Navbar } from './components/Navbar';
import { RankingTab } from './components/RankingTab';
import { CandidateCard } from './components/CandidateCard';
import { CandidateModal } from './components/CandidateModal';
import { WinnerShareModal } from './components/WinnerShareModal';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'votacao' | 'ranking'>('votacao');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');
  const [myVote, setMyVote] = useState<LocalVoteInfo | null>(null);

  // Modals state
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null);
  const [selectedCandidateForShare, setSelectedCandidateForShare] = useState<Candidate | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Audio playing indicator
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  // Initialize Device and Listeners (NO automatic candidate deletion)
  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);

    // Initial check from localStorage
    const local = getLocalVote();
    if (local) {
      setMyVote(local);
    }

    // Remote verify from Firestore
    checkDeviceVote(id)
      .then((serverVote) => {
        if (serverVote) {
          const voteInfo: LocalVoteInfo = {
            candidateId: serverVote.candidateId,
            candidateName: serverVote.candidateName,
            votedAt: serverVote.votedAt,
          };
          setMyVote(voteInfo);
          setLocalVote(voteInfo);
        } else if (!serverVote && local) {
          // If server votes were reset by admin, synchronize local state
          clearLocalVote();
          setMyVote(null);
        }
      })
      .catch((err) => {
        console.warn('Could not verify device vote status on start:', err);
      });

    // Subscribe to Firestore Candidates (persisted permanently until manual delete)
    const unsubscribe = subscribeToCandidates(
      (list) => {
        setCandidates(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Subscription error:', err);
        setIsLoading(false);
      }
    );

    // Secret Admin keyboard shortcut: Ctrl + Shift + H or Ctrl + Shift + A
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'A' || e.key === 'h' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const totalVotes = useMemo(() => {
    return candidates.reduce((acc, c) => acc + c.votes, 0);
  }, [candidates]);

  const handleVote = async (candidate: Candidate) => {
    if (myVote) {
      showToast(`Você já votou em "${myVote.candidateName}" neste computador!`);
      return;
    }

    try {
      await castVote(candidate.id, candidate.costumeName, deviceId);
      const newVote: LocalVoteInfo = {
        candidateId: candidate.id,
        candidateName: candidate.costumeName,
        votedAt: new Date().toISOString(),
      };
      setMyVote(newVote);
      setLocalVote(newVote);
      fireHalloweenConfetti();
      showToast(`🎃 Seu voto na fantasia "${candidate.costumeName}" foi computado com sucesso!`);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        showToast(err.message);
      } else {
        showToast('Não foi possível computar o voto. Tente novamente.');
      }
    }
  };

  const handleToggleAudio = () => {
    const isPlaying = spookyAudio.toggleMute();
    setIsAudioPlaying(isPlaying);
  };

  const handleLocalVoteCleared = () => {
    clearLocalVote();
    setMyVote(null);
    showToast('O voto deste computador foi limpo para testes!');
  };

  return (
    <div className="min-h-screen bg-[#08040d] text-gray-100 flex flex-col selection:bg-orange-600 selection:text-white relative">
      {/* Animated Haunted Intro Gate - Autoplay Fullscreen Video */}
      {isIntroActive && (
        <IntroScreen
          onEnter={() => {
            setIsIntroActive(false);
            setIsAudioPlaying(true);
          }}
        />
      )}

      {/* Atmospheric Fog Effect in background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-purple-950/20 rounded-full blur-[140px] animate-fog" />
        <div className="absolute top-1/2 -right-40 w-[550px] h-[550px] bg-orange-950/20 rounded-full blur-[150px] animate-fog" />
      </div>

      {/* Sticky Header Navigation with Tab Switcher */}
      <Navbar
        totalVotes={totalVotes}
        isAudioPlaying={isAudioPlaying}
        onToggleAudio={handleToggleAudio}
        onReplayIntro={() => setIsIntroActive(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onQuickAdd={() => setIsAdminOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-[#1c0827]/95 border-2 border-orange-500 shadow-2xl text-orange-200 text-xs sm:text-sm font-semibold flex items-center gap-3 backdrop-blur-md glow-orange"
          >
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* Hero Banner */}
        <section className="text-center py-4 sm:py-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-950/60 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-3">
            <Ghost className="w-3.5 h-3.5 animate-bounce" />
            <span>CONCURSO OFICIAL DE HALLOWEEN T99</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-creepster tracking-wider text-orange-500 text-glow-orange mb-2">
            A NOITE DOS MONSTROS
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed max-w-xl mx-auto">
            Vote na fantasia mais criativa e assustadora. Apenas 1 voto por computador!
          </p>

          {/* Device Vote Status Banner */}
          <div className="mt-4 inline-block">
            {myVote ? (
              <div className="px-5 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-lg shadow-emerald-950/50">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Voto registrado neste PC: <strong className="text-white underline">{myVote.candidateName}</strong> 🎃
                </span>
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-2xl bg-black/60 border border-orange-500/20 text-orange-300/90 text-xs flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>Cada computador tem direito a apenas 1 voto único.</span>
              </div>
            )}
          </div>

          {/* Central Tab Toggle Bar */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setActiveTab('votacao')}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-cinzel font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'votacao'
                  ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/40 border border-orange-400/50 scale-105'
                  : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <span>🎃</span>
              <span>Votação das Fantasias</span>
            </button>

            <button
              onClick={() => setActiveTab('ranking')}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-cinzel font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'ranking'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/40 border border-amber-400/50 scale-105'
                  : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Aba de Ranking</span>
            </button>
          </div>
        </section>

        {/* TAB 1: RANKING TAB */}
        {activeTab === 'ranking' ? (
          <RankingTab
            candidates={candidates}
            totalVotes={totalVotes}
            onOpenDetails={(c) => setSelectedCandidateForDetails(c)}
            onShareWinner={(c) => setSelectedCandidateForShare(c)}
            onSwitchToVoting={() => setActiveTab('votacao')}
          />
        ) : (
          /* TAB 2: VOTING TAB */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-orange-500/20 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-cinzel font-bold text-white flex items-center gap-2">
                  <Skull className="w-5 h-5 text-red-500" />
                  <span>Fantasias para Votar</span>
                  <span className="text-xs font-mono font-normal text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-500/30">
                    {candidates.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fotos reais dos participantes (até 2 fotos por candidato). Clique para ampliar e votar.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/50 text-orange-300 hover:text-white text-xs font-cinzel font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Cadastrar Fantasia</span>
                </button>

                {candidates.length > 0 && (
                  <button
                    onClick={() => setSelectedCandidateForShare(candidates[0])}
                    className="text-xs text-orange-400 hover:text-orange-300 font-cinzel font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartilhar Líder</span>
                  </button>
                )}
              </div>
            </div>

            {/* Candidate Cards Grid */}
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto" />
                <p className="font-cinzel text-orange-400 text-sm">
                  Carregando as fantasias do concurso...
                </p>
              </div>
            ) : candidates.length === 0 ? (
              /* Empty Zerado State */
              <div className="py-16 text-center bg-black/50 rounded-3xl border-2 border-dashed border-orange-500/30 p-8 max-w-lg mx-auto space-y-4 glow-orange">
                <span className="text-5xl block animate-bounce">🎃</span>
                <h3 className="font-cinzel font-black text-white text-xl">
                  Nenhuma fantasia cadastrada ainda!
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto">
                  O concurso está zerado e pronto para receber os participantes. Você pode cadastrar, editar e excluir as fantasias pelo painel.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsAdminOpen(true)}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-bold text-sm tracking-wider shadow-lg shadow-orange-600/40 hover:shadow-orange-500/60 border border-orange-400/50 flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all active:scale-95"
                  >
                    <PlusCircle className="w-5 h-5 text-yellow-300" />
                    <span>CADASTRAR PRIMEIRA FANTASIA</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {candidates.map((candidate) => {
                  const rankIdx = candidates.findIndex((c) => c.id === candidate.id);
                  const isMyVoteCandidate = myVote?.candidateId === candidate.id;
                  return (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      rankIndex={rankIdx}
                      hasVotedOnThisPc={!!myVote}
                      isMyVote={isMyVoteCandidate}
                      onVote={handleVote}
                      onOpenDetails={(c) => setSelectedCandidateForDetails(c)}
                      totalVotesAll={totalVotes}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer with Secret Admin Link */}
      <footer className="relative z-10 border-t border-orange-500/20 bg-[#06030a] py-8 mt-16 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-orange-500">
            <span>🕷️</span>
            <span className="font-creepster text-lg tracking-wider">T99 HALLOWEEN</span>
            <span>🦇</span>
          </div>

          <p className="text-gray-400 max-w-md mx-auto text-[11px] leading-relaxed">
            Aplicativo assombrado de votação de melhor fantasia de Halloween com ranking em tempo real no Firebase Firestore.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="text-gray-400">
              Regra: 1 Voto por Computador
            </span>
            <span>•</span>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Acesso Oculto do Administrador (Editar / Cadastrar / Excluir)</span>
            </button>
          </div>

          <p className="text-[10px] text-gray-500 pt-1">
            Dica para organizadores: Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">Ctrl + Shift + H</kbd> para abrir o painel.
          </p>
        </div>
      </footer>

      {/* Candidate Full Details Modal */}
      <CandidateModal
        candidate={selectedCandidateForDetails}
        onClose={() => setSelectedCandidateForDetails(null)}
        hasVotedOnThisPc={!!myVote}
        isMyVote={myVote?.candidateId === selectedCandidateForDetails?.id}
        onVote={(c) => {
          handleVote(c);
          setSelectedCandidateForDetails(null);
        }}
        onShare={(c) => {
          setSelectedCandidateForDetails(null);
          setSelectedCandidateForShare(c);
        }}
      />

      {/* Social Share Winner Modal */}
      <WinnerShareModal
        candidate={selectedCandidateForShare}
        onClose={() => setSelectedCandidateForShare(null)}
        rank={
          selectedCandidateForShare
            ? candidates.findIndex((c) => c.id === selectedCandidateForShare.id) + 1
            : 1
        }
      />

      {/* Hidden Admin Management Panel */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        candidates={candidates}
        onLocalVoteCleared={handleLocalVoteCleared}
      />
    </div>
  );
}
