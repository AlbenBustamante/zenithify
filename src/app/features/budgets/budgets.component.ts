import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent } from '../../shared/ui/components';
import { Currency, Budget, BudgetPeriod } from '../../core/domain/entities';
import { formatCurrency } from '../../shared/utils';
import { Money } from '../../core/domain/value-objects';
import { SupabaseBudgetRepository, SupabaseCategoryRepository, SupabaseExpenseRepository, SupabaseExchangeRateRepository } from '../../core/infrastructure/supabase/adapters';
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
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <app-button (clicked)="openCreateModal()">+ Nuevo Presupuesto</app-button>
      </div>

      @if (budgets().length === 0) {
        <app-card>
          <div class="text-center text-gray-500 py-8">
            <p>No hay presupuestos creados</p>
            <app-button variant="ghost" (clicked)="openCreateModal()" class="mt-2">Crear tu primer presupuesto</app-button>
          </div>
        </app-card>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (budget of budgets(); track budget.id) {
            <app-card [title]="budget.name">
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Límite</span>
                  <span class="font-medium">{{ formatMoney(budget.amount, budget.currency) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Gastado</span>
                  <span class="font-medium">{{ formatMoney(budget.utilization.spent.amount, budget.utilization.spent.currency) }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all"
                    [ngClass]="budget.utilization.isOverBudget ? 'bg-red-500' : 'bg-primary-500'"
                    [style.width.%]="Math.min(budget.utilization.percentage, 100)"
                  ></div>
                </div>
                <div class="flex justify-between text-sm">
                  <span [ngClass]="budget.utilization.isOverBudget ? 'text-red-500' : 'text-gray-500'">
                    {{ budget.utilization.percentage.toFixed(1) }}% utilizado
                  </span>
                  <span class="text-gray-500">{{ budget.period | titlecase }}</span>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                <app-button variant="ghost" size="sm" (clicked)="openEditModal(budget)">Editar</app-button>
                <app-button variant="ghost" size="sm" (clicked)="confirmDelete(budget)">Eliminar</app-button>
              </div>
            </app-card>
          }
        </div>
      }
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingBudget() ? 'Editar Presupuesto' : 'Nuevo Presupuesto'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
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
      <p class="text-gray-700">¿Estás seguro de que deseas eliminar este presupuesto?</p>
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