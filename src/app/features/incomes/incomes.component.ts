import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Currency, Income, Category } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseIncomeRepository } from '../../core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateIncomeUseCase, UpdateIncomeUseCase, DeleteIncomeUseCase } from '../../core/application/use-cases/income/income.use-cases';

@Component({
  selector: 'app-incomes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Ingresos</h1>
          <p class="text-sm text-gray-500 mt-1">Gestiona tus ingresos mensuales</p>
        </div>
        <app-button (clicked)="openCreateModal()">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Ingreso
        </app-button>
      </div>

      <div class="flex gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              [value]="startDate()"
              (change)="onStartDateChange($event)"
              class="pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <span class="text-gray-400 text-sm">hasta</span>
          <input
            type="date"
            [value]="endDate()"
            (change)="onEndDateChange($event)"
            class="rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select [value]="selectedCategory()" (change)="onCategoryFilterChange($event)"
          class="rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500">
          <option value="">Todas las categorías</option>
          @for (cat of categories(); track cat.id) {
            <option [value]="cat.id">{{ cat.name }}</option>
          }
        </select>
      </div>

      <app-card [noPadding]="true">
        @if (incomes().length === 0) {
          <div class="p-12 text-center">
            <div class="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 112 2h-2a2 2 0 012-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v2m-6 9h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-gray-500 text-sm mb-4">No hay ingresos registrados</p>
            <app-button variant="secondary" (clicked)="openCreateModal()">Agregar tu primer ingreso</app-button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50/50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                @for (income of incomes(); track income.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500">{{ formatDate(income.incomeDate) }}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">{{ income.description }}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-sm">
                      @if (income.category) {
                        <app-badge variant="success">{{ income.category.name }}</app-badge>
                      } @else {
                        <span class="text-gray-400">Sin categoría</span>
                      }
                    </td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      +{{ formatMoney(income.amount, income.currency) }}
                    </td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-right text-sm">
                      <button (click)="openEditModal(income)" class="text-primary-600 hover:text-primary-800 mr-4 font-medium">Editar</button>
                      <button (click)="confirmDelete(income)" class="text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-card>

      <p class="text-sm text-gray-500">Total: <span class="font-semibold text-gray-900">{{ formatMoney(totalAmount(), 'USD') }}</span></p>
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
      <p class="text-gray-600">¿Estás seguro de que deseas eliminar este ingreso?</p>
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
