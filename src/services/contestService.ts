import { supabase, SUPABASE_URL } from '../supabase/config';
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

// Known IDs of mock / fake placeholder candidates to purge and forbid
export const FAKE_CANDIDATE_IDS: string[] = [
  'cand_noiva_cadaver',
  'cand_conde_dracula',
  'cand_bruxa_salem',
  'cand_palhaco_macabro',
  'cand_espantalho_assassino',
  'cand_catrina_mexicana',
  'cand_ceifador_morte',
  'cand_feiticeira_sombras',
  'cand_lobisomem_lua',
  'cand_rainha_vampira',
  'cand_medico_peste',
  'cand_zumbi_biohazard',
  'cand_mascarado_slasher',
  'cand_fada_sombria',
];

// Deprecated empty initial list so NO fake candidates are ever automatically seeded
export const INITIAL_REGISTERED_CANDIDATES: Candidate[] = [];

// Helper to check if an ID belongs to a fake candidate
export function isFakeCandidateId(id: string): boolean {
  return FAKE_CANDIDATE_IDS.includes(id);
}

// Local storage fallback helpers for Candidates (never returns fake candidates)
export function getCachedCandidates(): Candidate[] {
  try {
    const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
    if (raw) {
      const parsed: Candidate[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strictly filter out any fake candidates
        return parsed.filter((c) => !isFakeCandidateId(c.id));
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveCachedCandidates(candidates: Candidate[]): void {
  try {
    // Strictly filter out any fake candidates before saving
    const cleanList = candidates.filter((c) => !isFakeCandidateId(c.id));
    localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(cleanList));
  } catch (err) {
    console.warn('Could not save candidates cache:', err);
  }
}

// Purge all fake candidates from Supabase, Firestore, and LocalStorage
export async function purgeFakeCandidates(): Promise<{ success: boolean; count: number; error?: string }> {
  let countRemoved = 0;

  // 1. Remove from Supabase
  try {
    const { error, count } = await supabase
      .from('candidates')
      .delete({ count: 'exact' })
      .in('id', FAKE_CANDIDATE_IDS);

    if (!error && typeof count === 'number') {
      countRemoved += count;
    }
  } catch (err) {
    console.warn('Supabase purge fake notice:', err);
  }

  // 2. Remove from Firestore
  try {
    for (const fakeId of FAKE_CANDIDATE_IDS) {
      await deleteDoc(doc(db, 'candidates', fakeId));
      countRemoved++;
    }
  } catch (err) {
    console.warn('Firestore purge fake notice:', err);
  }

  // 3. Remove from LocalStorage
  const cached = getCachedCandidates();
  const clean = cached.filter((c) => !isFakeCandidateId(c.id));
  saveCachedCandidates(clean);

  return { success: true, count: countRemoved };
}

// Deprecated alias for backwards compatibility
export function resetTo14OfficialCandidates(): Candidate[] {
  purgeFakeCandidates();
  return getCachedCandidates();
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

// Upload ONLY real registered candidates directly to Supabase instance (http://192.168.0.179:8000)
export async function uploadCandidatesToSupabase(
  candidatesToUpload?: Candidate[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const list = candidatesToUpload || getCachedCandidates();
    // Strictly filter out any fake candidates
    const realCandidates = list.filter((cand) => !isFakeCandidateId(cand.id));

    if (realCandidates.length === 0) {
      return {
        success: false,
        count: 0,
        error: 'Nenhuma fantasia real cadastrada. Cadastre as fantasias no gerenciador primeiro para sincronizar com o Supabase!',
      };
    }

    const payload = realCandidates.map((cand) => ({
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
      for (const cand of realCandidates) {
        await setDoc(doc(db, 'candidates', cand.id), cand, { merge: true });
      }
    } catch (fsErr) {
      console.warn('Firestore mirror notice:', fsErr);
    }

    // Save local cache
    saveCachedCandidates(realCandidates);

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
    return { connected: false, count: 0, error: err?.message || `Não foi possível conectar ao IP ${SUPABASE_URL}` };
  }
}

// Real-time listener for candidates with Supabase + Firestore + Local Cache fallback
export function subscribeToCandidates(
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: unknown) => void
) {
  // 1. Immediately serve clean cached data
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

      if (!error && data) {
        // Exclude fake placeholder candidates
        loadedList = data.map(mapRowToCandidate).filter((c) => !isFakeCandidateId(c.id));
      }
    } catch (err) {
      console.warn('Supabase fetch notice, falling back to Firestore/Cache:', err);
    }

    // B. If Supabase failed or was empty, try Firestore
    if (!loadedList || loadedList.length === 0) {
      try {
        const snap = await getDocs(collection(db, 'candidates'));
        if (!snap.empty) {
          const list: Candidate[] = [];
          snap.forEach((d) => {
            const val = d.data() as Candidate;
            if (!isFakeCandidateId(d.id)) {
              list.push({ ...val, id: d.id });
            }
          });
          if (list.length > 0) {
            loadedList = list;
          }
        }
      } catch (fErr) {
        console.warn('Firestore fetch notice:', fErr);
      }
    }

    // C. Fallback to clean cached candidates
    if (!loadedList) {
      loadedList = getCachedCandidates();
    }

    if (loadedList && isSubscribed) {
      // Clean filter again
      const cleanList = loadedList.filter((c) => !isFakeCandidateId(c.id));
      cleanList.sort((a, b) => b.votes - a.votes);
      saveCachedCandidates(cleanList);
      onUpdate(cleanList);
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
          if (!isFakeCandidateId(d.id)) {
            list.push({ ...(d.data() as Candidate), id: d.id });
          }
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

// Real-time listener for all votes (used by Admin Panel to view all voters and who they voted for)
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
          // sort descending by votedAt
          fList.sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime());
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

  // Check if device already voted locally
  const cachedVotes = getCachedVotes();
  if (cachedVotes.some((v) => v.deviceId === deviceId)) {
    throw new Error('Este computador já registrou um voto para o T99 Halloween!');
  }

  // 1. Save in Supabase via authorized operation (cast_vote RPC)
  try {
    const { error: rpcError } = await supabase.rpc('cast_vote', {
      p_device_id: deviceId,
      p_voter_name: cleanVoterName,
      p_candidate_id: candidateId,
      p_candidate_name: candidateName,
    });

    if (rpcError) {
      if (rpcError.message?.includes('já registrou') || rpcError.message?.includes('obrigatório')) {
        throw new Error(rpcError.message);
      }

      // Fallback in case stored procedure has not been run in Supabase yet
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
    }
  } catch (err: any) {
    if (err?.message?.includes('já registrou') || err?.message?.includes('obrigatório')) {
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

// Admin: Add candidate (Real candidates registered by the administrator)
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

// Admin: Reset all votes to 0 (Keeps all real registered candidates intact)
export async function resetAllVotes(): Promise<void> {
  // 1. Reset Supabase
  try {
    await supabase.from('candidates').update({ votes: 0 }).neq('id', 'dummy');
    await supabase.from('votes').delete().neq('id', 'dummy');
  } catch (err) {
    console.warn('Supabase reset votes notice:', err);
  }

  // 2. Reset Firestore and purge any fake costumes
  const firestoreList: Candidate[] = [];
  try {
    const candDocs = await getDocs(collection(db, 'candidates'));
    for (const d of candDocs.docs) {
      if (!isFakeCandidateId(d.id)) {
        await updateDoc(doc(db, 'candidates', d.id), { votes: 0 });
        firestoreList.push({ ...(d.data() as Candidate), id: d.id, votes: 0 });
      } else {
        await deleteDoc(doc(db, 'candidates', d.id));
      }
    }
    const voteDocs = await getDocs(collection(db, 'votes'));
    for (const vd of voteDocs.docs) {
      await deleteDoc(doc(db, 'votes', vd.id));
    }
  } catch (err) {
    console.warn('Firestore reset votes notice:', err);
  }

  // 3. Reset Local Caches
  const currentCached = getCachedCandidates();
  const baseList = firestoreList.length > 0 ? firestoreList : currentCached;
  const zeroedList = baseList
    .filter((c) => !isFakeCandidateId(c.id))
    .map((c) => ({ ...c, votes: 0 }));

  saveCachedCandidates(zeroedList);
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
    const voteDocs = await getDocs(collection(db, 'votes'));
    for (const vd of voteDocs.docs) {
      await deleteDoc(doc(db, 'votes', vd.id));
    }
  } catch (err) {
    console.warn('Firestore purge notice:', err);
  }

  saveCachedCandidates([]);
  saveCachedVotes([]);
}
