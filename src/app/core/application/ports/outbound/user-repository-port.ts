import { User } from '../../domain/entities';

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: Partial<User> & { id: string }): Promise<User>;
  updatePremiumStatus(userId: string, isPremium: boolean): Promise<void>;
}