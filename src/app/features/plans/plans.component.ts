import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Currency, Plan, BillingCycle } from '../../core/domain/entities';
import { formatCurrency, formatShortDate, daysFromNow } from '../../shared/utils';
import { SubscriptionCycle } from '../../core/domain/value-objects';
import { SupabasePlanRepository } from '../../core/infrastructure/supabase/adapters/supabase-plan.repository';
import { CreatePlanUseCase, UpdatePlanUseCase, DeletePlanUseCase, ListPlansUseCase, RenewPlanUseCase } from '../../core/application/use-cases/plan/plan.use-cases';

@Component({
  selector: 'app-plans',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Planes y Suscripciones</h1>
          <p class="text-sm text-gray-500 mt-1">Gestiona tus suscripciones recurrentes</p>
        </div>
        <app-button (clicked)="openCreateModal()">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Plan
        </app-button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Total Mensual</p>
              <p class="text-2xl font-bold text-primary-600 mt-1">{{ formatMoney(monthlyTotal(), 'USD') }}</p>
            </div>
            <div class="p-2 bg-primary-100 rounded-lg">
              <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </app-card>
        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Total Anual</p>
              <p class="text-2xl font-bold text-primary-600 mt-1">{{ formatMoney(yearlyTotal(), 'USD') }}</p>
            </div>
            <div class="p-2 bg-primary-100 rounded-lg">
              <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </app-card>
        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Activas</p>
              <p class="text-2xl font-bold text-green-600 mt-1">{{ activePlans().length }}</p>
            </div>
            <div class="p-2 bg-green-100 rounded-lg">
              <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </app-card>
      </div>

      <app-card [noPadding]="true">
        @if (plans().length === 0) {
          <div class="p-12 text-center">
            <div class="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p class="text-gray-500 text-sm mb-4">No hay suscripciones registradas</p>
            <app-button variant="secondary" (clicked)="openCreateModal()">Agregar tu primera suscripción</app-button>
          </div>
        } @else {
          <div class="divide-y divide-gray-100">
            @for (plan of plans(); track plan.id) {
              <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700">
                    {{ plan.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ plan.name }}</p>
                    <p class="text-xs text-gray-500">{{ plan.provider }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-6">
                  <div class="text-right">
                    <p class="font-medium text-gray-900">{{ formatMoney(plan.amount, plan.currency) }}/{{ plan.billingCycle === 'monthly' ? 'mes' : 'año' }}</p>
                    <p class="text-xs" [class]="getDaysUntil(plan) <= 7 ? 'text-red-500' : 'text-gray-500'">
                      Próxima: {{ formatDate(plan.nextBillingDate) }} ({{ getDaysUntil(plan) }} días)
                    </p>
                  </div>
                  <app-badge [variant]="plan.isActive ? 'success' : 'danger'">
                    {{ plan.isActive ? 'Activo' : 'Inactivo' }}
                  </app-badge>
                  <div class="flex gap-1">
                    <app-button variant="ghost" size="sm" (clicked)="openEditModal(plan)">Editar</app-button>
                    <app-button variant="ghost" size="sm" (clicked)="confirmDelete(plan)">Eliminar</app-button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </app-card>
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingPlan() ? 'Editar Plan' : 'Nuevo Plan'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="name" label="Nombre" placeholder="Ej: Netflix"
          [error]="form.controls['name'].invalid && form.controls['name'].touched ? 'Nombre requerido' : ''" />
        <app-input formControlName="provider" label="Proveedor" placeholder="Ej: Netflix Inc."
          [error]="form.controls['provider'].invalid && form.controls['provider'].touched ? 'Proveedor requerido' : ''" />

        <div class="grid grid-cols-2 gap-4">
          <app-input formControlName="amount" label="Monto" type="number" placeholder="0.00"
            [error]="form.controls['amount'].invalid && form.controls['amount'].touched ? 'Monto requerido' : ''" />
          <app-select formControlName="currency" label="Moneda">
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </app-select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <app-select formControlName="billingCycle" label="Ciclo de facturación">
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </app-select>
          <app-input formControlName="nextBillingDate" label="Próxima facturación" type="date"
            [error]="form.controls['nextBillingDate'].invalid && form.controls['nextBillingDate'].touched ? 'Fecha requerida' : ''" />
        </div>

        <app-input formControlName="url" label="URL" type="url" placeholder="https://..." />

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingPlan() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Plan" (close)="closeDeleteModal()">
      <p class="text-gray-600">¿Estás seguro de que deseas eliminar este plan?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">Cancelar</app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class PlansComponent implements OnInit {
  private fb = inject(FormBuilder);
  private planRepo = inject(SupabasePlanRepository);
  private createPlanUC = inject(CreatePlanUseCase);
  private updatePlanUC = inject(UpdatePlanUseCase);
  private deletePlanUC = inject(DeletePlanUseCase);
  private listPlansUC = inject(ListPlansUseCase);
  private renewPlanUC = inject(RenewPlanUseCase);

  form = this.fb.group({
    name: ['', [Validators.required]],
    provider: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    billingCycle: ['monthly' as BillingCycle],
    nextBillingDate: ['', [Validators.required]],
    url: [''],
  });

  plans = signal<Plan[]>([]);
  activePlans = signal<Plan[]>([]);
  monthlyTotal = signal(0);
  yearlyTotal = signal(0);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingPlan = signal<Plan | null>(null);
  deletingPlan = signal<Plan | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadPlans();
  }

  async loadPlans(): Promise<void> {
    const plans = await this.planRepo.findAll();
    this.plans.set(plans);
    this.activePlans.set(plans.filter((p) => p.isActive));

    let monthly = 0;
    let yearly = 0;
    for (const plan of plans.filter((p) => p.isActive)) {
      const cycle = new SubscriptionCycle(plan.billingCycle, plan.nextBillingDate, plan.nextBillingDate);
      monthly += cycle.getMonthlyAmount(plan.amount);
      yearly += cycle.getYearlyAmount(plan.amount);
    }
    this.monthlyTotal.set(monthly);
    this.yearlyTotal.set(yearly);
  }

  openCreateModal(): void {
    this.editingPlan.set(null);
    this.form.reset({
      currency: 'USD',
      billingCycle: 'monthly',
      nextBillingDate: new Date().toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  openEditModal(plan: Plan): void {
    this.editingPlan.set(plan);
    this.form.patchValue({
      name: plan.name,
      provider: plan.provider,
      amount: plan.amount,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      nextBillingDate: new Date(plan.nextBillingDate).toISOString().split('T')[0],
      url: plan.url ?? '',
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingPlan.set(null);
  }

  confirmDelete(plan: Plan): void {
    this.deletingPlan.set(plan);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingPlan.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const dto = {
        name: this.form.value.name!,
        provider: this.form.value.provider!,
        amount: this.form.value.amount!,
        currency: this.form.value.currency as Currency,
        billingCycle: this.form.value.billingCycle as BillingCycle,
        nextBillingDate: new Date(this.form.value.nextBillingDate!),
        url: this.form.value.url || undefined,
      };
      if (this.editingPlan()) {
        await this.updatePlanUC.execute(this.editingPlan()!.id, dto);
      } else {
        await this.createPlanUC.execute(dto);
      }
      this.closeModal();
      await this.loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingPlan()) return;
    this.isLoading.set(true);
    try {
      await this.deletePlanUC.execute(this.deletingPlan()!.id);
      this.closeDeleteModal();
      await this.loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getDaysUntil(plan: Plan): number {
    return daysFromNow(plan.nextBillingDate);
  }

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }
}
