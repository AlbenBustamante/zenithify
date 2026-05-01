import { Component, input, output, forwardRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  templateUrl: './input.component.html',
})
export class InputComponent implements ControlValueAccessor {
  label = input<string>();
  type = input<'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'date'>('text');
  placeholder = input('');
  prefix = input<string>();
  suffix = input<string>();
  hint = input<string>();
  error = input<string>();
  required = input(false);
  disabled = input(false);

  blurred = output<void>();

  private static nextId = 0;
  private uniqueId = `input-${++InputComponent.nextId}`;

  inputId = signal(this.uniqueId);
  value = signal('');
  isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get inputClasses(): string {
    const base = 'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200';
    const state = this.error()
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500';
    const padding = this.prefix() ? 'pl-8' : '';
    const paddingRight = this.suffix() ? 'pr-8' : '';
    const disabled = this.isDisabled() ? 'bg-gray-50 cursor-not-allowed text-gray-500' : '';

    return [base, state, padding, paddingRight, disabled].filter(Boolean).join(' ');
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  onBlur(): void {
    this.blurred.emit();
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
