# AI Rules for spaced repetition cards project

Web application for AI-powered flashcard generation and spaced repetition learning. Users paste text and AI generates flashcard suggestions that can be edited, accepted, or rejected before saving. Users can also create flashcards manually. A spaced repetition algorithm schedules optimal review sessions.

## Tech Stack

- Astro 5 (SSR mode with Node adapter)
- TypeScript 5 (strict mode)
- React 19
- Tailwind 4
- Shadcn/ui (New York style, lucide-react icons)
- Supabase (PostgreSQL + Auth + RLS)
- Zod (runtime validation)
- Sonner (toast notifications)

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts (BaseLayout, Layout, AppLayout)
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware (auth guard, route protection)
- `./src/db` - Supabase clients and generated database types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs, Commands)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/components/{feature}/` - Feature-specific React components (auth, flashcards, generation, layout)
- `./src/hooks` - Custom React hooks (one per feature)
- `./src/lib` - Services and helpers
- `./src/lib/services` - Business logic services (FlashcardService, GenerationService, AIService)
- `./src/lib/schemas` - Zod validation schemas (one per domain: auth, flashcard, generation)
- `./src/lib/errors` - Custom error types
- `./src/assets` - static internal assets
- `./public` - public assets

When modifying the directory structure, always update this section.

## Architecture Overview

### Data Flow: Astro SSR + React Islands

1. **Astro pages** handle server-side rendering and initial data fetching
2. **React components** hydrated with `client:load` take over for interactivity
3. **Custom hooks** (`useFlashcards`, `useGenerateFlashcards`) manage client-side state and API calls
4. **API endpoints** (`src/pages/api/`) validate input with Zod, then delegate to services
5. **Services** (`src/lib/services/`) contain business logic and interact with Supabase

### Authentication Flow

- Supabase Auth handles credentials (email/password)
- Middleware creates per-request Supabase instance with cookie-based sessions
- `locals.user` is set by middleware and available in all API routes
- Protected routes: `/flashcards`, `/generate`, `/api/*` (except auth endpoints)
- Auth pages (`/login`, `/register`) redirect to `/flashcards` if already authenticated

### AI Generation Flow

1. User submits text (1000-10000 chars) → `POST /api/generations`
2. API creates AIService via factory (MockAIService or OpenRouterService based on env)
3. AI generates flashcard proposals → saved to `generation_sessions` table
4. User reviews, edits, accepts/rejects proposals in the UI
5. Accepted proposals → `POST /api/generations/:id/accept` → RPC transactional insert

### Database Tables

- `flashcards` - user flashcards (front, back, source: "ai_generated"|"manual", optional generation_id)
- `generation_sessions` - AI generation sessions (source_text, model_used, counts)
- `generation_error_logs` - error tracking for AI generation failures

## Coding Practices

### Guidelines for clean code

- Use feedback from linters to improve the code when making changes.
- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.

### Naming Conventions

- **React components**: PascalCase files (`FlashcardList.tsx`, `ProposalCard.tsx`)
- **Astro pages**: lowercase (`flashcards.astro`, `generate.astro`)
- **Services**: `{name}.service.ts` with PascalCase class (`FlashcardService`)
- **Schemas**: `{name}.schema.ts` with camelCase exports (`createFlashcardSchema`)
- **Hooks**: `use{Feature}.ts` (`useFlashcards`, `useGenerateFlashcards`)
- **Types/DTOs**: PascalCase with suffix (`FlashcardDTO`, `CreateFlashcardCommand`, `ErrorResponseDTO`)
- **API handlers**: uppercase HTTP methods as named exports (`GET`, `POST`, `PUT`, `DELETE`)

### API Endpoint Patterns

All API endpoints follow this structure:
1. Parse JSON body with try/catch
2. Validate with Zod schema (`safeParse`)
3. Call service layer
4. Return standardized response: `{ data }` or `{ error: { code, message } }`

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `INTERNAL_ERROR`, `USER_EXISTS`, `INVALID_CREDENTIALS`

### React Component Patterns

- **Container/Presentational split**: container components manage state via hooks; presentational components receive props and emit callbacks
- **Memoization**: `React.memo()` for list item components (`FlashcardCard`, `ProposalCard`)
- **Stable references**: `useCallback` for event handlers passed as props
- **Loading states**: Skeleton components from Shadcn/ui
- **Dialogs**: state managed by parent, dialog components receive `isOpen`/`onClose` props
- **API calls**: native `fetch` with `AbortController` + `AbortSignal.timeout()`, credentials: "include"
- **Session expiry**: all API calls check for 401 → redirect to `/login`
- **Toast notifications**: `sonner` for success/error feedback

### Environment Variables

Server-side (in `astro.config.mjs` env schema):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - admin key for server operations
- `OPENROUTER_API_KEY` - LLM API key
- `USE_MOCK_AI` - set to "true" to use MockAIService instead of OpenRouter

## Current State

- ✅ Authentication (login, register, logout, account deletion)
- ✅ Manual flashcard CRUD with search and pagination
- ✅ AI-powered flashcard generation with proposal review workflow
- ⬜ Spaced repetition algorithm and review sessions
- ⬜ Testing setup (no Vitest or Playwright configured yet)
