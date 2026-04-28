import { inject, Injectable } from '@angular/core';
import { PLAN_PORT } from '../../ports/ports.tokens';
import { CreatePlanDto, UpdatePlanDto } from '../../ports/inbound/plan-port';
import { Plan } from '../../../domain/entities';
import { SubscriptionCycle } from '../../../domain/value-objects';

@Injectable()
export class CreatePlanUseCase {
  private planPort = inject(PLAN_PORT);

  async execute(dto: CreatePlanDto): Promise<Plan> {
    return this.planPort.create(dto);
  }
}

@Injectable()
export class UpdatePlanUseCase {
  private planPort = inject(PLAN_PORT);

  async execute(id: string, dto: UpdatePlanDto): Promise<Plan> {
    return this.planPort.update(id, dto);
  }
}

@Injectable()
export class DeletePlanUseCase {
  private planPort = inject(PLAN_PORT);

  async execute(id: string): Promise<void> {
    return this.planPort.delete(id);
  }
}

@Injectable()
export class ListPlansUseCase {
  private planPort = inject(PLAN_PORT);

  async execute(): Promise<Plan[]> {
    return this.planPort.findAll();
  }
}

@Injectable()
export class RenewPlanUseCase {
  private planPort = inject(PLAN_PORT);

  async execute(id: string): Promise<Plan> {
    const plan = await this.planPort.findById(id);
    if (!plan) throw new Error('Plan not found');

    const cycle = new SubscriptionCycle(
      plan.billingCycle,
      plan.nextBillingDate,
      plan.nextBillingDate
    );
    const nextBillingDate = cycle.calculateNextBillingDate();

    return this.planPort.update(id, { nextBillingDate });
  }
}

@Injectable()
export class GetUpcomingRenewalsUseCase {
  private planPort = inject(PLAN_PORT);

  async execute(daysAhead: number = 7): Promise<Plan[]> {
    return this.planPort.findUpcomingRenewals(daysAhead);
  }
}