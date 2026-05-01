import { Injectable } from '@angular/core';
import { Budget, Expense, Income } from '../entities';
import { Money } from '../value-objects';

export interface BudgetUtilization {
  budgetId: string;
  budgetName: string;
  spent: Money;
  limit: Money;
  percentage: number;
  isOverBudget: boolean;
  categoryIds: string[];
}

@Injectable({ providedIn: 'root' })
export class BudgetCalculationService {
  calculateUtilization(
    budget: Budget,
    expenses: Expense[],
    exchangeRate: number
  ): BudgetUtilization {
    const budgetMoney = new Money(budget.amount, budget.currency);
    const startDate = new Date(budget.startDate);
    const endDate = budget.endDate ? new Date(budget.endDate) : new Date();

    const relevantExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.expenseDate);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    let totalSpent = 0;
    for (const expense of relevantExpenses) {
      const expenseAmountInBudgetCurrency = this.getAmountInCurrency(expense, budget.currency);
      totalSpent += expenseAmountInBudgetCurrency;
    }

    const spentMoney = new Money(totalSpent, budget.currency);
    const percentage = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      spent: spentMoney,
      limit: budgetMoney,
      percentage: Math.min(percentage, 100),
      isOverBudget: totalSpent > budget.amount,
      categoryIds: budget.categoryIds,
    };
  }

  calculateTotalByPeriod(
    incomes: Income[],
    expenses: Expense[],
    startDate: Date,
    endDate: Date,
    exchangeRate: number
  ): { totalIncome: Money; totalExpense: Money; netBalance: Money } {
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;

    const filterByDate = (items: (Income | Expense)[]) =>
      items.filter((item) => {
        const date = 'expenseDate' in item ? item.expenseDate : item.incomeDate;
        const itemDate = new Date(date);
        return itemDate >= startDate && itemDate <= endDate;
      });

    for (const income of filterByDate(incomes)) {
      totalIncomeUSD += this.getAmountInCurrency(income, 'USD');
    }

    for (const expense of filterByDate(expenses)) {
      totalExpenseUSD += this.getAmountInCurrency(expense, 'USD');
    }

    const totalIncome = new Money(totalIncomeUSD, 'USD');
    const totalExpense = new Money(totalExpenseUSD, 'USD');
    const netBalance = totalIncome.subtract(totalExpense);

    return { totalIncome, totalExpense, netBalance };
  }

  private getAmountInCurrency(item: Expense | Income, targetCurrency: 'USD' | 'VES'): number {
    if (targetCurrency === 'USD') {
      if ('amountUsd' in item) {
        return item.amountUsd ?? (item.amountVes ? item.amountVes / item.exchangeRate : 0);
      }
      return item.amountUsd ?? (item.amountVes ? item.amountVes / item.exchangeRate : 0);
    } else {
      if ('amountVes' in item) {
        return item.amountVes ?? (item.amountUsd ? item.amountUsd * item.exchangeRate : 0);
      }
      return item.amountVes ?? (item.amountUsd ? item.amountUsd * item.exchangeRate : 0);
    }
  }
}