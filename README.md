# 10x-cards

> This project was built for educational purposes as part of the [10xDevs.pl](https://www.10xdevs.pl/) course.

AI-powered flashcard generation and spaced repetition learning application.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10x-cards is a web application designed to streamline the creation and management of educational flashcards. The app leverages Large Language Models (LLMs) via API to automatically generate flashcard suggestions from user-provided text, significantly reducing the time and effort required for manual flashcard creation.

### Key Features

- **AI-Powered Generation**: Paste any text (1,000-10,000 characters) and receive AI-generated flashcard suggestions
- **Review & Approve**: Accept, edit, or reject generated flashcards before saving
- **Manual Creation**: Create custom flashcards with front/back content (front: 1-500 chars, back: 1-2000 chars)
- **Spaced Repetition**: Integrated learning algorithm for optimal review scheduling *(planned)*
- **User Accounts**: Secure registration, authentication, and personal flashcard collections
- **GDPR Compliant**: Full data privacy with account and data deletion options (CASCADE DELETE on all user data)

## Tech Stack

### Frontend
- **Astro 5** - Fast, content-focused web framework with SSR (Node adapter)
- **React 19** - Interactive UI components (islands architecture)
- **TypeScript 5** - Static typing with strict mode
- **Tailwind 4** - Utility-first CSS framework
- **Shadcn/ui** - Accessible React component library (New York style, neutral colors)
- **Sonner** - Toast notifications

### Backend
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database with Row Level Security (RLS)
  - Built-in authentication (cookie-based sessions)
  - TypeScript SDK
- **Zod** - Runtime validation for API inputs

### AI Integration
- **Openrouter.ai** - Access to multiple LLM providers (OpenAI, Anthropic, Google) with cost controls and API key limits

### Testing
- **Vitest 4** - Unit and integration tests (ESM-first, Jest-compatible API)
- **@testing-library/react** - React component testing
- **MSW 2** - API mocking via network interception
- **Playwright** - E2E tests (Chromium only)
- **jsdom** - Lightweight DOM environment for component tests
- **@vitest/coverage-v8** - Code coverage reporting (minimum 60% threshold)

### CI/CD & Hosting
- **GitHub Actions** - Automated CI/CD pipelines
- **DigitalOcean** - Docker-based application hosting

## Architecture Overview

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Astro Pages   │────▶│  React Islands   │────▶│  Custom Hooks   │
│   (SSR + data)  │     │  (client:load)   │     │ (state + fetch) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Supabase     │◀────│    Services      │◀────│  API Endpoints  │
│  (PostgreSQL)   │     │ (business logic) │     │ (Zod + handlers)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Database Schema

| Table | Description |
|-------|-------------|
| `flashcards` | User flashcards (front, back, source, optional generation_id) |
| `generation_sessions` | AI generation session metadata (source_text, model, counts) |
| `generation_error_logs` | Error tracking for failed AI generation attempts |

All tables have RLS enabled - users can only access their own data.

## Getting Started Locally

### Prerequisites

- Node.js (version specified in `.nvmrc`: **22.14.0**)
- npm package manager
- Supabase account (for backend services)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mateusz-szafarz/10x-cards.git
   cd 10x-cards
   ```

2. Install the correct Node.js version (using nvm):
   ```bash
   nvm install
   nvm use
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and OpenRouter credentials
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM access |
| `USE_MOCK_AI` | Set to `"true"` to use mock AI service |

## Available Scripts

### Development

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:cloud` | Start development server in test mode |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run astro` | Run Astro CLI command |

### Code Quality

| Script | Description |
|--------|-------------|
| `npm run lint` | Run ESLint and auto-fix issues |
| `npm run lint:check` | Run ESLint checks without fixing |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without fixing |

### Testing

| Script | Description |
|--------|-------------|
| `npm test` | Run unit and integration tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:coverage:ui` | Run tests with coverage report and UI |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |
| `npm run test:all` | Run all tests (unit + E2E) |

## Project Structure

```
10x-cards/
├── src/
│   ├── pages/              # Astro pages and API endpoints
│   │   └── api/            # REST API endpoints
│   ├── components/         # UI components
│   │   ├── ui/             # Shadcn/ui components
│   │   ├── auth/           # Authentication components
│   │   ├── flashcards/     # Flashcard management components
│   │   ├── generation/     # AI generation components
│   │   └── layout/         # Navigation and layout components
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── services/       # Business logic services
│   │   ├── schemas/        # Zod validation schemas
│   │   └── errors/         # Custom error types
│   ├── db/                 # Supabase clients and types
│   ├── layouts/            # Astro layouts
│   ├── middleware/         # Auth guard and route protection
│   └── types.ts            # Shared TypeScript types
├── tests/                  # Test infrastructure
│   ├── setup.ts            # Vitest global setup
│   ├── mocks/              # MSW handlers and mocks
│   ├── fixtures/           # Test data factories
│   └── helpers/            # Test utilities
├── e2e/                    # Playwright E2E tests
│   └── pages/              # Page Object Models
├── supabase/
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## Project Scope

### In Scope (MVP)

- ✅ User registration and authentication
- ✅ AI-powered flashcard generation from pasted text
- ✅ Manual flashcard creation, editing, and deletion
- ✅ Flashcard review and approval workflow
- ⬜ Spaced repetition learning sessions
- ✅ Generation statistics tracking
- ✅ Secure, user-isolated data storage (RLS)

### Out of Scope (MVP)

- Mobile applications (web only)
- Custom spaced repetition algorithm (using existing open-source solution)
- Gamification features
- Document import (PDF, DOCX)
- Public API
- Flashcard sharing between users
- Advanced notification system
- Keyword-based flashcard search

## Project Status

🚧 **In Development**

| Feature | Status |
|---------|--------|
| Authentication (login, register, logout) | ✅ Complete |
| Manual flashcard CRUD | ✅ Complete |
| AI-powered generation with review workflow | ✅ Complete |
| Testing infrastructure (Vitest + Playwright) | ✅ Complete |
| Comprehensive test coverage | 🟡 In Progress |
| Spaced repetition algorithm | ⬜ Not Started |

## License

MIT