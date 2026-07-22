import { Component, input, output, forwardRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { Currency } from '../../../../core/domain/entities';

@Component({
  selector: 'app-currency-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true,
    },
  ],
  templateUrl: './currency-input.component.html',
})
export class CurrencyInputComponent implements ControlValueAccessor {
  label = input<string>();
  placeholder = input('0.00');
  currencyDisabled = input(false);
  hint = input<string>();
  error = input<string>();
  required = input(false);
  disabled = input(false);

  private static nextId = 0;
  private uniqueId = `currency-input-${++CurrencyInputComponent.nextId}`;

  inputId = signal(this.uniqueId);
  value = signal<number>(0);
  currency = signal<Currency>('USD');
  isDisabled = signal(false);

  private onChange: (value: { amount: number; currency: Currency }) => void = () => {};
  onTouched: () => void = () => {};

  get inputClasses(): string {
    const base = 'block w-full rounded-r-lg border bg-white pl-20 sm:pl-24 pr-8 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200';
    const state = this.error()
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500';
    const disabled = this.isDisabled() ? 'bg-gray-50 cursor-not-allowed text-gray-500' : '';

    return [base, state, disabled].filter(Boolean).join(' ');
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(parseFloat(target.value) || 0);
    this.onChange({ amount: this.value(), currency: this.currency() });
  }

  onCurrencyChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.currency.set(target.value as Currency);
    this.onChange({ amount: this.value(), currency: this.currency() });
  }

  writeValue(value: { amount: number; currency: Currency } | null): void {
    if (value) {
      this.value.set(value.amount);
      this.currency.set(value.currency);
    }
  }

  registerOnChange(fn: (value: { amount: number; currency: Currency }) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
