import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Currency, Budget, BudgetPeriod } from '../../core/domain/entities';
import { formatCurrency } from '../../shared/utils';
import { Money } from '../../core/domain/value-objects';
import { SupabaseBudgetRepository } from '../../core/infrastructure/supabase/adapters/supabase-budget.repository';
import { SupabaseExpenseRepository } from '../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseExchangeRateRepository } from '../../core/infrastructure/supabase/adapters/supabase-exchange-rate.repository';
import { BudgetCalculationService } from '../../core/domain/services';
import { CreateBudgetUseCase, UpdateBudgetUseCase, DeleteBudgetUseCase, ListBudgetsUseCase, GetBudgetSummaryUseCase } from '../../core/application/use-cases/budget/budget.use-cases';

interface BudgetWithUtilization extends Budget {
  utilization: {
    spent: Money;
    limit: Money;
    percentage: number;
    isOverBudget: boolean;
  };
}

@Component({
  selector: 'app-budgets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TitleCasePipe, ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-stone-100 px-4 py-8">
      <div class="max-w-7xl mx-auto space-y-8">

        <header class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 animate-slide-up">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-1 h-8 bg-primary-600 rounded-full"></span>
              <h1 class="text-4xl font-bold text-slate-900 tracking-tight">Presupuestos</h1>
            </div>
            <p class="text-slate-500 text-sm">Controla tus gastos fijos</p>
          </div>
          <app-button (clicked)="openCreateModal()">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Presupuesto
          </app-button>
        </header>

        @if (budgets().length === 0) {
          <app-card class="animate-slide-up stagger-1">
            <div class="text-center py-12">
              <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg class="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p class="text-slate-400 text-sm mb-6">No hay presupuestos creados</p>
              <app-button variant="secondary" (clicked)="openCreateModal()">Crear tu primer presupuesto</app-button>
            </div>
          </app-card>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (budget of budgets(); track budget.id; let i = $index) {
              <div class="animate-slide-up" [class]="'stagger-' + (i + 1)">
                <app-card>
                  <div class="flex items-start justify-between mb-5">
                    <div>
                      <p class="font-semibold text-slate-800">{{ budget.name }}</p>
                      <p class="text-xs text-slate-400 mt-0.5">{{ budget.period | titlecase }}</p>
                    </div>
                    <app-badge [variant]="budget.utilization.isOverBudget ? 'danger' : 'success'">
                      {{ budget.utilization.percentage.toFixed(0) }}%
                    </app-badge>
                  </div>
                  <div class="space-y-4">
                    <div class="flex justify-between">
                      <span class="text-sm text-slate-500">Límite</span>
                      <span class="font-medium text-slate-700">{{ formatMoney(budget.amount, budget.currency) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-slate-500">Gastado</span>
                      <span class="font-medium" [class]="budget.utilization.isOverBudget ? 'text-red-600' : 'text-slate-800'">
                        {{ formatMoney(budget.utilization.spent.amount, budget.utilization.spent.currency) }}
                      </span>
                    </div>
                    <div class="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        class="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                        [class]="budget.utilization.isOverBudget ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-primary-400 to-primary-600'"
                        [style.width.%]="Math.min(budget.utilization.percentage, 100)"
                      ></div>
                    </div>
                  </div>
                  <div class="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
                    <app-button variant="ghost" size="sm" (clicked)="openEditModal(budget)">Editar</app-button>
                    <app-button variant="ghost" size="sm" (clicked)="confirmDelete(budget)">Eliminar</app-button>
                  </div>
                </app-card>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingBudget() ? 'Editar Presupuesto' : 'Nuevo Presupuesto'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
        <app-input formControlName="name" label="Nombre" placeholder="Ej: Presupuesto mensual alimentación"
          [error]="form.controls['name'].invalid && form.controls['name'].touched ? 'Nombre requerido' : ''" />

        <div class="grid grid-cols-2 gap-4">
          <app-input formControlName="amount" label="Monto" type="number" placeholder="0.00"
            [error]="form.controls['amount'].invalid && form.controls['amount'].touched ? 'Monto requerido' : ''" />
          <app-select formControlName="currency" label="Moneda">
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </app-select>
        </div>

        <app-select formControlName="period" label="Período">
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
        </app-select>

        <app-input formControlName="startDate" label="Fecha de inicio" type="date"
          [error]="form.controls['startDate'].invalid && form.controls['startDate'].touched ? 'Fecha requerida' : ''" />

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingBudget() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Presupuesto" (close)="closeDeleteModal()">
      <p class="text-slate-600">¿Estás seguro de que deseas eliminar este presupuesto?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">Cancelar</app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class BudgetsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private budgetRepo = inject(SupabaseBudgetRepository);
  private expenseRepo = inject(SupabaseExpenseRepository);
  private exchangeRateRepo = inject(SupabaseExchangeRateRepository);
  private budgetCalcService = inject(BudgetCalculationService);
  private createBudgetUC = inject(CreateBudgetUseCase);
  private updateBudgetUC = inject(UpdateBudgetUseCase);
  private deleteBudgetUC = inject(DeleteBudgetUseCase);
  private listBudgetsUC = inject(ListBudgetsUseCase);
  private getBudgetSummaryUC = inject(GetBudgetSummaryUseCase);

  Math = Math;

  form = this.fb.group({
    name: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    period: ['monthly' as BudgetPeriod],
    startDate: ['', [Validators.required]],
  });

  budgets = signal<BudgetWithUtilization[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingBudget = signal<Budget | null>(null);
  deletingBudget = signal<Budget | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadBudgets();
  }

  async loadBudgets(): Promise<void> {
    const budgets = await this.budgetRepo.findAll();
    const vesRate = await this.getVESRate();

    const budgetsWithUtilization: BudgetWithUtilization[] = [];
    for (const budget of budgets) {
      const expenses = await this.expenseRepo.findByDateRange(
        budget.userId,
        new Date(budget.startDate),
        budget.endDate ?? new Date()
      );
      const utilization = this.budgetCalcService.calculateUtilization(budget, expenses, vesRate);
      budgetsWithUtilization.push({ ...budget, utilization });
    }
    this.budgets.set(budgetsWithUtilization);
  }

  private async getVESRate(): Promise<number> {
    const rate = await this.exchangeRateRepo.findByUserAndPair('', 'VES', 'USD');
    return rate?.rate ?? 1;
  }

  openCreateModal(): void {
    this.editingBudget.set(null);
    this.form.reset({
      currency: 'USD',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  openEditModal(budget: Budget): void {
    this.editingBudget.set(budget);
    this.form.patchValue({
      name: budget.name,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingBudget.set(null);
  }

  confirmDelete(budget: Budget): void {
    this.deletingBudget.set(budget);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingBudget.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const dto = {
        name: this.form.value.name!,
        amount: this.form.value.amount!,
        currency: this.form.value.currency as Currency,
        period: this.form.value.period as BudgetPeriod,
        startDate: new Date(this.form.value.startDate!),
      };
      if (this.editingBudget()) {
        await this.updateBudgetUC.execute(this.editingBudget()!.id, dto);
      } else {
        await this.createBudgetUC.execute(dto);
      }
      this.closeModal();
      await this.loadBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingBudget()) return;
    this.isLoading.set(true);
    try {
      await this.deleteBudgetUC.execute(this.deletingBudget()!.id);
      this.closeDeleteModal();
      await this.loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }
}