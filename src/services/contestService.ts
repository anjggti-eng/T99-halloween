import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  increment,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { Candidate, VoteRecord } from '../types';

const CANDIDATES_CACHE_KEY = 't99_cached_candidates';
const VOTES_CACHE_KEY = 't99_cached_votes';

export const FAKE_CANDIDATE_IDS: string[] = [
  'cand_bruxa_salem',
  'cand_catrina_mexicana',
  'cand_ceifador_morte',
  'cand_conde_dracula',
  'cand_espantalho_assassino',
  'cand_fada_sombria',
  'cand_feiticeira_sombras',
  'cand_lobisomem_lua',
  'cand_mascarado_slasher',
  'cand_medico_peste',
  'cand_noiva_cadaver',
  'cand_palhaco_macabro',
  'cand_rainha_vampira',
  'cand_zumbi_biohazard',
];

export const INITIAL_REGISTERED_CANDIDATES: Candidate[] = [];

export function isFakeCandidateId(id: string): boolean {
  if (!id) return true;
  if (FAKE_CANDIDATE_IDS.includes(id)) return true;
  // All legitimate candidates created by the organizer have IDs like cand_1793389...
  if (!id.startsWith('cand_') || !/^cand_\d+/.test(id)) return true;
  return false;
}

export function getCachedCandidates(): Candidate[] {
  try {
    const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
    if (raw) {
      const parsed: Candidate[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c) => c && c.id && !isFakeCandidateId(c.id));
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveCachedCandidates(candidates: Candidate[]): void {
  try {
    const clean = candidates.filter((c) => c && c.id && !isFakeCandidateId(c.id));
    localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.warn('Could not save candidates cache:', err);
  }
}

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

export async function checkDeviceVote(deviceId: string): Promise<VoteRecord | null> {
  const cached = getCachedVotes();
  const cachedFound = cached.find((v) => v.deviceId === deviceId);
  if (cachedFound) return cachedFound;

  try {
    const voteDocId = `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);
    const snap = await getDoc(doc(db, 'votes', voteDocId));
    if (snap.exists()) {
      return snap.data() as VoteRecord;
    }
  } catch (err) {
    console.warn('Firestore checkDeviceVote notice:', err);
  }
  return null;
}

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
  const voteRef = doc(db, 'votes', voteDocId);
  const candRef = doc(db, 'candidates', candidateId);

  await runTransaction(db, async (transaction) => {
    const voteSnap = await transaction.get(voteRef);
    if (voteSnap.exists()) {
      throw new Error('Este computador já registrou um voto para o T99 Halloween!');
    }

    const newVoteRecord: VoteRecord = {
      id: voteDocId,
      deviceId: deviceId,
      voterName: cleanVoterName,
      candidateId: candidateId,
      candidateName: candidateName,
      votedAt: new Date().toISOString(),
    };

    transaction.set(voteRef, newVoteRecord);
    transaction.update(candRef, { votes: increment(1) });
  });

  const updatedCache = getCachedCandidates().map((c) =>
    c.id === candidateId ? { ...c, votes: (c.votes || 0) + 1 } : c
  );
  updatedCache.sort((a, b) => b.votes - a.votes);
  saveCachedCandidates(updatedCache);
}

/**
 * Real-time subscription to candidates using Firestore onSnapshot.
 * Eliminates periodic polling and ensures each vote update is pushed in real-time
 * without consuming quota on idle users.
 */
export function subscribeToCandidates(onUpdate: (candidates: Candidate[]) => void): () => void {
  // 1. Immediately provide cached data for instant zero-latency UI load
  const cached = getCachedCandidates();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(collection(db, 'candidates'), orderBy('votes', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    { includeMetadataChanges: false },
    (snapshot) => {
      const list: Candidate[] = [];
      snapshot.forEach((d) => {
        if (!isFakeCandidateId(d.id)) {
          list.push({ ...(d.data() as Candidate), id: d.id });
        }
      });
      list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      saveCachedCandidates(list);
      onUpdate(list);
    },
    (err) => {
      console.warn('Candidates real-time listener error (using cache):', err);
      const fallback = getCachedCandidates();
      if (fallback.length > 0) {
        onUpdate(fallback);
      }
    }
  );

  return unsubscribe;
}

/**
 * Real-time subscription to recent votes.
 * Uses limit(100) to protect against reading thousands of documents unnecessarily.
 */
export function subscribeToVotes(
  onUpdate: (votes: VoteRecord[]) => void,
  maxResults: number = 100
): () => void {
  const cached = getCachedVotes();
  if (cached.length > 0) {
    onUpdate(cached.slice(0, maxResults));
  }

  const q = query(
    collection(db, 'votes'),
    orderBy('votedAt', 'desc'),
    limit(maxResults)
  );

  const unsubscribe = onSnapshot(
    q,
    { includeMetadataChanges: false },
    (snapshot) => {
      const list: VoteRecord[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as VoteRecord);
      });
      saveCachedVotes(list);
      onUpdate(list);
    },
    (err) => {
      console.warn('Votes real-time listener notice (using cache):', err);
      const fallback = getCachedVotes();
      onUpdate(fallback.slice(0, maxResults));
    }
  );

  return unsubscribe;
}

/**
 * Fetches all votes on-demand (e.g. for CSV export or full audit).
 * Only invoked explicitly by the user to avoid continuous quota consumption.
 */
export async function fetchAllVotesOnDemand(): Promise<VoteRecord[]> {
  const q = query(collection(db, 'votes'), orderBy('votedAt', 'desc'));
  const snap = await getDocs(q);
  const list: VoteRecord[] = [];
  snap.forEach((d) => {
    list.push(d.data() as VoteRecord);
  });
  return list;
}

export async function deleteVote(voteId: string, candidateId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const voteRef = doc(db, 'votes', voteId);
    const candRef = doc(db, 'candidates', candidateId);
    const candSnap = await transaction.get(candRef);

    if (candSnap.exists()) {
      const currentVotes = (candSnap.data()?.votes as number) || 0;
      transaction.update(candRef, { votes: Math.max(0, currentVotes - 1) });
    }
    transaction.delete(voteRef);
  });
}

export async function addCandidate(
  candidate: Omit<Candidate, 'id' | 'votes' | 'createdAt'>
): Promise<string> {
  const id = `cand_${Date.now()}`;
  const newCand: Candidate = {
    id,
    ...candidate,
    votes: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'candidates', id), newCand);
  return id;
}

export async function updateCandidate(
  candidateId: string,
  updates: Partial<Candidate>
): Promise<void> {
  const candRef = doc(db, 'candidates', candidateId);
  await updateDoc(candRef, updates);
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  await deleteDoc(doc(db, 'candidates', candidateId));
}

/**
 * Safely resets all votes and candidate counters using batched operations.
 */
export async function resetAllVotes(): Promise<void> {
  const candDocs = await getDocs(collection(db, 'candidates'));
  const voteDocs = await getDocs(collection(db, 'votes'));

  // 1. Reset candidate vote counters in batches
  const candBatch = writeBatch(db);
  for (const d of candDocs.docs) {
    candBatch.update(doc(db, 'candidates', d.id), { votes: 0 });
  }
  await candBatch.commit();

  // 2. Delete vote docs in safe batches of 400
  const voteDocsArray = voteDocs.docs;
  for (let i = 0; i < voteDocsArray.length; i += 400) {
    const slice = voteDocsArray.slice(i, i + 400);
    const vBatch = writeBatch(db);
    for (const vd of slice) {
      vBatch.delete(doc(db, 'votes', vd.id));
    }
    await vBatch.commit();
  }

  saveCachedCandidates(getCachedCandidates().map((c) => ({ ...c, votes: 0 })));
  saveCachedVotes([]);
}

export async function purgeFakeCandidates(): Promise<{ success: boolean; count: number; error?: string }> {
  let countRemoved = 0;
  try {
    const cSnap = await getDocs(collection(db, 'candidates'));
    for (const d of cSnap.docs) {
      if (isFakeCandidateId(d.id)) {
        await deleteDoc(doc(db, 'candidates', d.id));
        countRemoved++;
      }
    }
  } catch (err) {
    console.warn('Firestore purge fake notice:', err);
  }
  const cached = getCachedCandidates();
  const clean = cached.filter((c) => !isFakeCandidateId(c.id));
  saveCachedCandidates(clean);

  return { success: true, count: countRemoved };
}

export async function purgeAllCandidatesAndVotes(): Promise<void> {
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

/**
 * Simulates up to 1,000 votes in safe batches using Firestore writeBatch.
 * - Respects the 20,000 writes/day quota (1,000 votes consumes only ~1,014 writes, or 5%).
 * - Batches operations in chunks of 50 with small pacing delay so real-time onSnapshot listeners
 *   receive continuous updates, visibly raising candidate votes on the site in real-time.
 */
export async function simulateBatchVotes(
  totalVotes: number,
  targetCandidateId?: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; processed: number; error?: string }> {
  let processed = 0;
  try {
    const candidatesSnap = await getDocs(collection(db, 'candidates'));
    const validCandidates: Candidate[] = [];
    candidatesSnap.forEach((d) => {
      if (!isFakeCandidateId(d.id)) {
        validCandidates.push({ ...(d.data() as Candidate), id: d.id });
      }
    });

    if (validCandidates.length === 0) {
      throw new Error('Nenhum participante encontrado no banco de dados para receber votos!');
    }

    const batchSize = 50;

    const firstNames = [
      'Carlos', 'Mariana', 'Lucas', 'Ana', 'Rodrigo', 'Beatriz', 'Felipe',
      'Juliana', 'Gabriel', 'Larissa', 'Bruno', 'Camila', 'Thiago', 'Fernanda',
      'Rafael', 'Amanda', 'Diego', 'Patricia', 'Gustavo', 'Renata', 'Eduardo',
      'Vanessa', 'Marcelo', 'Tatiane', 'Danilo', 'Priscila', 'Leonardo', 'Bruna',
    ];
    const lastNames = [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Ferreira',
      'Almeida', 'Costa', 'Gomes', 'Martins', 'Lima', 'Araujo', 'Ribeiro',
      'Carvalho', 'Cardoso', 'Barbosa', 'Monteiro', 'Melo', 'Mendes', 'Nunes',
    ];

    while (processed < totalVotes) {
      const currentBatchCount = Math.min(batchSize, totalVotes - processed);
      const batch = writeBatch(db);
      const candidateIncrements: Record<string, number> = {};

      for (let i = 0; i < currentBatchCount; i++) {
        const voteIndex = processed + i + 1;
        const candidate = targetCandidateId
          ? validCandidates.find((c) => c.id === targetCandidateId) || validCandidates[0]
          : validCandidates[(voteIndex - 1) % validCandidates.length];

        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const voterName = `${fName} ${lName} (Voto #${voteIndex})`;
        const deviceId = `test_pc_${Date.now()}_${voteIndex}_${Math.random().toString(36).substring(2, 7)}`;
        const voteDocId = `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);

        const voteRef = doc(db, 'votes', voteDocId);
        batch.set(voteRef, {
          id: voteDocId,
          deviceId,
          voterName,
          candidateId: candidate.id,
          candidateName: candidate.name,
          votedAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
        } as VoteRecord);

        candidateIncrements[candidate.id] = (candidateIncrements[candidate.id] || 0) + 1;
      }

      for (const [candId, inc] of Object.entries(candidateIncrements)) {
        const candRef = doc(db, 'candidates', candId);
        batch.update(candRef, { votes: increment(inc) });
      }

      await batch.commit();
      processed += currentBatchCount;

      if (onProgress) {
        onProgress(processed, totalVotes);
      }

      if (processed < totalVotes) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    return { success: true, processed };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error simulating batch votes:', err);
    return { success: false, processed, error: errorMsg };
  }
}
