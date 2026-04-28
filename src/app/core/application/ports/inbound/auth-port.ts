import { User } from '../../../domain/entities';

export interface AuthPort {
  signInWithEmail(email: string, password: string): Promise<User>;
  signUpWithEmail(email: string, password: string, displayName?: string): Promise<User>;
  signInWithGoogle(): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
}