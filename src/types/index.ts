export interface Candidate {
  id: string;
  name: string;
  costumeName: string;
  category: string;
  description: string;
  photos: string[]; // Up to 2 photos
  votes: number;
  createdAt: string;
}

export interface VoteRecord {
  deviceId: string;
  candidateId: string;
  candidateName: string;
  votedAt: string;
}

export interface ContestConfig {
  votingOpen: boolean;
  lastResetAt?: string;
  announcement?: string;
}

export const HALLOWEEN_CATEGORIES = [
  'Terror Clássico',
  'Mais Assustador',
  'Criativo & Engraçado',
  'Vilões & Cinema',
  'Cosplay Sombrio',
  'Mítico & Sobrenatural',
] as const;
