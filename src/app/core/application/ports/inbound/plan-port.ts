import { Plan, BillingCycle, Currency } from '../../domain/entities';

export interface CreatePlanDto {
  name: string;
  provider: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  nextBillingDate: Date;
  categoryId?: string;
  url?: string;
  notes?: string;
}

export interface UpdatePlanDto {
  name?: string;
  provider?: string;
  amount?: number;
  currency?: Currency;
  billingCycle?: BillingCycle;
  nextBillingDate?: Date;
  categoryId?: string;
  url?: string;
  notes?: string;
  isActive?: boolean;
}

export interface PlanPort {
  create(plan: CreatePlanDto): Promise<Plan>;
  update(id: string, plan: UpdatePlanDto): Promise<Plan>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  findAll(): Promise<Plan[]>;
  findActive(): Promise<Plan[]>;
  findUpcomingRenewals(daysAhead: number): Promise<Plan[]>;
}