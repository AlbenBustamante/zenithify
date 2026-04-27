import { Component, input, output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-input',
  imports: [ReactiveFormsModule, NgClass],
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
        <label [for]="inputId()" class="block text-sm font-medium text-gray-700 mb-1">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500">*</span>
          }
        </label>
      }
      <div class="relative">
        @if (prefix()) {
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{{ prefix() }}</span>
        }
        <input
          [id]="inputId()"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [ngClass]="inputClasses()"
          [value]="value()"
          class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
        @if (suffix()) {
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{{ suffix() }}</span>
        }
      </div>
      @if (error()) {
        <p class="mt-1 text-sm text-red-600">{{ error() }}</p>
      }
      @if (hint()) {
        <p class="mt-1 text-sm text-gray-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  label = input<string>();
  type = input<'text' | 'email' | 'password' | 'number' | 'url' | 'tel'>('text');
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

  inputClasses(): Record<string, boolean> {
    return {
      'pl-7': !!this.prefix(),
      'pr-7': !!this.suffix(),
      'border-red-300 focus:border-red-500 focus:ring-red-500': !!this.error(),
      'bg-gray-50 cursor-not-allowed': this.isDisabled(),
    };
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