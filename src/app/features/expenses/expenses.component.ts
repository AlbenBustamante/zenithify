import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Currency, Expense, Category } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseExpenseRepository } from '../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateExpenseUseCase, UpdateExpenseUseCase, DeleteExpenseUseCase, ListExpensesUseCase } from '../../core/application/use-cases/expense/expense.use-cases';

@Component({
  selector: 'app-expenses',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-stone-100 px-4 py-8">
      <div class="max-w-7xl mx-auto space-y-8">

        <header class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 animate-slide-up">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-1 h-8 bg-red-500 rounded-full"></span>
              <h1 class="text-4xl font-bold text-slate-900 tracking-tight">Gastos</h1>
            </div>
            <p class="text-slate-500 text-sm">Gestiona tus gastos mensuales</p>
          </div>
          <app-button (clicked)="openCreateModal()">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Gasto
          </app-button>
        </header>

        <div class="flex gap-4 flex-wrap animate-slide-up stagger-1">
          <div class="flex items-center gap-2">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                [value]="startDate()"
                (change)="onStartDateChange($event)"
                class="pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <span class="text-slate-400 text-sm">hasta</span>
            <input
              type="date"
              [value]="endDate()"
              (change)="onEndDateChange($event)"
              class="rounded-xl border border-slate-200 bg-white/80 py-2.5 px-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>

          <select
            [value]="selectedCategory()"
            (change)="onCategoryFilterChange($event)"
            class="rounded-xl border border-slate-200 bg-white/80 py-2.5 px-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="">Todas las categorías</option>
            @for (cat of categories(); track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>

        <app-card [noPadding]="true" class="animate-slide-up stagger-2">
          @if (expenses().length === 0) {
            <div class="p-16 text-center">
              <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50/80 flex items-center justify-center">
                <svg class="w-10 h-10 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-slate-400 text-sm mb-6">No hay gastos registrados</p>
              <app-button variant="secondary" (clicked)="openCreateModal()">Agregar tu primer gasto</app-button>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-100">
                <thead class="bg-slate-50/50">
                  <tr>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                    <th class="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                    <th class="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-100">
                  @for (expense of expenses(); track expense.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors duration-200">
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {{ formatDate(expense.expenseDate) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        {{ expense.description }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm">
                        @if (expense.category) {
                          <app-badge variant="default">{{ expense.category.name }}</app-badge>
                        } @else {
                          <span class="text-slate-400">Sin categoría</span>
                        }
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                        -{{ formatMoney(expense.amount, expense.currency) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          (click)="openEditModal(expense)"
                          class="text-primary-600 hover:text-primary-800 mr-5 font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          (click)="confirmDelete(expense)"
                          class="text-red-600 hover:text-red-800 font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </app-card>

        <div class="flex justify-between items-center text-sm animate-slide-up stagger-3">
          <p class="text-slate-500">
            Total: <span class="font-semibold text-slate-800">{{ formatMoney(totalAmount(), 'USD') }}</span>
          </p>
          <div class="flex gap-2">
            <app-button variant="secondary" size="sm" [disabled]="page() === 0" (clicked)="previousPage()">
              Anterior
            </app-button>
            <app-button variant="secondary" size="sm" [disabled]="expenses().length < pageSize" (clicked)="nextPage()">
              Siguiente
            </app-button>
          </div>
        </div>
      </div>
    </div>

    <app-modal
      [isOpen]="isModalOpen()"
      [title]="editingExpense() ? 'Editar Gasto' : 'Nuevo Gasto'"
      (close)="closeModal()"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
        <app-input
          formControlName="description"
          label="Descripción"
          placeholder="Ej: Compra en supermercado"
          [error]="form.controls['description'].invalid && form.controls['description'].touched ? 'Descripción requerida' : ''"
        />

        <div class="grid grid-cols-2 gap-4">
          <app-input
            formControlName="amount"
            label="Monto"
            type="number"
            placeholder="0.00"
            [error]="form.controls['amount'].invalid && form.controls['amount'].touched ? 'Monto requerido' : ''"
          />

          <app-select
            formControlName="currency"
            label="Moneda"
          >
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </app-select>
        </div>

        <app-select
          formControlName="categoryId"
          label="Categoría"
        >
          <option value="">Sin categoría</option>
          @for (cat of categories(); track cat.id) {
            <option [value]="cat.id">{{ cat.name }}</option>
          }
        </app-select>

        <app-input
          formControlName="expenseDate"
          label="Fecha"
          type="date"
          [error]="form.controls['expenseDate'].invalid && form.controls['expenseDate'].touched ? 'Fecha requerida' : ''"
        />

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">
            Cancelar
          </app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingExpense() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal
      [isOpen]="isDeleteModalOpen()"
      title="Eliminar Gasto"
      (close)="closeDeleteModal()"
    >
      <p class="text-slate-600">¿Estás seguro de que deseas eliminar este gasto?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">
          Cancelar
        </app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">
          Eliminar
        </app-button>
      </div>
    </app-modal>
  `,
})
export class ExpensesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expenseRepo = inject(SupabaseExpenseRepository);
  private categoryRepo = inject(SupabaseCategoryRepository);
  private createExpenseUC = inject(CreateExpenseUseCase);
  private updateExpenseUC = inject(UpdateExpenseUseCase);
  private deleteExpenseUC = inject(DeleteExpenseUseCase);
  private listExpensesUC = inject(ListExpensesUseCase);

  form = this.fb.group({
    description: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    categoryId: [''],
    expenseDate: ['', [Validators.required]],
  });

  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingExpense = signal<Expense | null>(null);
  deletingExpense = signal<Expense | null>(null);
  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedCategory = signal('');
  page = signal(0);
  pageSize = 20;
  totalAmount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadExpenses();
  }

  async loadExpenses(): Promise<void> {
    try {
      const filters: { startDate?: Date; endDate?: Date; categoryId?: string } = {
        startDate: new Date(this.startDate()),
        endDate: new Date(this.endDate()),
      };
      if (this.selectedCategory()) {
        filters.categoryId = this.selectedCategory();
      }

      const expenses = await this.expenseRepo.findAll(filters);
      this.expenses.set(expenses);
      this.totalAmount.set(expenses.reduce((sum, e) => sum + e.amount, 0));
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      const categories = await this.categoryRepo.findByType('expense');
      this.categories.set(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  openCreateModal(): void {
    this.editingExpense.set(null);
    this.form.reset({
      currency: 'USD',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  openEditModal(expense: Expense): void {
    this.editingExpense.set(expense);
    this.form.patchValue({
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      categoryId: expense.categoryId ?? '',
      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingExpense.set(null);
  }

  confirmDelete(expense: Expense): void {
    this.deletingExpense.set(expense);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingExpense.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    try {
      const dto = {
        description: this.form.value.description!,
        amount: this.form.value.amount!,
        currency: this.form.value.currency as Currency,
        categoryId: this.form.value.categoryId || undefined,
        expenseDate: new Date(this.form.value.expenseDate!),
      };

      if (this.editingExpense()) {
        await this.updateExpenseUC.execute(this.editingExpense()!.id, dto);
      } else {
        await this.createExpenseUC.execute(dto, '', false);
      }

      this.closeModal();
      await this.loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingExpense()) return;

    this.isLoading.set(true);
    try {
      await this.deleteExpenseUC.execute(this.deletingExpense()!.id, '');
      this.closeDeleteModal();
      await this.loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onStartDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.startDate.set(target.value);
    this.loadExpenses();
  }

  onEndDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endDate.set(target.value);
    this.loadExpenses();
  }

  onCategoryFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedCategory.set(target.value);
    this.loadExpenses();
  }

  previousPage(): void {
    this.page.update((p) => Math.max(0, p - 1));
    this.loadExpenses();
  }

  nextPage(): void {
    this.page.update((p) => p + 1);
    this.loadExpenses();
  }

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}