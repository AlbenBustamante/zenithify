import { ExchangeRate, Currency } from '../../domain/entities';

export interface ExchangeRateRepositoryPort {
  findByUserAndPair(userId: string, fromCurrency: Currency, toCurrency: Currency): Promise<ExchangeRate | null>;
  upsert(userId: string, fromCurrency: Currency, toCurrency: Currency, rate: number): Promise<ExchangeRate>;
}