export interface DomainEvent {
  occurredAt: Date;
  eventType: string;
}

export interface ExpenseCreatedEvent extends DomainEvent {
  eventType: 'expense.created';
  payload: {
    expenseId: string;
    userId: string;
    amount: number;
    currency: string;
  };
}

export interface IncomeCreatedEvent extends DomainEvent {
  eventType: 'income.created';
  payload: {
    incomeId: string;
    userId: string;
    amount: number;
    currency: string;
  };
}

export interface TaskCompletedEvent extends DomainEvent {
  eventType: 'task.completed';
  payload: {
    taskId: string;
    userId: string;
    title: string;
  };
}

export interface TaskDueSoonEvent extends DomainEvent {
  eventType: 'task.due-soon';
  payload: {
    taskId: string;
    userId: string;
    title: string;
    dueDate: Date;
    daysUntilDue: number;
  };
}

export interface PlanRenewalDueEvent extends DomainEvent {
  eventType: 'plan.renewal-due';
  payload: {
    planId: string;
    userId: string;
    planName: string;
    provider: string;
    amount: number;
    currency: string;
    nextBillingDate: Date;
    daysUntilRenewal: number;
  };
}

export interface BudgetExceededEvent extends DomainEvent {
  eventType: 'budget.exceeded';
  payload: {
    budgetId: string;
    userId: string;
    budgetName: string;
    spent: number;
    limit: number;
    currency: string;
  };
}

export type DomainEventType =
  | ExpenseCreatedEvent
  | IncomeCreatedEvent
  | TaskCompletedEvent
  | TaskDueSoonEvent
  | PlanRenewalDueEvent
  | BudgetExceededEvent;