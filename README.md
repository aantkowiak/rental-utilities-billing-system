# 10x Astro Starter

A modern, opinionated starter template for building fast, accessible, and AI-friendly web applications.

## Tech Stack

- [Astro](https://astro.build/) v5.5.5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0.17 - Utility-first CSS framework

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Environment variables

Create a `.env` file (or configure your deployment secrets) with the following values:

```
SUPABASE_URL=<supabase-project-url>
SUPABASE_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SERVICE_ROLE_KEY=<internal-task-endpoint-secret>
```

`SERVICE_ROLE_KEY` is compared against the `x-service-role-key` header when invoking the scheduler task endpoint.

## Local Development with Supabase

### Prerequisites
- Docker Desktop (required for local Supabase)
- Supabase CLI: `npm install -g supabase` or `brew install supabase/tap/supabase`

### Setup Local Database

1. Start Supabase:
```bash
supabase start
```

2. Seed database with test data:
```bash
npm run db:seed
```

This will reset your local database and populate it with:
- 3 properties (apartments/houses)
- 3 test users (1 admin, 2 tenants)
- 2 active contracts
- Monthly conditions for the last 13 months
- Historical meter readings for the last year

### Test Accounts

After seeding, you can login with:
- **Admin**: `admin@example.com` / `password123`
- **Tenant 1**: `tenant1@example.com` / `password123`
- **Tenant 2**: `tenant2@example.com` / `password123`

### Database Management

- **Supabase Studio**: http://127.0.0.1:54323
- **Database Port**: 54322
- **API Port**: 54321

For more details, see [scripts/README.md](scripts/README.md)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run test` - Run tests with Vitest
- `npm run db:seed` - Reset and seed local database with test data

## API Endpoints

### Monthly Conditions (`/v1/monthly-conditions`)

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| GET | `/v1/monthly-conditions` | List monthly conditions with optional `propertyId`, `month`, `page`, `pageSize` filters. Tenants are automatically scoped to their property. | Tenant/Admin |
| POST | `/v1/monthly-conditions` | Create a monthly condition record. | Admin |
| GET | `/v1/monthly-conditions/{id}` | Retrieve a single monthly condition. Tenants can access only their property. | Tenant/Admin |
| PATCH | `/v1/monthly-conditions/{id}` | Update a monthly condition. Blocked if linked reports are realized or unlocked. | Admin |
| DELETE | `/v1/monthly-conditions/{id}` | Delete a monthly condition. Returns 422 when linked to realized reports. | Admin |

**Error Codes**

- `monthly_condition_not_found` (404) – Missing or unauthorized record.
- `conflict` (409) – Duplicate property/month combination.
- `monthly_condition_locked` (422) – Updates or deletes blocked when linked reports have status other than `draft`.
- `forbidden` (403) – Returned for insufficient permissions or tenant/property mismatch.

## Project Structure

```md
.
├── src/
│   ├── layouts/    # Astro layouts
│   ├── pages/      # Astro pages
│   │   └── api/    # API endpoints
│   ├── components/ # UI components (Astro & React)
│   └── assets/     # Static assets
├── public/         # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT

