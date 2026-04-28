import { Plan } from '../../../domain/entities';
import { CreatePlanDto, UpdatePlanDto } from '../inbound/plan-port';

export interface PlanRepositoryPort {
  create(plan: CreatePlanDto): Promise<Plan>;
  update(id: string, plan: UpdatePlanDto): Promise<Plan>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  findAll(): Promise<Plan[]>;
  findActive(): Promise<Plan[]>;
  findUpcomingRenewals(daysAhead: number): Promise<Plan[]>;
}