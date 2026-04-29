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
import {
  CreatePlanUseCase,
  UpdatePlanUseCase,
  DeletePlanUseCase,
  ListPlansUseCase,
  RenewPlanUseCase,
} from '../../core/application/use-cases/plan/plan.use-cases';

@Component({
  selector: 'app-plans',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    ButtonComponent,
    InputComponent,
    ModalComponent,
    SelectComponent,
    BadgeComponent,
  ],
  templateUrl: './plans.component.html',
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
      const cycle = new SubscriptionCycle(
        plan.billingCycle,
        plan.nextBillingDate,
        plan.nextBillingDate,
      );
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
