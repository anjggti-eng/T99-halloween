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
  increment,
  query,
  orderBy,
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
    const snap = await getDoc(doc(db, 'votes', `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120)));
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

export function subscribeToCandidates(onUpdate: (candidates: Candidate[]) => void) {
  const fetch = async () => {
    try {
      const q = query(collection(db, 'candidates'), orderBy('votes', 'desc'));
      const snapshot = await getDocs(q);
      const list: Candidate[] = [];
      snapshot.forEach((d) => {
        if (!isFakeCandidateId(d.id)) {
          list.push({ ...(d.data() as Candidate), id: d.id });
        }
      });
      saveCachedCandidates(list);
      onUpdate(list);
    } catch (err) {
      console.warn('Error polling candidates:', err);
    }
  };

  fetch(); // Initial fetch
  const interval = setInterval(fetch, 15000); // Poll every 15 seconds
  return () => clearInterval(interval);
}

export function subscribeToVotes(onUpdate: (votes: VoteRecord[]) => void) {
  const fetch = async () => {
    try {
      const q = query(collection(db, 'votes'), orderBy('votedAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: VoteRecord[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as VoteRecord);
      });
      saveCachedVotes(list);
      onUpdate(list);
    } catch (err) {
      console.warn('Error polling votes:', err);
    }
  };

  fetch(); // Initial fetch
  const interval = setInterval(fetch, 30000); // Poll every 30 seconds
  return () => clearInterval(interval);
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

export async function addCandidate(candidate: Omit<Candidate, 'id' | 'votes' | 'createdAt'>): Promise<string> {
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

export async function updateCandidate(candidateId: string, updates: Partial<Candidate>): Promise<void> {
  const candRef = doc(db, 'candidates', candidateId);
  await updateDoc(candRef, updates);
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  await deleteDoc(doc(db, 'candidates', candidateId));
}

export async function resetAllVotes(): Promise<void> {
  const candDocs = await getDocs(collection(db, 'candidates'));
  const voteDocs = await getDocs(collection(db, 'votes'));
  
  const batch = [];
  for (const d of candDocs.docs) {
    batch.push(updateDoc(doc(db, 'candidates', d.id), { votes: 0 }));
  }
  for (const vd of voteDocs.docs) {
    batch.push(deleteDoc(doc(db, 'votes', vd.id)));
  }
  await Promise.all(batch);

  saveCachedCandidates(getCachedCandidates().map(c => ({...c, votes: 0})));
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
