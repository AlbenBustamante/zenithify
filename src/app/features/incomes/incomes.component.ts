import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Income, Category, IncomeMethod } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseIncomeRepository } from '../../core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateIncomeUseCase, UpdateIncomeUseCase, DeleteIncomeUseCase } from '../../core/application/use-cases/income/income.use-cases';
import { CurrencyConversionService } from '../../core/domain/services/currency-conversion.service';
import { environment } from '../../../environments/environment';

function atLeastOneAmountValidator(control: AbstractControl): ValidationErrors | null {
  const amountUsd = control.get('amountUsd')?.value;
  const amountVes = control.get('amountVes')?.value;
  if (!amountUsd && !amountVes) {
    return { required: true };
  }
  return null;
}

@Component({
  selector: 'app-incomes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent, DecimalPipe],
  templateUrl: './incomes.component.html',
})
export class IncomesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private incomeRepo = inject(SupabaseIncomeRepository);
  private categoryRepo = inject(SupabaseCategoryRepository);
  private createIncomeUC = inject(CreateIncomeUseCase);
  private updateIncomeUC = inject(UpdateIncomeUseCase);
  private deleteIncomeUC = inject(DeleteIncomeUseCase);
  private currencyService = inject(CurrencyConversionService);

  incomeMethods: { value: IncomeMethod; label: string }[] = [
    { value: 'salario', label: 'Salario' },
    { value: 'remesa', label: 'Remesa' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'inversiones', label: 'Inversiones' },
    { value: 'regalo', label: 'Regalo' },
    { value: 'venta', label: 'Venta' },
    { value: 'premio', label: 'Premio' },
    { value: 'becas', label: 'Becas' },
    { value: 'herencia', label: 'Herencia' },
    { value: 'otro', label: 'Otro' },
  ];

  form = this.fb.group(
    {
      description: ['', [Validators.required]],
      amountUsd: [null as number | null],
      amountVes: [null as number | null],
      exchangeRate: [null as number | null, [Validators.required, Validators.min(0.01)]],
      categoryId: [''],
      incomeDate: ['', [Validators.required]],
      incomeMethod: ['salario' as IncomeMethod],
    },
    { validators: atLeastOneAmountValidator }
  );

  incomes = signal<Income[]>([]);
  categories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isRateDialogOpen = signal(false);
  isLoading = signal(false);
  editingIncome = signal<Income | null>(null);
  deletingIncome = signal<Income | null>(null);
  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedCategory = signal('');
  totalAmount = signal(0);

  officialRate = signal<number | null>(null);
  activeAmountField = signal<'usd' | 'ves' | null>(null);
  pendingRateValue = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadIncomes();
    await this.fetchOfficialRate();
  }

  async loadIncomes(): Promise<void> {
    const filters: { startDate?: Date; endDate?: Date; categoryId?: string } = {
      startDate: new Date(this.startDate()),
      endDate: new Date(this.endDate()),
    };
    if (this.selectedCategory()) filters.categoryId = this.selectedCategory();
    const incomes = await this.incomeRepo.findAll(filters);
    this.incomes.set(incomes);
    this.totalAmount.set(
      incomes.reduce((sum, i) => {
        const usd = i.amountUsd ?? 0;
        const ves = i.amountVes ?? 0;
        return sum + (usd > 0 ? usd : ves / i.exchangeRate);
      }, 0)
    );
  }

  async loadCategories(): Promise<void> {
    const categories = await this.categoryRepo.findByType('income');
    this.categories.set(categories);
  }

  async fetchOfficialRate(): Promise<void> {
    try {
      const rate = await this.currencyService.fetchOfficialVESRate(environment.dolarApiUrl);
      this.officialRate.set(rate);
    } catch (error) {
      console.error('Error fetching official rate:', error);
    }
  }

  refreshRate(): void {
    this.currencyService.clearCache();
    this.fetchOfficialRate();
  }

  openCreateModal(): void {
    this.editingIncome.set(null);
    const rate = this.officialRate() ?? 500;
    this.form.reset({
      amountUsd: null,
      amountVes: null,
      exchangeRate: rate,
      incomeDate: new Date().toISOString().split('T')[0],
      incomeMethod: 'salario',
      categoryId: '',
      description: '',
    });
    this.activeAmountField.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(income: Income): void {
    this.editingIncome.set(income);
    const rate = income.exchangeRate;
    this.form.patchValue({
      description: income.description,
      amountUsd: income.amountUsd ?? null,
      amountVes: income.amountVes ?? null,
      exchangeRate: rate,
      categoryId: income.categoryId ?? '',
      incomeDate: new Date(income.incomeDate).toISOString().split('T')[0],
      incomeMethod: income.incomeMethod,
    });
    const hasUsd = income.amountUsd != null;
    const hasVes = income.amountVes != null;
    this.activeAmountField.set(hasUsd ? 'usd' : hasVes ? 'ves' : null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingIncome.set(null);
    this.isRateDialogOpen.set(false);
  }

  confirmDelete(income: Income): void {
    this.deletingIncome.set(income);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingIncome.set(null);
  }

  onAmountUsdChange(): void {
    this.activeAmountField.set('usd');
    const usd = this.form.value.amountUsd;
    const rate = this.form.value.exchangeRate;
    if (usd && rate && rate > 0) {
      this.form.patchValue({ amountVes: usd * rate }, { emitEvent: false });
    }
  }

  onAmountVesChange(): void {
    this.activeAmountField.set('ves');
    const ves = this.form.value.amountVes;
    const rate = this.form.value.exchangeRate;
    if (ves && rate && rate > 0) {
      this.form.patchValue({ amountUsd: ves / rate }, { emitEvent: false });
    }
  }

  onExchangeRateChange(): void {
    const currentUsd = this.form.value.amountUsd;
    const currentVes = this.form.value.amountVes;
    const newRate = this.form.value.exchangeRate;

    if (!newRate || newRate <= 0) return;

    if (currentUsd && currentVes) {
      this.pendingRateValue.set(newRate);
      this.isRateDialogOpen.set(true);
    } else if (this.activeAmountField() === 'usd' && currentUsd) {
      this.form.patchValue({ amountVes: currentUsd * newRate }, { emitEvent: false });
    } else if (this.activeAmountField() === 'ves' && currentVes) {
      this.form.patchValue({ amountUsd: currentVes / newRate }, { emitEvent: false });
    }
  }

  keepVesOnRateChange(): void {
    const newRate = this.pendingRateValue();
    const currentVes = this.form.value.amountVes;
    if (newRate && currentVes) {
      this.form.patchValue({ exchangeRate: newRate, amountUsd: currentVes / newRate }, { emitEvent: false });
    }
    this.isRateDialogOpen.set(false);
  }

  keepUsdOnRateChange(): void {
    const newRate = this.pendingRateValue();
    const currentUsd = this.form.value.amountUsd;
    if (newRate && currentUsd) {
      this.form.patchValue({ exchangeRate: newRate, amountVes: currentUsd * newRate }, { emitEvent: false });
    }
    this.isRateDialogOpen.set(false);
  }

  cancelRateChange(): void {
    this.form.patchValue({ exchangeRate: this.officialRate() ?? 500 }, { emitEvent: false });
    this.isRateDialogOpen.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const dto = {
        description: this.form.value.description!,
        amountUsd: this.form.value.amountUsd ?? undefined,
        amountVes: this.form.value.amountVes ?? undefined,
        exchangeRate: this.form.value.exchangeRate!,
        categoryId: this.form.value.categoryId || undefined,
        incomeDate: new Date(this.form.value.incomeDate!),
        incomeMethod: this.form.value.incomeMethod!,
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

  formatMoney(amount: number, currency: 'USD' | 'VES'): string {
    return formatCurrency(amount, currency);
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }

  getAmountInUSD(income: Income): number {
    if (income.amountUsd) return income.amountUsd;
    if (income.amountVes) return income.amountVes / income.exchangeRate;
    return 0;
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