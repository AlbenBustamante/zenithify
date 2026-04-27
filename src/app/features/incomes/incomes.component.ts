import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent } from '../../shared/ui/components';
import { Currency, Income, Category } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseIncomeRepository, SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters';
import { CreateIncomeUseCase, UpdateIncomeUseCase, DeleteIncomeUseCase } from '../../core/application/use-cases/income/income.use-cases';

@Component({
  selector: 'app-incomes',
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Ingresos</h1>
        <app-button (clicked)="openCreateModal()">+ Nuevo Ingreso</app-button>
      </div>

      <div class="flex gap-4 flex-wrap">
        <input type="date" [value]="startDate()" (change)="onStartDateChange($event)"
          class="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
        <span class="text-gray-500">hasta</span>
        <input type="date" [value]="endDate()" (change)="onEndDateChange($event)"
          class="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />

        <select [value]="selectedCategory()" (change)="onCategoryFilterChange($event)"
          class="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
          <option value="">Todas las categorías</option>
          @for (cat of categories(); track cat.id) {
            <option [value]="cat.id">{{ cat.name }}</option>
          }
        </select>
      </div>

      <app-card [noPadding]="true">
        @if (incomes().length === 0) {
          <div class="p-8 text-center text-gray-500">
            <p>No hay ingresos registrados</p>
            <app-button variant="ghost" (clicked)="openCreateModal()" class="mt-2">Agregar tu primer ingreso</app-button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (income of incomes(); track income.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(income.incomeDate) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ income.description }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      @if (income.category) {
                        <app-badge variant="success">{{ income.category.name }}</app-badge>
                      } @else {
                        <span class="text-gray-400">Sin categoría</span>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      +{{ formatMoney(income.amount, income.currency) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button (click)="openEditModal(income)" class="text-primary-600 hover:text-primary-900 mr-3">Editar</button>
                      <button (click)="confirmDelete(income)" class="text-red-600 hover:text-red-900">Eliminar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-card>

      <p class="text-sm text-gray-500">Total: <span class="font-medium text-gray-900">{{ formatMoney(totalAmount(), 'USD') }}</span></p>
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingIncome() ? 'Editar Ingreso' : 'Nuevo Ingreso'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="description" label="Descripción" placeholder="Ej: Pago de nómina"
          [error]="form.controls['description'].invalid && form.controls['description'].touched ? 'Descripción requerida' : ''" />

        <div class="grid grid-cols-2 gap-4">
          <app-input formControlName="amount" label="Monto" type="number" placeholder="0.00"
            [error]="form.controls['amount'].invalid && form.controls['amount'].touched ? 'Monto requerido' : ''" />
          <app-select formControlName="currency" label="Moneda">
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </app-select>
        </div>

        <app-select formControlName="categoryId" label="Categoría">
          <option value="">Sin categoría</option>
          @for (cat of categories(); track cat.id) {
            <option [value]="cat.id">{{ cat.name }}</option>
          }
        </app-select>

        <app-input formControlName="incomeDate" label="Fecha" type="date"
          [error]="form.controls['incomeDate'].invalid && form.controls['incomeDate'].touched ? 'Fecha requerida' : ''" />

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingIncome() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Ingreso" (close)="closeDeleteModal()">
      <p class="text-gray-700">¿Estás seguro de que deseas eliminar este ingreso?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">Cancelar</app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class IncomesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private incomeRepo = inject(SupabaseIncomeRepository);
  private categoryRepo = inject(SupabaseCategoryRepository);
  private createIncomeUC = inject(CreateIncomeUseCase);
  private updateIncomeUC = inject(UpdateIncomeUseCase);
  private deleteIncomeUC = inject(DeleteIncomeUseCase);

  form = this.fb.group({
    description: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    categoryId: [''],
    incomeDate: ['', [Validators.required]],
  });

  incomes = signal<Income[]>([]);
  categories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingIncome = signal<Income | null>(null);
  deletingIncome = signal<Income | null>(null);
  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedCategory = signal('');
  totalAmount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadIncomes();
  }

  async loadIncomes(): Promise<void> {
    const filters: { startDate?: Date; endDate?: Date; categoryId?: string } = {
      startDate: new Date(this.startDate()),
      endDate: new Date(this.endDate()),
    };
    if (this.selectedCategory()) filters.categoryId = this.selectedCategory();
    const incomes = await this.incomeRepo.findAll(filters);
    this.incomes.set(incomes);
    this.totalAmount.set(incomes.reduce((sum, i) => sum + i.amount, 0));
  }

  async loadCategories(): Promise<void> {
    const categories = await this.categoryRepo.findByType('income');
    this.categories.set(categories);
  }

  openCreateModal(): void {
    this.editingIncome.set(null);
    this.form.reset({ currency: 'USD', incomeDate: new Date().toISOString().split('T')[0] });
    this.isModalOpen.set(true);
  }

  openEditModal(income: Income): void {
    this.editingIncome.set(income);
    this.form.patchValue({
      description: income.description,
      amount: income.amount,
      currency: income.currency,
      categoryId: income.categoryId ?? '',
      incomeDate: new Date(income.incomeDate).toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingIncome.set(null);
  }

  confirmDelete(income: Income): void {
    this.deletingIncome.set(income);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingIncome.set(null);
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
        incomeDate: new Date(this.form.value.incomeDate!),
      };
      if (this.editingIncome()) {
        await this.updateIncomeUC.execute(this.editingIncome()!.id, dto);
      } else {
        await this.createIncomeUC.execute(dto, '', false);
      }
      this.closeModal();
      await this.loadIncomes();
    } catch (error) {
      console.error('Error saving income:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingIncome()) return;
    this.isLoading.set(true);
    try {
      await this.deleteIncomeUC.execute(this.deletingIncome()!.id, '');
      this.closeDeleteModal();
      await this.loadIncomes();
    } catch (error) {
      console.error('Error deleting income:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onStartDateChange(event: Event): void {
    this.startDate.set((event.target as HTMLInputElement).value);
    this.loadIncomes();
  }

  onEndDateChange(event: Event): void {
    this.endDate.set((event.target as HTMLInputElement).value);
    this.loadIncomes();
  }

  onCategoryFilterChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.loadIncomes();
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