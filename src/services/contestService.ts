import { supabase, SUPABASE_URL } from '../supabase/config';
import { Candidate, VoteRecord } from '../types';

const CANDIDATES_CACHE_KEY = 't99_cached_candidates';
const VOTES_CACHE_KEY = 't99_cached_votes';

// Local storage fallback helpers for Candidates
export function getCachedCandidates(): Candidate[] {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('t99_votes_reset_zero_v3') !== 'true') {
      localStorage.setItem('t99_votes_reset_zero_v3', 'true');
      localStorage.removeItem(VOTES_CACHE_KEY);
      localStorage.removeItem('t99_halloween_my_vote');
      const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
      if (raw) {
        const list: Candidate[] = JSON.parse(raw);
        const zeroed = list.map((c) => ({ ...c, votes: 0 }));
        localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify(zeroed));
        // Also call reset in background on Supabase
        resetAllVotes().catch(() => {});
        return zeroed;
      }
      return [];
    }

    const raw = localStorage.getItem(CANDIDATES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
    deviceId: String(row.device_id || ''),
    voterName: String(row.voter_name || row.voterName || 'Votante Identificado'),
    candidateId: String(row.candidate_id || ''),
    candidateName: String(row.candidate_name || ''),
    votedAt: String(row.voted_at || new Date().toISOString()),
  };
}

// Real-time listener for candidates with Supabase + Local Cache fallback
export function subscribeToCandidates(
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: unknown) => void
) {
  // 1. Immediately serve cached data to prevent layout flash or blank screen
  const initialCache = getCachedCandidates();
  if (initialCache.length > 0) {
    onUpdate(initialCache);
  }

  let isSubscribed = true;

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('votes', { ascending: false });

      if (error) {
        console.warn('Supabase fetch notice (using cache fallback if needed):', error.message);
        if (onError) onError(error);
        const cached = getCachedCandidates();
        if (cached.length > 0 && isSubscribed) {
          onUpdate(cached);
        }
        return;
      }

      if (data && isSubscribed) {
        const list: Candidate[] = data.map(mapRowToCandidate);
        list.sort((a, b) => b.votes - a.votes);
        saveCachedCandidates(list);
        onUpdate(list);
      }
    } catch (err) {
      console.warn('Supabase connection unreachable from current network, serving local cache:', err);
      if (onError) onError(err);
      const cached = getCachedCandidates();
      if (isSubscribed) {
        onUpdate(cached);
      }
    }
  };

  // Initial fetch
  fetchCandidates();

  // 2. Realtime listener via Supabase websocket channel
  let channel: any = null;
  try {
    channel = supabase
      .channel('public:candidates_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        fetchCandidates();
      })
      .subscribe();
  } catch (err) {
    console.warn('Supabase Realtime not available, falling back to interval polling:', err);
  }

  // 3. Periodic poll (every 5 seconds) to guarantee sync across local PCs
  const pollInterval = setInterval(() => {
    fetchCandidates();
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

// Real-time listener for all votes (used by Admin Panel to view all voters)
export function subscribeToVotes(
  onUpdate: (votes: VoteRecord[]) => void,
  onError?: (err: unknown) => void
) {
  // Immediately serve local cache
  const initialVotes = getCachedVotes();
  if (initialVotes.length > 0) {
    onUpdate(initialVotes);
  }

  let isSubscribed = true;

  const fetchVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .order('voted_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch votes notice:', error.message);
        if (onError) onError(error);
        const cached = getCachedVotes();
        if (cached.length > 0 && isSubscribed) {
          onUpdate(cached);
        }
        return;
      }

      if (data && isSubscribed) {
        const list: VoteRecord[] = data.map(mapRowToVote);
        saveCachedVotes(list);
        onUpdate(list);
      }
    } catch (err) {
      console.warn('Supabase unreachable for votes, using cache:', err);
      if (onError) onError(err);
      const cached = getCachedVotes();
      if (isSubscribed) {
        onUpdate(cached);
      }
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
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase check vote fallback:', error.message);
      // Check in local cache
      const cached = getCachedVotes();
      const found = cached.find((v) => v.deviceId === deviceId);
      return found || null;
    }

    if (data) {
      return mapRowToVote(data);
    }

    // Check local cache if supabase returns nothing
    const cached = getCachedVotes();
    const found = cached.find((v) => v.deviceId === deviceId);
    return found || null;
  } catch (err) {
    console.warn('Supabase unreachable for checkDeviceVote, falling back to local storage:', err);
    const cached = getCachedVotes();
    const found = cached.find((v) => v.deviceId === deviceId);
    return found || null;
  }
}

// Cast a single vote per PC in Supabase WITH MANDATORY FULL NAME
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

  try {
    // 1. Check if vote already registered for this device in Supabase
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('Check vote query notice:', checkError.message);
    }

    if (existingVote) {
      throw new Error('Este computador já registrou um voto para o T99 Halloween!');
    }

    // Also check local cache for duplicates
    const cachedVotes = getCachedVotes();
    if (cachedVotes.some((v) => v.deviceId === deviceId)) {
      throw new Error('Este computador já registrou um voto para o T99 Halloween!');
    }

    // 2. Fetch current candidate votes
    const { data: candidateData, error: candError } = await supabase
      .from('candidates')
      .select('votes')
      .eq('id', candidateId)
      .single();

    if (candError) {
      console.warn('Candidate fetch error in Supabase, using local vote fallback:', candError.message);
    }

    const currentVotes = (candidateData?.votes as number) || 0;

    // 3. Increment candidate votes
    await supabase
      .from('candidates')
      .update({ votes: currentVotes + 1 })
      .eq('id', candidateId);

    // 4. Record device vote with voter_name
    await supabase.from('votes').insert({
      id: voteDocId,
      device_id: deviceId,
      voter_name: cleanVoterName,
      candidate_id: candidateId,
      candidate_name: candidateName,
      voted_at: newVoteRecord.votedAt,
    });

    // 5. Update local candidates cache
    const cached = getCachedCandidates();
    const updated = cached.map((c) => (c.id === candidateId ? { ...c, votes: c.votes + 1 } : c));
    updated.sort((a, b) => b.votes - a.votes);
    saveCachedCandidates(updated);

    // 6. Update local votes cache with voter name
    saveCachedVotes([newVoteRecord, ...cachedVotes.filter((v) => v.id !== voteDocId)]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('já registrou um voto')) {
      throw error;
    }
    console.warn('Supabase vote operation notice, updating local storage:', msg);
    // Apply locally
    const cached = getCachedCandidates();
    const updated = cached.map((c) => (c.id === candidateId ? { ...c, votes: c.votes + 1 } : c));
    updated.sort((a, b) => b.votes - a.votes);
    saveCachedCandidates(updated);

    const cachedVotes = getCachedVotes();
    saveCachedVotes([newVoteRecord, ...cachedVotes.filter((v) => v.id !== voteDocId)]);
  }
}

// Admin: Delete/Invalidate a single vote
export async function deleteVote(voteId: string, candidateId: string): Promise<void> {
  try {
    await supabase.from('votes').delete().eq('id', voteId);

    // Decrement candidate vote count if > 0
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
    const { error } = await supabase.from('candidates').insert({
      id: newCand.id,
      name: newCand.name,
      costume_name: newCand.costumeName,
      category: newCand.category,
      description: newCand.description,
      photos: newCand.photos,
      votes: 0,
      created_at: newCand.createdAt,
    });

    if (error) {
      console.warn('Supabase insert notice (saving in cache):', error.message);
    }

    const current = getCachedCandidates();
    saveCachedCandidates([newCand, ...current]);
    return id;
  } catch (err) {
    console.warn('Supabase network unreachable, saved candidate in local storage:', err);
    const current = getCachedCandidates();
    saveCachedCandidates([newCand, ...current]);
    return id;
  }
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
    const { error } = await supabase.from('candidates').update(dbUpdates).eq('id', candidateId);
    if (error) {
      console.warn('Supabase update notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase update notice (cache fallback):', err);
  }

  // Update local cache
  const current = getCachedCandidates();
  const updated = current.map((c) => (c.id === candidateId ? { ...c, ...updates } : c));
  saveCachedCandidates(updated);
}

// Admin: Delete candidate
export async function deleteCandidate(candidateId: string): Promise<void> {
  try {
    const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
    if (error) {
      console.warn('Supabase delete notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete notice (cache fallback):', err);
  }

  const current = getCachedCandidates();
  saveCachedCandidates(current.filter((c) => c.id !== candidateId));
}

// Admin: Reset all votes
export async function resetAllVotes(): Promise<void> {
  try {
    await supabase.from('candidates').update({ votes: 0 }).neq('id', 'dummy');
    await supabase.from('votes').delete().neq('id', 'dummy');
  } catch (err) {
    console.warn('Supabase reset votes notice:', err);
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

  saveCachedCandidates([]);
  saveCachedVotes([]);
}
