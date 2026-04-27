import { inject, Injectable } from '@angular/core';
import { IncomePort, CreateIncomeDto, UpdateIncomeDto, IncomeFilters } from '../../ports/inbound/income-port';
import { QuotaRepositoryPort } from '../../ports/outbound/quota-repository-port';
import { Income } from '../../../domain/entities';
import { QuotaEnforcementService } from '../../../domain/services';

@Injectable()
export class CreateIncomeUseCase {
  private incomePort = inject(IncomePort);
  private quotaRepo = inject(QuotaRepositoryPort);
  private quotaService = inject(QuotaEnforcementService);

  async execute(dto: CreateIncomeDto, userId: string, isPremium: boolean): Promise<Income> {
    const quota = await this.quotaRepo.findByUserId(userId);
    if (!quota) throw new Error('Quota not found');

    const quotaStatus = this.quotaService.checkQuota(quota, 'income', isPremium);
    if (quotaStatus.isExceeded) {
      throw new Error(`Freemium limit reached. Upgrade to premium to add more incomes.`);
    }

    const income = await this.incomePort.create(dto);
    await this.quotaRepo.incrementQuota(userId, 'income');
    return income;
  }
}

@Injectable()
export class UpdateIncomeUseCase {
  private incomePort = inject(IncomePort);

  async execute(id: string, dto: UpdateIncomeDto): Promise<Income> {
    return this.incomePort.update(id, dto);
  }
}

@Injectable()
export class DeleteIncomeUseCase {
  private incomePort = inject(IncomePort);
  private quotaRepo = inject(QuotaRepositoryPort);

  async execute(id: string, userId: string): Promise<void> {
    const income = await this.incomePort.findById(id);
    if (!income) throw new Error('Income not found');

    await this.incomePort.delete(id);
    await this.quotaRepo.decrementQuota(userId, 'income');
  }
}

@Injectable()
export class ListIncomesUseCase {
  private incomePort = inject(IncomePort);

  async execute(filters?: IncomeFilters): Promise<Income[]> {
    return this.incomePort.findAll(filters);
  }
}