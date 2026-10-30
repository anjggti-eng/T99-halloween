import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Candidate, VoteRecord } from '../types';

const CANDIDATES_PATH = 'candidates';
const VOTES_PATH = 'votes';

// Real-time listener for all candidates
export function subscribeToCandidates(
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, CANDIDATES_PATH);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Candidate[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          costumeName: data.costumeName || '',
          category: data.category || 'Todas',
          description: data.description || '',
          photos: Array.isArray(data.photos) ? data.photos.slice(0, 2) : [],
          votes: typeof data.votes === 'number' ? data.votes : 0,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      // Sort by votes descending (ranking)
      list.sort((a, b) => b.votes - a.votes);
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, CANDIDATES_PATH);
    }
  );
}

// Check if a specific device (PC) has already voted
export async function checkDeviceVote(deviceId: string): Promise<VoteRecord | null> {
  const voteDocId = `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);
  const voteRef = doc(db, VOTES_PATH, voteDocId);
  try {
    const snap = await getDoc(voteRef);
    if (snap.exists()) {
      return snap.data() as VoteRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${VOTES_PATH}/${voteDocId}`);
  }
}

// Cast a single vote per PC
export async function castVote(candidateId: string, candidateName: string, deviceId: string): Promise<void> {
  const voteDocId = `vote_${deviceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);
  const voteRef = doc(db, VOTES_PATH, voteDocId);
  const candidateRef = doc(db, CANDIDATES_PATH, candidateId);

  try {
    await runTransaction(db, async (transaction) => {
      const existingVote = await transaction.get(voteRef);
      if (existingVote.exists()) {
        throw new Error('Este computador já registrou um voto para o T99 Halloween!');
      }

      const candidateSnap = await transaction.get(candidateRef);
      if (!candidateSnap.exists()) {
        throw new Error('Candidato não encontrado no cemitério do concurso.');
      }

      const currentVotes = (candidateSnap.data().votes as number) || 0;
      transaction.update(candidateRef, { votes: currentVotes + 1 });

      const voteData: VoteRecord = {
        deviceId,
        candidateId,
        candidateName,
        votedAt: new Date().toISOString(),
      };
      transaction.set(voteRef, voteData);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('já registrou um voto')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `${CANDIDATES_PATH}/${candidateId}`);
  }
}

// Admin: Add candidate
export async function addCandidate(candidate: Omit<Candidate, 'id' | 'votes' | 'createdAt'>): Promise<string> {
  const id = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const candidateRef = doc(db, CANDIDATES_PATH, id);

  const payload: Candidate = {
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
    await setDoc(candidateRef, payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CANDIDATES_PATH}/${id}`);
  }
}

// Admin: Update candidate
export async function updateCandidate(candidateId: string, updates: Partial<Candidate>): Promise<void> {
  const candidateRef = doc(db, CANDIDATES_PATH, candidateId);
  try {
    await updateDoc(candidateRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CANDIDATES_PATH}/${candidateId}`);
  }
}

// Admin: Delete candidate
export async function deleteCandidate(candidateId: string): Promise<void> {
  const candidateRef = doc(db, CANDIDATES_PATH, candidateId);
  try {
    await deleteDoc(candidateRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CANDIDATES_PATH}/${candidateId}`);
  }
}

// Admin: Reset all votes to 0 and remove all vote records
export async function resetAllVotes(): Promise<void> {
  try {
    const candidateSnaps = await getDocs(collection(db, CANDIDATES_PATH));
    const batch1 = writeBatch(db);
    candidateSnaps.forEach((docSnap) => {
      batch1.update(doc(db, CANDIDATES_PATH, docSnap.id), { votes: 0 });
    });
    await batch1.commit();

    const voteSnaps = await getDocs(collection(db, VOTES_PATH));
    const batch2 = writeBatch(db);
    voteSnaps.forEach((docSnap) => {
      batch2.delete(doc(db, VOTES_PATH, docSnap.id));
    });
    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reset_all');
  }
}

// Admin: Clear all candidates completely so database is 100% empty (zerado)
export async function purgeAllCandidatesAndVotes(): Promise<void> {
  try {
    const candidateSnaps = await getDocs(collection(db, CANDIDATES_PATH));
    const batch1 = writeBatch(db);
    candidateSnaps.forEach((docSnap) => {
      batch1.delete(doc(db, CANDIDATES_PATH, docSnap.id));
    });
    await batch1.commit();

    const voteSnaps = await getDocs(collection(db, VOTES_PATH));
    const batch2 = writeBatch(db);
    voteSnaps.forEach((docSnap) => {
      batch2.delete(doc(db, VOTES_PATH, docSnap.id));
    });
    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'purge_all');
  }
}
