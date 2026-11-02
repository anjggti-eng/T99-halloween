import { supabase } from '../supabase/config';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Candidate, VoteRecord } from '../types';

const CANDIDATES_CACHE_KEY = 't99_cached_candidates';
const VOTES_CACHE_KEY = 't99_cached_votes';

// 8 Official Registered Halloween Costumes (Concurso T99 Halloween)
export const INITIAL_REGISTERED_CANDIDATES: Candidate[] = [
  {
    id: 'cand_noiva_cadaver',
    name: 'Juliana Mendes',
    costumeName: 'Noiva Cadáver Gótica',
    category: 'Terror Clássico',
    description: 'Vestido de noiva centenário rendado e esfarrapado, véu sombrio, maquiagem cadavérica azulada com buquê de rosas negras secas.',
    photos: [
      'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1572945281869-8269d0d9703f?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T20:00:00.000Z',
  },
  {
    id: 'cand_conde_dracula',
    name: 'Lucas Silveira',
    costumeName: 'Lorde Drácula Vitoriano',
    category: 'Terror Clássico',
    description: 'Capa preta de veludo com gola alta escarlate, dentes caninos hiper-realistas, palidez vampírica e medalhão ancestral dos Cárpatos.',
    photos: [
      'https://images.unsplash.com/photo-1603792907191-89e55f70071a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T20:10:00.000Z',
  },
  {
    id: 'cand_bruxa_salem',
    name: 'Beatriz Alencar',
    costumeName: 'Bruxa Ancestral de Salem',
    category: 'Mítico & Sobrenatural',
    description: 'Túnica rústica de bruxaria ancestral, cajado com crânio entalhado em madeira negra, grimório de feitiços e olhos brancos assustadores.',
    photos: [
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T20:20:00.000Z',
  },
  {
    id: 'cand_palhaco_macabro',
    name: 'Diego Martinez',
    costumeName: 'Palhaço Macabro do Circo Sombrio',
    category: 'Criativo & Engraçado',
    description: 'Traje circense vintage manchado, sorriso de látex rasgado de orelha a orelha, maquiagem teatral sinistra e balão vermelho ensanguentado.',
    photos: [
      'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T20:30:00.000Z',
  },
  {
    id: 'cand_espantalho_assassino',
    name: 'Rafael Torres',
    costumeName: 'Espantalho dos Milharais Malditos',
    category: 'Mais Assustador',
    description: 'Máscara costurada em estopa rústica e arame farpado, chapéu pontudo desgastado, foice metálica enferrujada e aura aterrorizante.',
    photos: [
      'https://images.unsplash.com/photo-1572293007244-8b60335d2b7d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T20:40:00.000Z',
  },
  {
    id: 'cand_catrina_mexicana',
    name: 'Camila Rocha',
    costumeName: 'La Catrina - Dama de la Muerte',
    category: 'Mítico & Sobrenatural',
    description: 'Pintura facial minuciosa de caveira mexicana com pedrarias pretas e douradas, tiara farta de flores de cempasúchil e traje bordado.',
    photos: [
      'https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1481819613568-3701cbc70156?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T20:50:00.000Z',
  },
  {
    id: 'cand_ceifador_morte',
    name: 'Marcos Vinícius',
    costumeName: 'Ceifador da Meia-Noite (Grim Reaper)',
    category: 'Vilões & Cinema',
    description: 'Manto negro sem rosto com capuz profundo, garras esqueléticas articuladas e foice imponente de lâmina espectral.',
    photos: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T21:00:00.000Z',
  },
  {
    id: 'cand_feiticeira_sombras',
    name: 'Larissa Fernandes',
    costumeName: 'Feiticeira das Sombras & Teias',
    category: 'Cosplay Sombrio',
    description: 'Corset rendado em teias de aranha com véu gótico de tule negro, tiara de chifres pontiagudos e amuleto luminescente.',
    photos: [
      'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T21:10:00.000Z',
  },
  {
    id: 'cand_lobisomem_lua',
    name: 'Gabriel Duarte',
    costumeName: 'Lobisomem da Lua de Sangue',
    category: 'Terror Clássico',
    description: 'Pelagem rústica realista, presas caninas afiadas, garras de besta demoníaca e olhos amarelos brilhantes sob a lua cheia.',
    photos: [
      'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1572945281869-8269d0d9703f?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T21:20:00.000Z',
  },
  {
    id: 'cand_rainha_vampira',
    name: 'Amanda Vasconcelos',
    costumeName: 'Rainha Vampira Carmilla',
    category: 'Terror Clássico',
    description: 'Vestido imperial de veludo bordô com detalhes em ouro envelhecido, coroa gótica de espinhos e taça de sangue das trevas.',
    photos: [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T21:30:00.000Z',
  },
  {
    id: 'cand_medico_peste',
    name: 'Thiago Alvarenga',
    costumeName: 'Médico da Peste Negra (Plague Doctor)',
    category: 'Vilões & Cinema',
    description: 'Máscara alongada de bico de pássaro em couro envelhecido, sobretudo encerado, cartola alta e bastão com lanterna verde espectral.',
    photos: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T21:40:00.000Z',
  },
  {
    id: 'cand_zumbi_biohazard',
    name: 'Fernanda Siqueira',
    costumeName: 'Zumbi Biohazard do Apocalipse',
    category: 'Mais Assustador',
    description: 'Macacão de contenção química rasgado, próteses de infecção necrosada hiper-realistas e lentes de contato esbranquiçadas sinistras.',
    photos: [
      'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1572293007244-8b60335d2b7d?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T21:50:00.000Z',
  },
  {
    id: 'cand_mascarado_slasher',
    name: 'Rodrigo Lima',
    costumeName: 'O Mascarado Sombrio (Slasher)',
    category: 'Vilões & Cinema',
    description: 'Macacão mecânico manchado de fuligem, máscara facial sinistra com marcas de combate e machado rústico estilizado.',
    photos: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1603792907191-89e55f70071a?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T22:00:00.000Z',
  },
  {
    id: 'cand_fada_sombria',
    name: 'Mariana Couto',
    costumeName: 'Fada Sombria dos Pântanos',
    category: 'Mítico & Sobrenatural',
    description: 'Asas de inseto translúcidas e esfarrapadas em tons de ébano, coroa de galhos secos, maquiagem fosforescente e orquídeas negras.',
    photos: [
      'https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=800&q=80',
    ],
    votes: 0,
    createdAt: '2026-10-31T22:10:00.000Z',
  },
];

// Local storage fallback helpers for Candidates
export function getCachedCandidates(): Candidate[] {
  try {
    const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
    if (raw) {
      const parsed: Candidate[] = JSON.parse(raw);
      // Ensure all 14 official candidates are present
      if (Array.isArray(parsed) && parsed.length >= 14) {
        return parsed;
      }
    }
    // Default to 14 registered candidates if cache is empty or has fewer
    saveCachedCandidates(INITIAL_REGISTERED_CANDIDATES);
    return INITIAL_REGISTERED_CANDIDATES;
  } catch {
    return INITIAL_REGISTERED_CANDIDATES;
  }
}

// Reset and load the 14 official candidates
export function resetTo14OfficialCandidates(): Candidate[] {
  saveCachedCandidates(INITIAL_REGISTERED_CANDIDATES);
  return INITIAL_REGISTERED_CANDIDATES;
}

export function saveCachedCandidates(candidates: Candidate[]): void {
  try {
    localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(candidates));
  } catch (err) {
    console.warn('Could not save candidates cache:', err);
  }
}

// Local storage fallback helpers for Votes
export function getCachedVotes(): VoteRecord[] {
  try {
    const raw = localStorage.getItem(VOTES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedVotes(votes: VoteRecord[]): void {
  try {
    localStorage.setItem(VOTES_CACHE_KEY, JSON.stringify(votes));
  } catch (err) {
    console.warn('Could not save votes cache:', err);
  }
}

// Convert Supabase database row to frontend Candidate model
function mapRowToCandidate(row: any): Candidate {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    costumeName: String(row.costume_name || row.costumeName || ''),
    category: String(row.category || 'Todas'),
    description: String(row.description || ''),
    photos: Array.isArray(row.photos) ? row.photos.slice(0, 2) : [],
    votes: typeof row.votes === 'number' ? row.votes : 0,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

// Convert Supabase database row to frontend VoteRecord model
function mapRowToVote(row: any): VoteRecord {
  return {
    id: String(row.id || ''),
    deviceId: String(row.device_id || row.deviceId || ''),
    voterName: String(row.voter_name || row.voterName || 'Votante Identificado'),
    candidateId: String(row.candidate_id || row.candidateId || ''),
    candidateName: String(row.candidate_name || row.candidateName || ''),
    votedAt: String(row.voted_at || row.votedAt || new Date().toISOString()),
  };
}

// Upload official candidates directly to Supabase instance (http://192.168.3.108:8000)
export async function uploadCandidatesToSupabase(
  candidatesToUpload: Candidate[] = INITIAL_REGISTERED_CANDIDATES
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const payload = candidatesToUpload.map((cand) => ({
      id: cand.id,
      name: cand.name,
      costume_name: cand.costumeName,
      category: cand.category || 'Todas',
      description: cand.description || '',
      photos: cand.photos || [],
      votes: typeof cand.votes === 'number' ? cand.votes : 0,
      created_at: cand.createdAt || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('candidates')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Supabase upsert error:', error);
      return { success: false, count: 0, error: error.message || 'Erro ao gravar no Supabase' };
    }

    // Also mirror to Firestore for dual resilience
    try {
      for (const cand of candidatesToUpload) {
        await setDoc(doc(db, 'candidates', cand.id), cand, { merge: true });
      }
    } catch (fsErr) {
      console.warn('Firestore mirror notice:', fsErr);
    }

    // Save local cache
    saveCachedCandidates(candidatesToUpload);

    return { success: true, count: data ? data.length : payload.length };
  } catch (err: any) {
    console.error('Fatal error in uploadCandidatesToSupabase:', err);
    return { success: false, count: 0, error: err?.message || 'Falha de conexão com o Supabase' };
  }
}

// Check connectivity with the user's Supabase instance
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  count: number;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const { data, count, error } = await supabase
      .from('candidates')
      .select('id', { count: 'exact' });

    const latencyMs = Date.now() - start;
    if (error) {
      return { connected: false, count: 0, latencyMs, error: error.message };
    }
    return { connected: true, count: count ?? (data?.length || 0), latencyMs };
  } catch (err: any) {
    return { connected: false, count: 0, error: err?.message || 'Não foi possível conectar ao IP do Supabase' };
  }
}

// Upload seed registered candidates to databases if remote is empty
async function seedRegisteredCandidatesIfNeeded(existing: Candidate[]) {
  if (existing.length === 0) {
    await uploadCandidatesToSupabase(INITIAL_REGISTERED_CANDIDATES);
  }
}

// Real-time listener for candidates with Supabase + Firestore + Local Cache fallback
export function subscribeToCandidates(
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: unknown) => void
) {
  // 1. Immediately serve cached / registered data
  const initialCache = getCachedCandidates();
  onUpdate(initialCache);

  let isSubscribed = true;

  const fetchCandidates = async () => {
    let loadedList: Candidate[] | null = null;

    // A. Try Supabase
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('votes', { ascending: false });

      if (!error && data && data.length > 0) {
        loadedList = data.map(mapRowToCandidate);
      }
    } catch (err) {
      console.warn('Supabase fetch notice, falling back to Firestore/Cache:', err);
    }

    // B. If Supabase had no candidates or was offline, try Firestore
    if (!loadedList || loadedList.length === 0) {
      try {
        const snap = await getDocs(collection(db, 'candidates'));
        if (!snap.empty) {
          const list: Candidate[] = [];
          snap.forEach((d) => {
            const val = d.data() as Candidate;
            list.push({ ...val, id: d.id });
          });
          if (list.length > 0) {
            loadedList = list;
          }
        }
      } catch (fErr) {
        console.warn('Firestore fetch notice:', fErr);
      }
    }

    // C. If both databases are empty or unreachable, use initial registered candidates
    if (!loadedList || loadedList.length === 0) {
      const cached = getCachedCandidates();
      loadedList = cached.length > 0 ? cached : INITIAL_REGISTERED_CANDIDATES;
      // Seed remote databases with registered candidates in background
      seedRegisteredCandidatesIfNeeded([]);
    }

    if (loadedList && isSubscribed) {
      loadedList.sort((a, b) => b.votes - a.votes);
      saveCachedCandidates(loadedList);
      onUpdate(loadedList);
    }
  };

  // Initial fetch
  fetchCandidates();

  // Realtime listener via Supabase websocket channel
  let supabaseChannel: any = null;
  try {
    supabaseChannel = supabase
      .channel('public:candidates_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        fetchCandidates();
      })
      .subscribe();
  } catch (err) {
    console.warn('Supabase Realtime not available:', err);
  }

  // Realtime listener via Firestore
  let unsubscribeFirestore: (() => void) | null = null;
  try {
    unsubscribeFirestore = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      if (!snapshot.empty && isSubscribed) {
        const list: Candidate[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as Candidate), id: d.id });
        });
        list.sort((a, b) => b.votes - a.votes);
        saveCachedCandidates(list);
        onUpdate(list);
      }
    });
  } catch (fErr) {
    console.warn('Firestore snapshot error:', fErr);
  }

  // Periodic poll every 5 seconds as fallback
  const pollInterval = setInterval(() => {
    fetchCandidates();
  }, 5000);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (supabaseChannel) {
      try {
        supabase.removeChannel(supabaseChannel);
      } catch {
        // ignore
      }
    }
    if (unsubscribeFirestore) {
      try {
        unsubscribeFirestore();
      } catch {
        // ignore
      }
    }
  };
}

// Real-time listener for all votes (used by Admin Panel to view all voters)
export function subscribeToVotes(
  onUpdate: (votes: VoteRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const initialVotes = getCachedVotes();
  if (initialVotes.length > 0) {
    onUpdate(initialVotes);
  }

  let isSubscribed = true;

  const fetchVotes = async () => {
    let list: VoteRecord[] | null = null;

    // A. Try Supabase
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .order('voted_at', { ascending: false });

      if (!error && data) {
        list = data.map(mapRowToVote);
      }
    } catch (err) {
      console.warn('Supabase votes notice:', err);
    }

    // B. If Supabase failed, try Firestore
    if (!list) {
      try {
        const snap = await getDocs(collection(db, 'votes'));
        if (!snap.empty) {
          const fList: VoteRecord[] = [];
          snap.forEach((d) => {
            fList.push({ ...(d.data() as VoteRecord), id: d.id });
          });
          list = fList;
        }
      } catch (fErr) {
        console.warn('Firestore votes notice:', fErr);
      }
    }

    if (!list) {
      list = getCachedVotes();
    }

    if (list && isSubscribed) {
      saveCachedVotes(list);
      onUpdate(list);
    }
  };

  fetchVotes();

  let channel: any = null;
  try {
    channel = supabase
      .channel('public:votes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchVotes();
      })
      .subscribe();
  } catch (err) {
    console.warn('Supabase Realtime votes not available:', err);
  }

  const pollInterval = setInterval(() => {
    fetchVotes();
  }, 5000);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    }
  };
}

// Check if a specific device (PC) has already voted
export async function checkDeviceVote(deviceId: string): Promise<VoteRecord | null> {
  // Check local cache first
  const cached = getCachedVotes();
  const cachedFound = cached.find((v) => v.deviceId === deviceId);
  if (cachedFound) return cachedFound;

  // Check Supabase
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (!error && data) {
      return mapRowToVote(data);
    }
  } catch (err) {
    console.warn('Supabase checkDeviceVote fallback:', err);
  }

  // Check Firestore
  try {
    const snap = await getDoc(doc(db, 'votes', `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120)));
    if (snap.exists()) {
      return snap.data() as VoteRecord;
    }
  } catch (err) {
    console.warn('Firestore checkDeviceVote notice:', err);
  }

  return null;
}

// Cast a single vote per PC with mandatory Full Name
export async function castVote(
  candidateId: string,
  candidateName: string,
  deviceId: string,
  voterName: string
): Promise<void> {
  const cleanVoterName = voterName.trim();
  if (!cleanVoterName) {
    throw new Error('É obrigatório informar seu nome completo antes de votar!');
  }

  const voteDocId = `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);

  const newVoteRecord: VoteRecord = {
    id: voteDocId,
    deviceId: deviceId,
    voterName: cleanVoterName,
    candidateId: candidateId,
    candidateName: candidateName,
    votedAt: new Date().toISOString(),
  };

  // Check if device already voted
  const cachedVotes = getCachedVotes();
  if (cachedVotes.some((v) => v.deviceId === deviceId)) {
    throw new Error('Este computador já registrou um voto para o T99 Halloween!');
  }

  // 1. Save in Supabase
  try {
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (existingVote) {
      throw new Error('Este computador já registrou um voto para o T99 Halloween!');
    }

    const { data: candidateData } = await supabase
      .from('candidates')
      .select('votes')
      .eq('id', candidateId)
      .single();

    const currentVotes = (candidateData?.votes as number) || 0;

    await supabase
      .from('candidates')
      .update({ votes: currentVotes + 1 })
      .eq('id', candidateId);

    await supabase.from('votes').insert({
      id: voteDocId,
      device_id: deviceId,
      voter_name: cleanVoterName,
      candidate_id: candidateId,
      candidate_name: candidateName,
      voted_at: newVoteRecord.votedAt,
    });
  } catch (err: any) {
    if (err?.message?.includes('já registrou')) {
      throw err;
    }
    console.warn('Supabase castVote notice:', err);
  }

  // 2. Save in Firestore
  try {
    const voteRef = doc(db, 'votes', voteDocId);
    await setDoc(voteRef, newVoteRecord);

    const candRef = doc(db, 'candidates', candidateId);
    const candSnap = await getDoc(candRef);
    if (candSnap.exists()) {
      const cVotes = (candSnap.data()?.votes as number) || 0;
      await updateDoc(candRef, { votes: cVotes + 1 });
    }
  } catch (fErr) {
    console.warn('Firestore castVote notice:', fErr);
  }

  // 3. Update local candidates cache
  const cached = getCachedCandidates();
  const updated = cached.map((c) => (c.id === candidateId ? { ...c, votes: c.votes + 1 } : c));
  updated.sort((a, b) => b.votes - a.votes);
  saveCachedCandidates(updated);

  // 4. Update local votes cache
  saveCachedVotes([newVoteRecord, ...cachedVotes]);

  // 5. Store in local device storage
  try {
    localStorage.setItem(
      't99_halloween_my_vote',
      JSON.stringify({
        candidateId,
        candidateName,
        votedAt: newVoteRecord.votedAt,
        voterName: cleanVoterName,
      })
    );
  } catch {
    // ignore
  }
}

// Admin: Delete a single vote by ID
export async function deleteVote(voteId: string, candidateId: string): Promise<void> {
  // Supabase delete
  try {
    await supabase.from('votes').delete().eq('id', voteId);
    const { data: cand } = await supabase
      .from('candidates')
      .select('votes')
      .eq('id', candidateId)
      .single();

    if (cand && typeof cand.votes === 'number' && cand.votes > 0) {
      await supabase
        .from('candidates')
        .update({ votes: Math.max(0, cand.votes - 1) })
        .eq('id', candidateId);
    }
  } catch (err) {
    console.warn('Supabase delete vote notice:', err);
  }

  // Firestore delete
  try {
    await deleteDoc(doc(db, 'votes', voteId));
    const candRef = doc(db, 'candidates', candidateId);
    const snap = await getDoc(candRef);
    if (snap.exists() && typeof snap.data()?.votes === 'number' && snap.data()?.votes > 0) {
      await updateDoc(candRef, { votes: Math.max(0, snap.data()?.votes - 1) });
    }
  } catch (err) {
    console.warn('Firestore delete vote notice:', err);
  }

  // Update local votes cache
  const cachedVotes = getCachedVotes();
  saveCachedVotes(cachedVotes.filter((v) => v.id !== voteId));

  // Update local candidates cache
  const cached = getCachedCandidates();
  const updated = cached.map((c) =>
    c.id === candidateId ? { ...c, votes: Math.max(0, c.votes - 1) } : c
  );
  updated.sort((a, b) => b.votes - a.votes);
  saveCachedCandidates(updated);
}

// Admin: Add candidate
export async function addCandidate(candidate: Omit<Candidate, 'id' | 'votes' | 'createdAt'>): Promise<string> {
  const id = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newCand: Candidate = {
    id,
    name: candidate.name.trim(),
    costumeName: candidate.costumeName.trim(),
    category: candidate.category || 'Todas',
    description: candidate.description.trim(),
    photos: candidate.photos.slice(0, 2),
    votes: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await supabase.from('candidates').insert({
      id: newCand.id,
      name: newCand.name,
      costume_name: newCand.costumeName,
      category: newCand.category,
      description: newCand.description,
      photos: newCand.photos,
      votes: 0,
      created_at: newCand.createdAt,
    });
  } catch (err) {
    console.warn('Supabase addCandidate notice:', err);
  }

  try {
    await setDoc(doc(db, 'candidates', newCand.id), newCand);
  } catch (err) {
    console.warn('Firestore addCandidate notice:', err);
  }

  const current = getCachedCandidates();
  saveCachedCandidates([newCand, ...current]);
  return id;
}

// Admin: Update candidate
export async function updateCandidate(candidateId: string, updates: Partial<Candidate>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.costumeName !== undefined) dbUpdates.costume_name = updates.costumeName.trim();
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.description !== undefined) dbUpdates.description = updates.description.trim();
  if (updates.photos !== undefined) dbUpdates.photos = updates.photos.slice(0, 2);
  if (updates.votes !== undefined) dbUpdates.votes = updates.votes;

  try {
    await supabase.from('candidates').update(dbUpdates).eq('id', candidateId);
  } catch (err) {
    console.warn('Supabase update notice:', err);
  }

  try {
    await updateDoc(doc(db, 'candidates', candidateId), updates as any);
  } catch (err) {
    console.warn('Firestore update notice:', err);
  }

  const current = getCachedCandidates();
  const updated = current.map((c) => (c.id === candidateId ? { ...c, ...updates } : c));
  saveCachedCandidates(updated);
}

// Admin: Delete candidate
export async function deleteCandidate(candidateId: string): Promise<void> {
  try {
    await supabase.from('candidates').delete().eq('id', candidateId);
  } catch (err) {
    console.warn('Supabase delete notice:', err);
  }

  try {
    await deleteDoc(doc(db, 'candidates', candidateId));
  } catch (err) {
    console.warn('Firestore delete notice:', err);
  }

  const current = getCachedCandidates();
  saveCachedCandidates(current.filter((c) => c.id !== candidateId));
}

// Admin: Reset all votes to 0 (Keeps all registered candidates intact)
export async function resetAllVotes(): Promise<void> {
  try {
    await supabase.from('candidates').update({ votes: 0 }).neq('id', 'dummy');
    await supabase.from('votes').delete().neq('id', 'dummy');
  } catch (err) {
    console.warn('Supabase reset votes notice:', err);
  }

  try {
    const candDocs = await getDocs(collection(db, 'candidates'));
    for (const d of candDocs.docs) {
      await updateDoc(doc(db, 'candidates', d.id), { votes: 0 });
    }
    const voteDocs = await getDocs(collection(db, 'votes'));
    for (const vd of voteDocs.docs) {
      await deleteDoc(doc(db, 'votes', vd.id));
    }
  } catch (err) {
    console.warn('Firestore reset votes notice:', err);
  }

  const cached = getCachedCandidates();
  saveCachedCandidates(cached.map((c) => ({ ...c, votes: 0 })));
  saveCachedVotes([]);
  try {
    localStorage.removeItem('t99_halloween_my_vote');
    localStorage.removeItem(VOTES_CACHE_KEY);
  } catch {
    // ignore
  }
}

// Admin: Purge all candidates and votes
export async function purgeAllCandidatesAndVotes(): Promise<void> {
  try {
    await supabase.from('candidates').delete().neq('id', 'dummy');
    await supabase.from('votes').delete().neq('id', 'dummy');
  } catch (err) {
    console.warn('Supabase purge notice:', err);
  }

  try {
    const candDocs = await getDocs(collection(db, 'candidates'));
    for (const d of candDocs.docs) {
      await deleteDoc(doc(db, 'candidates', d.id));
    }
  } catch (err) {
    console.warn('Firestore purge notice:', err);
  }

  saveCachedCandidates([]);
  saveCachedVotes([]);
}
