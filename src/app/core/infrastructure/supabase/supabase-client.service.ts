import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { User } from '../../domain/entities';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private client: SupabaseClient;
  private authStateHandler: ((event: string, session: unknown) => void) | null = null;

  constructor() {
    this.client = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async getSession() {
    const { data } = await this.client.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<SupabaseUser | null> {
    const { data } = await this.client.auth.getUser();
    return data.user;
  }

  onAuthStateChange(callback: (user: SupabaseUser | null) => void): () => void {
    this.authStateHandler = (_event: string, session: unknown) => {
      const sess = session as { user?: SupabaseUser } | null;
      callback(sess?.user ?? null);
    };

    const { data } = this.client.auth.onAuthStateChange(this.authStateHandler);

    return () => {
      data.subscription.unsubscribe();
    };
  }
}