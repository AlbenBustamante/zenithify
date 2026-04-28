import { Component, signal, inject, OnInit } from '@angular/core';
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
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Gastos</h1>
        <app-button (clicked)="openCreateModal()">
          + Nuevo Gasto
        </app-button>
      </div>

      <div class="flex gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <input
            type="date"
            [value]="startDate()"
            (change)="onStartDateChange($event)"
            class="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <span class="text-gray-500">hasta</span>
          <input
            type="date"
            [value]="endDate()"
            (change)="onEndDateChange($event)"
            class="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <select
          [value]="selectedCategory()"
          (change)="onCategoryFilterChange($event)"
          class="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="">Todas las categorías</option>
          @for (cat of categories(); track cat.id) {
            <option [value]="cat.id">{{ cat.name }}</option>
          }
        </select>
      </div>

      <app-card [noPadding]="true">
        @if (expenses().length === 0) {
          <div class="p-8 text-center text-gray-500">
            <p>No hay gastos registrados</p>
            <app-button variant="ghost" (clicked)="openCreateModal()" class="mt-2">
              Agregar tu primer gasto
            </app-button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (expense of expenses(); track expense.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatDate(expense.expenseDate) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ expense.description }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      @if (expense.category) {
                        <app-badge variant="default">{{ expense.category.name }}</app-badge>
                      } @else {
                        <span class="text-gray-400">Sin categoría</span>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                      -{{ formatMoney(expense.amount, expense.currency) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        (click)="openEditModal(expense)"
                        class="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        (click)="confirmDelete(expense)"
                        class="text-red-600 hover:text-red-900"
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

      <div class="flex justify-between items-center">
        <p class="text-sm text-gray-500">
          Total: <span class="font-medium text-gray-900">{{ formatMoney(totalAmount(), 'USD') }}</span>
        </p>
        <div class="flex gap-2">
          <app-button variant="secondary" [disabled]="page() === 0" (clicked)="previousPage()">
            Anterior
          </app-button>
          <app-button variant="secondary" [disabled]="expenses().length < pageSize" (clicked)="nextPage()">
            Siguiente
          </app-button>
        </div>
      </div>
    </div>

    <app-modal
      [isOpen]="isModalOpen()"
      [title]="editingExpense() ? 'Editar Gasto' : 'Nuevo Gasto'"
      (close)="closeModal()"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
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
          type="text"
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
      <p class="text-gray-700">¿Estás seguro de que deseas eliminar este gasto?</p>
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