import { Injectable, inject } from '@angular/core';
import { AuthPort } from '../../../application/ports/inbound/auth-port';
import { User } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, ProfileRow } from '../mappers/entity-mapper';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthAdapter implements AuthPort {
  private supabase = inject(SupabaseClientService).getClient();

  async signInWithEmail(email: string, password: string): Promise<User> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('User not found after sign in');

    return {
      id: data.user.id,
      email: data.user.email ?? email,
    };
  }

  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
      },
    });

    if (error) throw error;

    if (!data.user || !data.session) return null;

    return {
      id: data.user.id,
      email: data.user.email ?? email,
      displayName,
    };
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.supabase.auth.getSession();
    if (!session.data.session?.user) return null;

    return {
      id: session.data.session.user.id,
      email: session.data.session.user.email ?? '',
    };
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return this.supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }

      callback({
        id: session.user.id,
        email: session?.user?.email ?? '',
      });
    }).data.subscription.unsubscribe;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  private async getProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}