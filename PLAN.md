# Zenithify - Personal SaaS Management Platform

## Overview
Personal financial and productivity management SaaS with budget tracking, subscriptions, tasks, and bookmarks.

## Stack
| Layer | Technology |
|-------|------------|
| Frontend | Angular 21 (standalone) + TailwindCSS 4 |
| Backend | Supabase (PostgreSQL + Auth) |
| Email | Edge Functions + Resend |
| Tests | Vitest |
| Multi-tenancy | Row Level Security (RLS) |

## Monetization: Freemium Model
| Resource | Free | Premium |
|----------|------|---------|
| Bookmarks/month | 10 | Unlimited |
| Tasks/month | 30 | Unlimited |
| Expenses/month | 15 | Unlimited |
| Incomes/month | 15 | Unlimited |
| Categories | System only | System + Custom |

## Currency Configuration
- Default: USD
- Secondary: VES (Venezuelan Bolívares)
- Exchange rate API: https://ve.dolarapi.com/v1/dolares
- Users can view official rate but override freely

## Authentication
- Email/password via Supabase Auth
- Google OAuth via Supabase Auth (pre-configured)

## Database Schema

### Tables
- `profiles` - User profile extending auth.users
- `categories` - Predefined + user-created categories
- `expenses` - Expense transactions
- `incomes` - Income transactions
- `budgets` - Budget limits (weekly/monthly/yearly)
- `plans` - Recurring subscriptions (Netflix, Spotify, etc.)
- `tasks` - Todo items with priority and due dates
- `bookmarks` - Web bookmarks with favicons
- `exchange_rates` - User-defined custom exchange rates
- `notifications` - In-app notifications
- `user_quotas` - Freemium usage tracking

### RLS Policy
All tables enforce Row Level Security - users can only access their own data.

## Order of Implementation

1. **Core + Auth** → Schema SQL + Supabase client + Auth flow
2. **Expenses + Incomes** → CRUD + Categories + Quota enforcement
3. **Budgets + Plans** → Budget calculations + Renewal tracking
4. **Tasks + Bookmarks** → CRUD + Priority/Tags
5. **Dashboard** → Fixed widgets + Statistics
6. **Notifications** → Edge Functions + In-app UI
7. **Tests** → Vitest unit tests per layer

## Features

### Authentication
- Email/password sign up & sign in
- Google OAuth sign in
- Password reset via email
- Session management

### Dashboard
Fixed widgets:
- Monthly expenses total (USD + VES)
- Monthly incomes total (USD + VES)
- Net balance
- Budget utilization bars
- Upcoming subscription renewals
- Pending tasks count
- Recent transactions (last 5)

### Expenses CRUD
- Create/edit/delete expenses
- Categories (predefined + custom)
- Multi-currency (USD + VES with custom rates)
- Date filtering
- Receipt image upload

### Incomes CRUD
- Create/edit/delete incomes
- Categories (predefined + custom)
- Multi-currency
- Date filtering

### Budgets
- Create budgets by period (weekly/monthly/yearly)
- Category-based budgets
- Automatic utilization calculation
- Alerts when approaching limit

### Plans (Subscriptions)
- Track recurring payments (Netflix, Spotify, etc.)
- Monthly/yearly billing cycles
- Automatic renewal reminders
- Total monthly/yearly spend calculation

### Tasks
- Create/edit/delete tasks
- Priority levels (low/medium/high)
- Due dates
- Status workflow (pending/in_progress/completed)
- Category tagging

### Bookmarks
- Save URLs with title/description
- Automatic favicon fetching
- Category tagging
- Tags support

### Categories
- System categories (non-deletable)
- User-created categories
- Icon and color customization

### Exchange Rates
- Fetch official VES rate from ve.dolarapi.com
- Users can override rates manually
- Historical rate storage

### Notifications
- Task due date reminders
- Plan renewal alerts
- Budget limit warnings
- In-app notification center

## Project Structure (Hexagonal Architecture)

```
src/
├── app/
│   ├── core/
│   │   ├── domain/           # Business entities, value objects, events
│   │   ├── application/      # Use cases, ports (interfaces), DTOs
│   │   └── infrastructure/   # Adapters (Supabase, email implementations)
│   ├── shared/               # UI components, utils, interceptors, guards
│   └── features/             # Lazy-loaded feature modules
├── environments/
└── styles.css
```

## Edge Functions (Supabase)

- `send-notification/` - Send email/in-app notifications
- `check-plan-renewals/` - Cron job to check upcoming renewals
- `fetch-exchange-rate/` - Fetch VES rate from DolarAPI
