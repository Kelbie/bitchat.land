export interface GeneratedProfile {
  username: string;
  privateKeyHex: string;
  publicKeyHex: string;
  npub: string;
  nsec: string;
  color: string;
  hue: number;
}

export interface SavedProfile {
  username: string;
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  color: string;
  createdAt: number;
}

export type ProfileGenerationState = 
  | "input"
  | "selection" 
  | "preview";

export interface ProfileGenerationContext {
  state: ProfileGenerationState;
  input: string;
  isGenerating: boolean;
  progress: number;
  generatedProfiles: GeneratedProfile[];
  generatedProfile: GeneratedProfile | null;
  error: string;
  recentIdentities: string[];
}
