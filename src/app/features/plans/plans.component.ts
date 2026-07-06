import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Currency, Plan, BillingCycle } from '../../core/domain/entities';
import { formatCurrency } from '../../shared/utils';
import { SubscriptionCycle } from '../../core/domain/value-objects';
import { SupabasePlanRepository } from '../../core/infrastructure/supabase/adapters/supabase-plan.repository';
import {
  CreatePlanUseCase,
  UpdatePlanUseCase,
  DeletePlanUseCase,
  ListPlansUseCase,
} from '../../core/application/use-cases/plan/plan.use-cases';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { PlansStatsComponent } from './components/plans-stats/plans-stats.component';
import { PlansListComponent } from './components/plans-list/plans-list.component';
import { PlanFormModalComponent } from './components/plan-form-modal/plan-form-modal.component';
import { PlanDeleteModalComponent } from './components/plan-delete-modal/plan-delete-modal.component';

@Component({
  selector: 'app-plans',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonComponent,
    PlansStatsComponent,
    PlansListComponent,
    PlanFormModalComponent,
    PlanDeleteModalComponent,
  ],
  templateUrl: './plans.component.html',
  host: {
    class: 'overflow-visible'
  }
})
export class PlansComponent implements OnInit {
  private planRepo = inject(SupabasePlanRepository);
  private createPlanUC = inject(CreatePlanUseCase);
  private updatePlanUC = inject(UpdatePlanUseCase);
  private deletePlanUC = inject(DeletePlanUseCase);
  private listPlansUC = inject(ListPlansUseCase);

  plans = signal<Plan[]>([]);
  activePlans = signal<Plan[]>([]);
  monthlyTotal = signal(0);
  yearlyTotal = signal(0);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  isDataLoading = signal(true);
  editingPlan = signal<Plan | null>(null);
  deletingPlan = signal<Plan | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadPlans();
  }

  async loadPlans(): Promise<void> {
    try {
      const plans = await this.planRepo.findAll();
      this.plans.set(plans);
      this.activePlans.set(plans.filter((p) => p.isActive));

      let monthly = 0;
      let yearly = 0;
      for (const plan of plans.filter((p) => p.isActive)) {
        const cycle = new SubscriptionCycle(
          plan.billingCycle,
          plan.createdAt,
          plan.nextBillingDate,
        );
        monthly += cycle.getMonthlyAmount(plan.amount);
        yearly += cycle.getYearlyAmount(plan.amount);
      }
      this.monthlyTotal.set(monthly);
      this.yearlyTotal.set(yearly);
    } finally {
      this.isDataLoading.set(false);
    }
  }

  openCreateModal(): void {
    this.editingPlan.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(plan: Plan): void {
    this.editingPlan.set(plan);
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

  async onSave(dto: { name: string; provider: string; amount: number; currency: Currency; billingCycle: BillingCycle; nextBillingDate: Date; url?: string; isActive: boolean }): Promise<void> {
    this.isLoading.set(true);
    try {
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

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }
}
