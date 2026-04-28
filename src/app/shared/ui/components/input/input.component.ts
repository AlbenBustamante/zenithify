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
      <div class="relative">
        @if (prefix()) {
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{{ prefix() }}</span>
        }
        <input
          [id]="inputId()"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [value]="value()"
          [class]="inputClasses"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
        @if (suffix()) {
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{{ suffix() }}</span>
        }
      </div>
      @if (error()) {
        <p class="mt-1.5 text-sm text-red-600">{{ error() }}</p>
      }
      @if (hint() && !error()) {
        <p class="mt-1.5 text-sm text-gray-500">{{ hint() }}</p>
      }
    </div>
  `,
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
