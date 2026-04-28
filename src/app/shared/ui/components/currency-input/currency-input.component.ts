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
  template: `
    <div class="w-full">
      @if (label()) {
        <label [for]="inputId()" class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500">*</span>
          }
        </label>
      }
      <div class="relative rounded-lg shadow-sm">
        <div class="absolute inset-y-0 left-0 flex items-center">
          <select
            [value]="currency()"
            [disabled]="currencyDisabled()"
            (change)="onCurrencyChange($event)"
            class="h-full py-2.5 pl-3 pr-7 text-gray-500 bg-gray-50 border border-gray-300 rounded-l-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </select>
        </div>
        <input
          [id]="inputId()"
          type="number"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [value]="value()"
          [class]="inputClasses"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-3">
          <span class="text-gray-400 text-sm">{{ currency() === 'USD' ? '$' : 'Bs' }}</span>
        </div>
      </div>
      @if (error()) {
        <p class="mt-1.5 text-sm text-red-600">{{ error() }}</p>
      }
    </div>
  `,
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
    const base = 'block w-full rounded-r-lg border bg-white pl-24 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200';
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
