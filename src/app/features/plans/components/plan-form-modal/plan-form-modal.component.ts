import { Component, input, output, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { InputComponent } from '../../../../shared/ui/components/input/input.component';
import { SelectComponent } from '../../../../shared/ui/components/select/select.component';
import { ToggleComponent } from '../../../../shared/ui/components/toggle/toggle.component';
import { Plan, Currency, BillingCycle } from '../../../../core/domain/entities';
import { toISOStringDate, parseDate } from '../../../../shared/utils/date.util';

@Component({
  selector: 'app-plan-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, ButtonComponent, InputComponent, SelectComponent, ToggleComponent],
  templateUrl: './plan-form-modal.component.html',
})
export class PlanFormModalComponent {
  private fb = inject(FormBuilder);

  isOpen = input(false);
  editingPlan = input<Plan | null>(null);
  loading = input(false);
  close = output<void>();
  save = output<{ name: string; provider: string; amount: number; currency: Currency; billingCycle: BillingCycle; nextBillingDate: Date; url?: string; isActive: boolean }>();

  form = this.fb.group({
    name: ['', [Validators.required]],
    provider: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    billingCycle: ['monthly' as BillingCycle],
    nextBillingDate: ['', [Validators.required]],
    url: [''],
    isActive: [true],
  });

  constructor() {
    effect(() => {
      const plan = this.editingPlan();
      if (plan) {
        this.form.patchValue({
          name: plan.name,
          provider: plan.provider,
          amount: plan.amount,
          currency: plan.currency,
          billingCycle: plan.billingCycle,
          nextBillingDate: toISOStringDate(plan.nextBillingDate),
          url: plan.url ?? '',
          isActive: plan.isActive,
        });
      } else {
        this.form.reset({ currency: 'USD', billingCycle: 'monthly', nextBillingDate: toISOStringDate(new Date()), isActive: true });
      }
    });
  }

  getError(control: string): string {
    const ctrl = this.form.controls[control as keyof typeof this.form.controls];
    if (ctrl?.invalid && ctrl?.touched) {
      const errors: Record<string, string> = {
        name: 'Nombre requerido',
        provider: 'Proveedor requerido',
        amount: 'Monto requerido',
        nextBillingDate: 'Fecha requerida',
      };
      return errors[control] ?? '';
    }
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.save.emit({
      name: this.form.value.name!,
      provider: this.form.value.provider!,
      amount: this.form.value.amount!,
      currency: this.form.value.currency as Currency,
      billingCycle: this.form.value.billingCycle as BillingCycle,
      nextBillingDate: parseDate(this.form.value.nextBillingDate!),
      url: this.form.value.url || undefined,
      isActive: this.form.value.isActive ?? true,
    });
  }
}