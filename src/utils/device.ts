const STORAGE_KEY_DEVICE = 't99_halloween_device_id';
const STORAGE_KEY_VOTE = 't99_halloween_my_vote';

export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    // Generate high-entropy device signature
    const screenInfo = `${window.screen.width}x${window.screen.height}_${window.screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'utc';
    const rand = Math.random().toString(36).substring(2, 10);
    const time = Date.now().toString(36);
    id = `pc_${screenInfo}_${tz}_${time}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 80);
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

export interface LocalVoteInfo {
  candidateId: string;
  candidateName: string;
  votedAt: string;
  voterName?: string;
}

export function getLocalVote(): LocalVoteInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLocalVote(info: LocalVoteInfo): void {
  localStorage.setItem(STORAGE_KEY_VOTE, JSON.stringify(info));
}

export function clearLocalVote(): void {
  localStorage.removeItem(STORAGE_KEY_VOTE);
}
