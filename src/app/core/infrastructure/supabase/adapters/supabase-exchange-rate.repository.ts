import { Injectable, inject } from '@angular/core';
import { ExchangeRateRepositoryPort } from '../../../application/ports/outbound/exchange-rate-repository-port';
import { ExchangeRate, Currency } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, ExchangeRateRow } from '../mappers/entity-mapper';

@Injectable({ providedIn: 'root' })
export class SupabaseExchangeRateRepository implements ExchangeRateRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'exchange_rates';

  async findByUserAndPair(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<ExchangeRate | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .gte('updated_at', today)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data ? EntityMapper.toExchangeRate(data as ExchangeRateRow) : null;
  }

  async upsert(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    rate: number
  ): Promise<ExchangeRate> {
    const { data, error } = await this.supabase
      .from(this.table)
      .upsert({
        user_id: userId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toExchangeRate(data as ExchangeRateRow);
  }
}