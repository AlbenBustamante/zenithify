import { Component, input, forwardRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true,
    },
  ],
  templateUrl: './toggle.component.html',
})
export class ToggleComponent implements ControlValueAccessor {
  label = input<string>();
  disabled = input(false);
  error = input<string>();

  private static nextId = 0;
  private uniqueId = `toggle-${++ToggleComponent.nextId}`;

  toggleId = signal(this.uniqueId);
  value = signal(false);
  isDisabled = signal(false);

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  get trackClasses(): string {
    const base = 'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
    const state = this.value() ? 'bg-primary-500' : 'bg-slate-300';
    const disabled = this.isDisabled() ? 'opacity-50 cursor-not-allowed' : '';
    return [base, state, disabled].filter(Boolean).join(' ');
  }

  get thumbClasses(): string {
    const base = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out';
    const position = this.value() ? 'translate-x-5' : 'translate-x-0';
    return [base, position].join(' ');
  }

  onToggle(): void {
    if (this.isDisabled()) return;
    const next = !this.value();
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.value.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
