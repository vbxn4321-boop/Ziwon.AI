# Project structure

## Frontend

- src/app: Next.js pages and API route entry points. Keep route-specific loading and request handling here.
- src/features/psst: Business plan studio, its components, state hook, types, constants, and navigation helper.
- src/features/program-detail: Program detail modal and detail page sections.
- src/components: UI shared across features, including authentication dialogs, navigation, cards, and document viewers. Existing home and consultant sections remain here pending a separate migration.
- src/lib: Shared utilities and server integrations (database, AI, parsing, crawling, security, export). Browser components must not import server implementations at runtime; use type-only imports for shared contracts.
- src/lib/documents/download.ts: Download URL construction shared by detail screens and HWP viewers. It has no React or feature dependency.
- scripts: Explicit maintenance and verification commands.
- prisma: Database schema.

Import feature entry points directly, for example @/features/psst/PsstPlanGenerator or @/features/program-detail/ProgramDetailModal. Within a feature, use relative imports. Shared viewers and utilities must not import feature internals. Keep server AI implementations out of client barrel exports.

## Backend

- main.py: Existing FastAPI startup and deployment entry point.
- app/api/v1: HTTP routing.
- app/schemas: Request and response schemas.
- app/services: Crawling, parsing, AI, and scheduler services.
- app/core: Configuration, database, Redis, and authentication infrastructure.

Frontend API routes and the Python API are distinct deployed entry points. Preserve both until their callers and deployment requirements are migrated explicitly.

## Local verification

From the repository root:

~~~sh
npm run dev
npm run typecheck
npm run build
~~~

Install frontend dependencies with npm ci --prefix frontend when needed. The build includes Prisma generation and may require environment configuration. Backend test scripts can access live services; inspect their setup before running them.

The frontend/ and backend/ deployment roots are unchanged, so existing Vercel, Railway, Docker, and Procfile paths still apply.
