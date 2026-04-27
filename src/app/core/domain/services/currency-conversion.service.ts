import { Currency } from '../entities';

interface DolarApiResponse {
  moneda: string;
  fuente: string;
  promedio: number;
}

export class CurrencyConversionService {
  private cachedRates: Map<string, { rate: number; timestamp: Date }> = new Map();
  private cacheTimeout = 60 * 60 * 1000;

  async fetchOfficialVESRate(apiUrl: string): Promise<number> {
    const cacheKey = 'VES-official';
    const cached = this.cachedRates.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      return cached.rate;
    }

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate: ${response.status}`);
      }

      const data: DolarApiResponse[] = await response.json();
      const officialRate = data.find(
        (item) => item.moneda === 'USD' && item.fuente === 'oficial'
      );

      if (!officialRate) {
        throw new Error('Official rate not found in API response');
      }

      this.cachedRates.set(cacheKey, {
        rate: officialRate.promedio,
        timestamp: new Date(),
      });

      return officialRate.promedio;
    } catch (error) {
      const cached = this.cachedRates.get(cacheKey);
      if (cached) {
        return cached.rate;
      }
      throw error;
    }
  }

  convert(amount: number, from: Currency, to: Currency, rate: number): number {
    if (from === to) return amount;

    if (from === 'USD' && to === 'VES') {
      return amount * rate;
    }
    return amount / rate;
  }

  convertToUSD(amount: number, fromCurrency: Currency, rate: number): number {
    return this.convert(amount, fromCurrency, 'USD', rate);
  }

  clearCache(): void {
    this.cachedRates.clear();
  }
}