import { Component, input, output, forwardRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      @if (label()) {
        <label [for]="selectId()" class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500">*</span>
          }
        </label>
      }
      <select
        [id]="selectId()"
        [disabled]="isDisabled()"
        [value]="value()"
        [class]="selectClasses"
        (change)="onSelectChange($event)"
        (blur)="onTouched()"
      >
        @if (placeholder()) {
          <option value="" disabled>{{ placeholder() }}</option>
        }
        <ng-content />
      </select>
      @if (error()) {
        <p class="mt-1.5 text-sm text-red-600">{{ error() }}</p>
      }
    </div>
  `,
})
export class SelectComponent implements ControlValueAccessor {
  label = input<string>();
  placeholder = input<string>();
  required = input(false);
  disabled = input(false);
  error = input<string>();

  private static nextId = 0;
  private uniqueId = `select-${++SelectComponent.nextId}`;

  selectId = signal(this.uniqueId);
  value = signal('');
  isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get selectClasses(): string {
    const base = 'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 cursor-pointer';
    const state = this.error()
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500';
    const disabled = this.isDisabled() ? 'bg-gray-50 cursor-not-allowed text-gray-500' : '';

    return [base, state, disabled].filter(Boolean).join(' ');
  }

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
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
