import { Currency } from '../../core/domain/entities';
import { Money } from '../../core/domain/value-objects';

export function formatCurrency(amount: number, currency: Currency, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function convertToMoney(amount: number, currency: Currency): Money {
  return new Money(amount, currency);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}