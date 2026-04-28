import { inject, Injectable } from '@angular/core';
import { BUDGET_PORT, EXPENSE_REPOSITORY_PORT, EXCHANGE_RATE_REPOSITORY_PORT } from '../../ports/ports.tokens';
import { CreateBudgetDto, UpdateBudgetDto } from '../../ports/inbound/budget-port';
import { BudgetRepositoryPort } from '../../ports/outbound/budget-repository-port';
import { ExpenseRepositoryPort } from '../../ports/outbound/expense-repository-port';
import { ExchangeRateRepositoryPort } from '../../ports/outbound/exchange-rate-repository-port';
import { Budget } from '../../../domain/entities';
import { BudgetCalculationService, BudgetUtilization } from '../../../domain/services';

@Injectable({ providedIn: 'root' })
export class CreateBudgetUseCase {
  private budgetPort = inject(BUDGET_PORT);

  async execute(dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetPort.create(dto);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateBudgetUseCase {
  private budgetPort = inject(BUDGET_PORT);

  async execute(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    return this.budgetPort.update(id, dto);
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteBudgetUseCase {
  private budgetPort = inject(BUDGET_PORT);

  async execute(id: string): Promise<void> {
    return this.budgetPort.delete(id);
  }
}

@Injectable({ providedIn: 'root' })
export class ListBudgetsUseCase {
  private budgetPort = inject(BUDGET_PORT);

  async execute(): Promise<Budget[]> {
    return this.budgetPort.findAll();
  }
}

@Injectable({ providedIn: 'root' })
export class GetBudgetSummaryUseCase {
  private budgetPort = inject(BUDGET_PORT);
  private expenseRepo = inject(EXPENSE_REPOSITORY_PORT);
  private exchangeRateRepo = inject(EXCHANGE_RATE_REPOSITORY_PORT);
  private budgetCalcService = inject(BudgetCalculationService);

  async execute(userId: string): Promise<BudgetUtilization[]> {
    const budgets = await this.budgetPort.findActive();
    const exchangeRate = await this.getExchangeRate(userId);

    const utilizations: BudgetUtilization[] = [];
    for (const budget of budgets) {
      const expenses = await this.expenseRepo.findByDateRange(
        userId,
        new Date(budget.startDate),
        budget.endDate ?? new Date()
      );

      utilizations.push(
        this.budgetCalcService.calculateUtilization(budget, expenses, exchangeRate)
      );
    }

    return utilizations;
  }

  private async getExchangeRate(userId: string): Promise<number> {
    const rate = await this.exchangeRateRepo.findByUserAndPair(userId, 'VES', 'USD');
    return rate?.rate ?? 1;
  }
}