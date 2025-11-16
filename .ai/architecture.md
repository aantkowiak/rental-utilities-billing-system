# Rental Utilities Billing System - Architecture Documentation

## Component & Dependency Map

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                     RENTAL UTILITIES BILLING SYSTEM                                │
│                         Component & Dependency Map                                 │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────┐
│                              TECHNOLOGY STACK                                       │
├────────────────────────────────────────────────────────────────────────────────────┤
│  Framework: Astro 5 + React 19                                                     │
│  Language:  TypeScript 5                                                           │
│  Styling:   Tailwind CSS 4 + Shadcn/ui                                            │
│  Database:  Supabase (PostgreSQL)                                                  │
│  Testing:   Vitest + Playwright + Testing Library                                  │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────┐
│                           PROJECT ARCHITECTURE                                      │
└────────────────────────────────────────────────────────────────────────────────────┘

                                  PAGES (Astro)
                                       │
        ┌──────────────────┬───────────┼───────────┬──────────────────┐
        │                  │           │           │                  │
    ┌───▼───┐        ┌────▼────┐  ┌──▼───┐   ┌───▼────┐      ┌─────▼─────┐
    │  Auth │        │  Admin  │  │ App  │   │  API   │      │   Index   │
    │ Pages │        │  Pages  │  │Pages │   │  v1    │      │   (Home)  │
    └───┬───┘        └────┬────┘  └──┬───┘   └───┬────┘      └───────────┘
        │                 │          │           │
        │                 │          │           │
        ▼                 ▼          ▼           ▼
    ┌─────────────────────────────────────────────────────────┐
    │              MIDDLEWARE (Auth + Routing)                │
    └──────────────────────┬──────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │                    COMPONENTS                            │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │     Auth     │  │    Common    │  │      UI      │  │
    │  │  Components  │  │  Components  │  │  (Shadcn)    │  │
    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
    │         │                 │                 │          │
    │  ┌──────▼───────┬─────────▼────────┬────────▼───────┐  │
    │  │ - LoginForm  │ - ErrorAlert     │ - Button       │  │
    │  │ - RegisterForm│ - FiltersBar    │ - Tooltip      │  │
    │  │ - ResetForm  │ - ToastProvider  │                │  │
    │  │ - LogoutBtn  │                  │                │  │
    │  └──────────────┘                  └────────────────┘  │
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │  Contracts   │  │  Properties  │  │   Monthly    │  │
    │  │ AdminList    │  │  AdminList   │  │  Advances    │  │
    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
    │         │                 │                 │          │
    │  ┌──────▼───────┐  ┌──────▼───────┐  ┌────▼─────────┐  │
    │  │  Readings    │  │   Reports    │  │   Profile    │  │
    │  │ - AdminView  │  │ - AdminTable │  │ - ProfileForm│  │
    │  │ - ReadingForm│  │ - DetailView │  │              │  │
    │  │ - History    │  │ - EmailDets  │  │              │  │
    │  │ - Months     │  │ - Items      │  │              │  │
    │  │ - Replace    │  │ - SentToggle │  │              │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    └──────────────────────┬───────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │                    SERVICES LAYER                        │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ContractService          MonthlyAdvanceService          │
    │  PropertyService          ReadingsService                │
    │  ProfileService           ReportService                  │
    │                                                          │
    └──────────────────────┬───────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │                 VALIDATION & UTILITIES                   │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  Validators:                    Utils:                   │
    │  - contractPeriod              - date/month              │
    │  - contracts                   - errors                  │
    │  - monthlyAdvances             - utils                   │
    │  - readings                    - client/http             │
    │                                - client/hooks            │
    │                                                          │
    └──────────────────────┬───────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │                DATABASE & API LAYER                      │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌──────────────────┐        ┌──────────────────┐       │
    │  │  Supabase Client │────────│  Supabase Server │       │
    │  │  (Client-side)   │        │  (Server-side)   │       │
    │  └──────────────────┘        └──────────────────┘       │
    │           │                           │                 │
    │           └───────────┬───────────────┘                 │
    │                       │                                 │
    │                       ▼                                 │
    │              ┌────────────────┐                         │
    │              │  Database Types│                         │
    │              │  (Generated)   │                         │
    │              └────────────────┘                         │
    │                                                          │
    └──────────────────────┬───────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │                      SUPABASE DB                         │
    │                   (PostgreSQL)                           │
    └──────────────────────────────────────────────────────────┘
```

## API Routes Structure

```
/api/v1/
├── auth/
│   ├── sign-in.ts
│   ├── sign-out.ts
│   └── sign-up.ts
├── contracts/
│   ├── index.ts (GET, POST)
│   └── [contractId].ts (GET, PUT, DELETE)
├── properties/
│   ├── index.ts (GET, POST)
│   └── [id].ts (GET, PUT, DELETE)
├── monthly-advances/
│   ├── index.ts (GET, POST)
│   └── [id].ts (GET, PUT, DELETE)
├── readings/
│   ├── index.ts (GET, POST)
│   ├── [id].ts (GET, PUT, DELETE)
│   └── [id]/
│       ├── months.ts (GET, POST)
│       └── replacement.ts (POST)
├── reports/
│   ├── index.ts (GET)
│   ├── generate.ts (POST)
│   ├── [id].ts (GET)
│   └── [id]/
│       ├── items.ts (GET)
│       ├── regenerate.ts (POST)
│       ├── send-email.ts (POST)
│       └── sent.ts (PUT)
├── profiles/
│   └── index.ts (GET, PUT)
├── tasks/
│   └── trigger.ts (POST)
├── _tasks/
│   └── run/
│       └── [taskName].post.ts
└── me.ts (GET)
```

## Component Dependencies

```
UI Components (Shadcn/ui)
    └── Dependencies: @radix-ui/react-*, class-variance-authority, clsx, tailwind-merge

React Components
    ├── UI Components (button, tooltip)
    ├── ToastProvider (common)
    ├── ErrorAlert (common)
    └── Services Layer
        ├── ContractService
        ├── PropertyService
        ├── ReadingsService
        ├── ReportService
        ├── MonthlyAdvanceService
        └── ProfileService

Services
    ├── Database Clients (Supabase)
    ├── Validators
    ├── Utils
    └── Error Handlers

Validators
    └── Shared Types (types.ts)

Database Layer
    ├── @supabase/ssr
    ├── @supabase/supabase-js
    └── Database Types (generated)
```

## Testing Structure

```
Unit Tests (Vitest + Testing Library)
├── Components
│   ├── auth/__tests__/
│   ├── contracts/__tests__/
│   ├── monthly/__tests__/
│   ├── profile/__tests__/
│   ├── properties/__tests__/
│   ├── readings/__tests__/
│   ├── reports/__tests__/
│   └── ui/__tests__/
├── Services
│   └── lib/services/__tests__/
├── Validators
│   └── lib/validation/__tests__/
└── API Routes
    └── pages/api/v1/*/__tests__/

E2E Tests (Playwright)
└── Full application flows
```

## Key External Dependencies

### Core Framework
- **astro** (5.13.7)
- **@astrojs/react** (4.3.1)
- **@astrojs/node** (9.4.3)
- **@astrojs/sitemap** (3.5.1)

### React Ecosystem
- **react** (19.1.1)
- **react-dom** (19.1.1)

### UI & Styling
- **tailwindcss** (4.1.13)
- **@tailwindcss/vite** (4.1.13)
- **@radix-ui/react-slot** (1.1.2)
- **@radix-ui/react-tooltip** (1.2.8)
- **lucide-react** (0.487.0)
- **class-variance-authority** (0.7.1)
- **tw-animate-css** (1.2.5)

### Database
- **@supabase/ssr** (0.7.0)
- **@supabase/supabase-js** (2.75.1)

### Testing
- **vitest** (2.1.4)
- **@vitest/coverage-v8** (2.1.4)
- **@playwright/test** (1.49.1)
- **@testing-library/react** (16.2.0)
- **@testing-library/jest-dom** (6.6.3)

### Code Quality
- **eslint** (9.23.0)
- **typescript** (5.8.3)
- **prettier-plugin-astro** (0.14.1)
- **husky** (9.1.7)

## Architecture Overview

The system follows a clean layered architecture:

**Pages → Components → Services → Validators/Utils → Database**

### Key Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Unidirectional Data Flow**: Data flows from top to bottom through the layers
3. **Type Safety**: Full TypeScript coverage with generated database types
4. **Testing**: Comprehensive unit and E2E test coverage
5. **Code Quality**: Automated linting, formatting, and pre-commit hooks

### Layer Descriptions

- **Pages**: Astro pages that render the UI and handle routing
- **Components**: Reusable React and Astro components for the UI
- **Services**: Business logic and data access layer
- **Validators**: Input validation and data transformation
- **Database**: Supabase client and server instances with type safety

