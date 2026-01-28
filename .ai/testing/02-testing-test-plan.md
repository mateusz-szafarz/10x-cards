# Plan testowania projektu 10x-cards

## 1. Strategia testowania

### 1.1 Piramida testów dostosowana do architektury

Projekt 10x-cards ma wyraźnie warstwową architekturę (Astro SSR → React Islands → Hooks → API Endpoints → Services → Supabase). Piramida testów powinna to odzwierciedlać:

```
        ╱╲
       ╱ E2E ╲           ~10 testów   │ Playwright
      ╱────────╲          Krytyczne    │ Realne flow użytkownika
     ╱Integration╲        ~30 testów   │ Vitest
    ╱──────────────╲      API + Serwisy│ Mockowany Supabase
   ╱    Unit Tests   ╲    ~60 testów   │ Vitest
  ╱────────────────────╲  Schemas,     │ Czyste funkcje
 ╱  Utility, Services   ╲ Hooks, Utils │ Minimalny setup
╱────────────────────────╲
```

### 1.2 Podejście ogólne

**Testing Trophy zamiast klasycznej piramidy** — w tej aplikacji największy ROI dają testy integracyjne (API endpoint + service + mockowany Supabase), ponieważ:

1. **Schematy Zod** — czysto funkcyjne, łatwe do testowania jednostkowego
2. **Serwisy** — zależą od Supabase client, wymagają mockowania
3. **API endpoints** — łączą walidację + serwis + error handling — najlepsza warstwa do testów integracyjnych
4. **Hooki React** — zarządzają stanem i fetch, wymagają `renderHook` + mockowanego fetch
5. **Komponenty React** — testujemy przede wszystkim interakcję, nie rendering (to domenа E2E)
6. **E2E** — pokrywają krytyczne ścieżki użytkownika end-to-end

### 1.3 Zasady

- **Test behavior, not implementation** — testujemy co robi kod, nie jak to robi
- **Izolacja od zewnętrznych usług** — Supabase i OpenRouter zawsze mockowane w unit/integration
- **Realistyczne dane** — fixtures odzwierciedlają prawdziwe struktury z `database.types.ts`
- **Fail fast** — testy jednostkowe < 5s, integracyjne < 15s, E2E < 60s
- **Testy po polsku?** — opisy `describe`/`it` po angielsku (spójność z kodem)

---

## 2. Stack testowy

### 2.1 Narzędzia

| Narzędzie | Zastosowanie | Uzasadnienie |
|-----------|-------------|--------------|
| **Vitest 3** | Unit + Integration | Natywna integracja z Vite (Astro używa Vite), ESM-first, kompatybilne API z Jest |
| **@testing-library/react** | Testowanie komponentów React | Standard branżowy, testuje zachowanie z perspektywy użytkownika |
| **@testing-library/react-hooks** | Testowanie custom hooks | Izolowane testowanie `useFlashcards`, `useGenerateFlashcards` (uwaga: w React 18+ wbudowane w `@testing-library/react`) |
| **msw 2** | Mockowanie HTTP (fetch) | Interceptuje fetch na poziomie sieci — realistyczne testy hooków i serwisów bez stubbowania globalnego fetch |
| **Playwright** | E2E | Chromium-only (per konfiguracja), stabilne API, trace viewer do debugowania |
| **jsdom** | DOM environment dla Vitest | Lekki DOM dla testów komponentów React |

### 2.2 Instalacja

```bash
# Unit + Integration testing
npm install -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom msw

# E2E testing
npm install -D @playwright/test
npx playwright install chromium
```

### 2.3 Konfiguracja Vitest

```typescript
// vitest.config.ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    /* Uruchamiaj testy w jsdom dla komponentów React */
    environment: 'jsdom',

    /* Globalne importy — bez konieczności import { describe, it, expect } */
    globals: true,

    /* Setup file — global mocks, custom matchers */
    setupFiles: ['./tests/setup.ts'],

    /* Ścieżki testów */
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx', './tests/**/*.test.ts'],

    /* Wyłącz E2E z Vitest */
    exclude: ['./e2e/**', './node_modules/**'],

    /* Coverage */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/lib/**',
        'src/hooks/**',
        'src/components/**',
        'src/pages/api/**',
        'src/middleware/**',
      ],
      exclude: [
        'src/components/ui/**',  /* Shadcn — nie nasze */
        'src/db/database.types.ts',  /* Auto-generated */
        '**/*.d.ts',
        '**/*.test.*',
      ],
      thresholds: {
        /* Faza 1: realistyczne minimum */
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },

    /* Aliasy — spójne z tsconfig */
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
```

### 2.4 Setup file

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { server } from './mocks/server';

// Cleanup React DOM after each test
afterEach(() => {
  cleanup();
});

// MSW setup — interceptuj fetch requests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock sonner globally — toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock window.location for redirect tests
const locationMock = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});
```

### 2.5 Konfiguracja Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
```

### 2.6 Skrypty npm

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "vitest run && playwright test"
  }
}
```

### 2.7 Struktura katalogów testowych

```
10x-cards/
├── tests/                              # Wspólna infrastruktura testowa
│   ├── setup.ts                        # Vitest global setup
│   ├── mocks/
│   │   ├── server.ts                   # MSW server setup
│   │   ├── handlers.ts                 # Default MSW handlers
│   │   ├── supabase.mock.ts            # Supabase client mock factory
│   │   └── ai-service.mock.ts          # AIService mock
│   ├── fixtures/
│   │   ├── flashcard.fixtures.ts       # FlashcardDTO factories
│   │   ├── generation.fixtures.ts      # Generation response factories
│   │   ├── auth.fixtures.ts            # User fixtures
│   │   └── pagination.fixtures.ts      # Pagination metadata
│   └── helpers/
│       ├── api-test.helpers.ts         # Helper do testowania API endpoints
│       └── render.helpers.tsx          # Custom render z providerami
│
├── src/
│   ├── lib/
│   │   ├── schemas/
│   │   │   └── __tests__/
│   │   │       ├── flashcard.schema.test.ts
│   │   │       ├── generation.schema.test.ts
│   │   │       └── auth.schema.test.ts
│   │   ├── services/
│   │   │   └── __tests__/
│   │   │       ├── flashcard.service.test.ts
│   │   │       ├── generation.service.test.ts
│   │   │       └── openrouter.service.test.ts
│   │   └── __tests__/
│   │       └── utils.test.ts
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useFlashcards.test.ts
│   │       └── useGenerateFlashcards.test.ts
│   ├── pages/api/
│   │   ├── flashcards/
│   │   │   └── __tests__/
│   │   │       ├── index.test.ts       # GET + POST /api/flashcards
│   │   │       └── [id].test.ts        # GET + PUT + DELETE /api/flashcards/:id
│   │   ├── generations/
│   │   │   └── __tests__/
│   │   │       ├── index.test.ts       # POST /api/generations
│   │   │       └── accept.test.ts      # POST /api/generations/:id/accept
│   │   └── auth/
│   │       └── __tests__/
│   │           ├── register.test.ts
│   │           ├── login.test.ts
│   │           ├── logout.test.ts
│   │           └── account.test.ts
│   ├── middleware/
│   │   └── __tests__/
│   │       └── index.test.ts
│   └── components/
│       ├── flashcards/
│       │   └── __tests__/
│       │       ├── FlashcardCard.test.tsx
│       │       ├── FlashcardEditDialog.test.tsx
│       │       └── FlashcardList.test.tsx
│       └── generation/
│           └── __tests__/
│               ├── GenerationForm.test.tsx
│               ├── ProposalCard.test.tsx
│               └── GenerateView.test.tsx
│
└── e2e/
    ├── pages/
    │   ├── login.page.ts               # Page Object Model
    │   ├── register.page.ts
    │   ├── flashcards.page.ts
    │   └── generate.page.ts
    ├── auth.spec.ts                    # Login + Register flows
    ├── flashcards-crud.spec.ts         # CRUD operations
    ├── generation-flow.spec.ts         # AI generation flow
    └── navigation.spec.ts             # Route protection + redirects
```

---

## 3. Plan wdrażania (fazy)

### Faza 0: Infrastruktura (dzień 1)
**Cel:** Konfiguracja narzędzi, żeby pierwsze `npm test` zadziałało.

- [ ] Instalacja zależności (Vitest, Testing Library, MSW, Playwright)
- [ ] `vitest.config.ts` z integracją Astro/Vite
- [ ] `playwright.config.ts` (Chromium only)
- [ ] `tests/setup.ts` z globalnymi mockami
- [ ] Skrypty npm w `package.json`
- [ ] Smoke test — jeden prosty test `utils.test.ts` sprawdzający że Vitest działa

**ROI:** Baza pod wszystkie dalsze testy. Bez tego nic nie ruszy.

---

### Faza 1: Schemat walidacji + Utility (tydzień 1)
**Cel:** Pokrycie czysto funkcyjnych modułów — najwyższy ROI, zero mockowania.

- [ ] `utils.test.ts` — `validateUUID()`, `buildPaginationMetadata()`
- [ ] `flashcard.schema.test.ts` — walidacja `createFlashcardSchema`, `flashcardsQueryParamsSchema`
- [ ] `generation.schema.test.ts` — walidacja `createGenerationSchema`, `acceptGenerationSchema`
- [ ] `auth.schema.test.ts` — walidacja email/password

**ROI: ★★★★★** — Czysto funkcyjne, bez zależności, łapią regresje walidacji na granicy systemu.

---

### Faza 2: Serwisy z mockowanym Supabase (tydzień 1-2)
**Cel:** Testowanie logiki biznesowej w izolacji od bazy.

- [ ] Mock factory dla SupabaseClient
- [ ] `flashcard.service.test.ts` — CRUD, paginacja, wyszukiwanie, escape ILIKE
- [ ] `generation.service.test.ts` — generowanie + accept z RPC
- [ ] `openrouter.service.test.ts` — retry logic, error mapping, response parsing

**ROI: ★★★★☆** — Pokrywa kluczową logikę biznesową. Supabase mock wymaga wysiłku, ale jest reużywalny.

---

### Faza 3: API Endpoints — testy integracyjne (tydzień 2-3)
**Cel:** Testowanie pełnego flow: request → walidacja → serwis → response.

- [ ] Helper do tworzenia mock API context (`locals`, `request`, `params`)
- [ ] Testy flashcards API (GET, POST, PUT, DELETE)
- [ ] Testy generations API (POST generate, POST accept)
- [ ] Testy auth API (register, login, logout, delete account)
- [ ] Testy middleware (route protection, redirects, 401)

**ROI: ★★★★★** — Najważniejsza warstwa testów. Łapie błędy w walidacji, error handling, autoryzacji. Jeden test pokrywa wiele warstw.

---

### Faza 4: Hooki React (tydzień 3)
**Cel:** Testowanie logiki stanu i komunikacji z API.

- [ ] MSW handlers dla API flashcards i generations
- [ ] `useFlashcards.test.ts` — CRUD, debounce search, pagination, optimistic delete, 401 redirect
- [ ] `useGenerateFlashcards.test.ts` — generate flow, accept/reject proposals, save, error states

**ROI: ★★★★☆** — Hooki zawierają złożoną logikę (optimistic updates, debounce, abort), warto ją pokryć.

---

### Faza 5: Komponenty React (tydzień 3-4)
**Cel:** Testowanie kluczowych interakcji UI.

- [ ] `FlashcardCard.test.tsx` — rendering, truncation, action callbacks
- [ ] `FlashcardEditDialog.test.tsx` — form validation, save/cancel
- [ ] `GenerationForm.test.tsx` — char counter, validation, submit
- [ ] `ProposalCard.test.tsx` — inline edit, accept/reject

**ROI: ★★★☆☆** — Wartościowe, ale większość logiki jest w hookach. Skupiamy się na interakcji, nie na pixelach.

---

### Faza 6: E2E z Playwright (tydzień 4-5)
**Cel:** Pokrycie krytycznych ścieżek użytkownika end-to-end.

- [ ] Page Object Models dla login, register, flashcards, generate
- [ ] Auth flow (register → login → see flashcards)
- [ ] Flashcard CRUD (create → edit → delete)
- [ ] AI generation flow (paste text → generate → accept → see saved)
- [ ] Route protection (unauthenticated → redirect to /login)

**ROI: ★★★★☆** — Łapie problemy integracji między warstwami, ale wymaga działającej aplikacji + Supabase.

---

## 4. Scenariusze testowe per warstwa

### 4.1 Utility functions (`src/lib/utils.ts`)

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| U1 | `validateUUID` — akceptuje poprawne UUID v4 | 🔴 Wysoki | Unit |
| U2 | `validateUUID` — odrzuca niepoprawne formaty (za krótki, złe znaki, v1) | 🔴 Wysoki | Unit |
| U3 | `validateUUID` — odrzuca pusty string i null-like values | 🟡 Średni | Unit |
| U4 | `buildPaginationMetadata` — poprawne obliczenie total_pages | 🔴 Wysoki | Unit |
| U5 | `buildPaginationMetadata` — edge case: total=0 | 🟡 Średni | Unit |
| U6 | `buildPaginationMetadata` — edge case: total nie dzieli się równo przez limit | 🟡 Średni | Unit |

```typescript
// Przykład: src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { validateUUID, buildPaginationMetadata } from '../utils';

describe('validateUUID', () => {
  it('should accept valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject non-v4 UUID', () => {
    expect(validateUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validateUUID('')).toBe(false);
  });
});

describe('buildPaginationMetadata', () => {
  it('should calculate total_pages correctly', () => {
    const result = buildPaginationMetadata(1, 20, 45);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      total_pages: 3,
    });
  });

  it('should handle zero total', () => {
    const result = buildPaginationMetadata(1, 20, 0);
    expect(result.total_pages).toBe(0);
  });
});
```

---

### 4.2 Zod Schemas (`src/lib/schemas/`)

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| S1 | `createFlashcardSchema` — akceptuje poprawne dane (front 1-500, back 1-2000) | 🔴 Wysoki | Unit |
| S2 | `createFlashcardSchema` — odrzuca pusty front/back | 🔴 Wysoki | Unit |
| S3 | `createFlashcardSchema` — odrzuca front > 500 znaków | 🔴 Wysoki | Unit |
| S4 | `createFlashcardSchema` — odrzuca back > 2000 znaków | 🔴 Wysoki | Unit |
| S5 | `createFlashcardSchema` — odrzuca brakujące pola | 🔴 Wysoki | Unit |
| S6 | `flashcardsQueryParamsSchema` — stosuje defaults (page=1, limit=20) | 🔴 Wysoki | Unit |
| S7 | `flashcardsQueryParamsSchema` — coerce string do number (query params) | 🟡 Średni | Unit |
| S8 | `flashcardsQueryParamsSchema` — odrzuca limit > 100 | 🟡 Średni | Unit |
| S9 | `flashcardsQueryParamsSchema` — search transform: pusty string → undefined | 🟡 Średni | Unit |
| S10 | `flashcardsQueryParamsSchema` — odrzuca search > 200 znaków | 🟡 Średni | Unit |
| S11 | `createGenerationSchema` — akceptuje source_text 1000-10000 znaków | 🔴 Wysoki | Unit |
| S12 | `createGenerationSchema` — odrzuca < 1000 znaków | 🔴 Wysoki | Unit |
| S13 | `createGenerationSchema` — odrzuca > 10000 znaków | 🔴 Wysoki | Unit |
| S14 | `acceptGenerationSchema` — akceptuje niepusty array z poprawnymi flashcards | 🔴 Wysoki | Unit |
| S15 | `acceptGenerationSchema` — odrzuca pusty array | 🔴 Wysoki | Unit |
| S16 | `acceptGenerationSchema` — odrzuca flashcard z front > 500 | 🟡 Średni | Unit |

```typescript
// Przykład: src/lib/schemas/__tests__/flashcard.schema.test.ts
import { describe, it, expect } from 'vitest';
import { createFlashcardSchema, flashcardsQueryParamsSchema } from '../flashcard.schema';

describe('createFlashcardSchema', () => {
  it('should accept valid flashcard data', () => {
    const result = createFlashcardSchema.safeParse({
      front: 'What is React?',
      back: 'A JavaScript library for building user interfaces',
    });
    expect(result.success).toBe(true);
  });

  it('should reject front exceeding 500 characters', () => {
    const result = createFlashcardSchema.safeParse({
      front: 'x'.repeat(501),
      back: 'Valid back',
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain('500');
  });

  it('should reject missing back field', () => {
    const result = createFlashcardSchema.safeParse({ front: 'Question?' });
    expect(result.success).toBe(false);
  });
});

describe('flashcardsQueryParamsSchema', () => {
  it('should apply default values when no params provided', () => {
    const result = flashcardsQueryParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe('created_at');
      expect(result.data.order).toBe('desc');
    }
  });

  it('should coerce string page to number', () => {
    const result = flashcardsQueryParamsSchema.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it('should transform empty search to undefined', () => {
    const result = flashcardsQueryParamsSchema.safeParse({ search: '  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeUndefined();
    }
  });
});
```

---

### 4.3 Services (`src/lib/services/`)

#### FlashcardService

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| FS1 | `createFlashcard` — tworzy fiszkę z source='manual' i generation_id=null | 🔴 Wysoki | Unit |
| FS2 | `createFlashcard` — propaguje błąd Supabase | 🟡 Średni | Unit |
| FS3 | `updateFlashcard` — aktualizuje i zwraca zaktualizowaną fiszkę | 🔴 Wysoki | Unit |
| FS4 | `updateFlashcard` — zwraca null gdy fiszka nie istnieje (PGRST116) | 🔴 Wysoki | Unit |
| FS5 | `updateFlashcard` — filtruje po user_id (ownership) | 🔴 Wysoki | Unit |
| FS6 | `deleteFlashcard` — zwraca true po usunięciu | 🔴 Wysoki | Unit |
| FS7 | `deleteFlashcard` — zwraca false gdy nie znaleziono | 🔴 Wysoki | Unit |
| FS8 | `listFlashcards` — zwraca flashcards z pagination | 🔴 Wysoki | Unit |
| FS9 | `listFlashcards` — filtruje po source | 🟡 Średni | Unit |
| FS10 | `listFlashcards` — wyszukiwanie ILIKE z escapowaniem % i _ | 🔴 Wysoki | Unit |
| FS11 | `listFlashcards` — sortowanie asc/desc | 🟡 Średni | Unit |
| FS12 | `getFlashcardById` — zwraca null gdy nie znaleziono | 🔴 Wysoki | Unit |

```typescript
// Przykład: src/lib/services/__tests__/flashcard.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlashcardService } from '../flashcard.service';
import { createMockSupabase } from '../../../../tests/mocks/supabase.mock';

describe('FlashcardService', () => {
  let service: FlashcardService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new FlashcardService(mockSupabase as any);
  });

  describe('createFlashcard', () => {
    it('should create a manual flashcard with correct fields', async () => {
      const mockFlashcard = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        front: 'Question?',
        back: 'Answer',
        source: 'manual',
        generation_id: null,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockFlashcard, error: null }),
          }),
        }),
      });

      const result = await service.createFlashcard(
        { front: 'Question?', back: 'Answer' },
        'user-id'
      );

      expect(result).toEqual(mockFlashcard);
      expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
    });
  });

  describe('listFlashcards', () => {
    it('should escape ILIKE wildcards in search query', async () => {
      // Testuje czy escapeIlikePattern poprawnie escapuje % i _
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };
      mockSupabase.from.mockReturnValue(mockFrom);

      await service.listFlashcards({ search: '100%_done' }, 'user-id');

      expect(mockFrom.or).toHaveBeenCalledWith(
        expect.stringContaining('100\\%\\_done')
      );
    });
  });
});
```

#### GenerationService

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| GS1 | `generateFlashcards` — wywołuje AI service i zapisuje sesję | 🔴 Wysoki | Unit |
| GS2 | `generateFlashcards` — zapisuje poprawne generated_count i model_used | 🔴 Wysoki | Unit |
| GS3 | `generateFlashcards` — propaguje błąd AI service | 🟡 Średni | Unit |
| GS4 | `generateFlashcards` — propaguje błąd zapisu do Supabase | 🟡 Średni | Unit |
| GS5 | `acceptFlashcards` — wywołuje RPC accept_generation | 🔴 Wysoki | Unit |
| GS6 | `acceptFlashcards` — rzuca error z code NOT_FOUND | 🔴 Wysoki | Unit |
| GS7 | `acceptFlashcards` — rzuca error z code ALREADY_FINALIZED | 🔴 Wysoki | Unit |

#### OpenRouterService

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| OR1 | Konstruktor — wymaga apiKey | 🔴 Wysoki | Unit |
| OR2 | `generateFlashcardProposals` — parsuje poprawną odpowiedź JSON | 🔴 Wysoki | Unit |
| OR3 | Retry na 429 z exponential backoff | 🔴 Wysoki | Unit |
| OR4 | Retry na 500+ server error | 🟡 Średni | Unit |
| OR5 | Rzuca `AuthenticationError` na 401 | 🟡 Średni | Unit |
| OR6 | Rzuca `RateLimitError` gdy Retry-After > MAX_RETRY_WAIT | 🔴 Wysoki | Unit |
| OR7 | Rzuca `TimeoutError` po przekroczeniu timeout | 🔴 Wysoki | Unit |
| OR8 | Rzuca `InvalidResponseError` gdy JSON nieparsowalne | 🟡 Średni | Unit |
| OR9 | Rzuca `InvalidResponseError` gdy brak flashcards w response | 🟡 Średni | Unit |
| OR10 | Max retries limit — nie retry więcej niż maxRetries | 🟡 Średni | Unit |

---

### 4.4 API Endpoints (`src/pages/api/`)

#### Flashcards API

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| AF1 | `GET /api/flashcards` — 200 z flashcards i pagination | 🔴 Wysoki | Integration |
| AF2 | `GET /api/flashcards` — 200 z defaults gdy brak query params | 🔴 Wysoki | Integration |
| AF3 | `GET /api/flashcards` — 400 na invalid query params (limit=999) | 🟡 Średni | Integration |
| AF4 | `GET /api/flashcards` — 500 gdy serwis rzuca błąd | 🟡 Średni | Integration |
| AF5 | `POST /api/flashcards` — 201 tworzy manual flashcard | 🔴 Wysoki | Integration |
| AF6 | `POST /api/flashcards` — 400 na brakujący front | 🔴 Wysoki | Integration |
| AF7 | `POST /api/flashcards` — 400 na invalid JSON body | 🟡 Średni | Integration |
| AF8 | `GET /api/flashcards/:id` — 200 zwraca flashcard | 🟡 Średni | Integration |
| AF9 | `GET /api/flashcards/:id` — 400 na invalid UUID | 🔴 Wysoki | Integration |
| AF10 | `GET /api/flashcards/:id` — 404 gdy nie znaleziono | 🔴 Wysoki | Integration |
| AF11 | `PUT /api/flashcards/:id` — 200 aktualizuje flashcard | 🔴 Wysoki | Integration |
| AF12 | `PUT /api/flashcards/:id` — 400 na walidację (front > 500) | 🟡 Średni | Integration |
| AF13 | `PUT /api/flashcards/:id` — 404 gdy nie znaleziono | 🔴 Wysoki | Integration |
| AF14 | `DELETE /api/flashcards/:id` — 204 usuwa flashcard | 🔴 Wysoki | Integration |
| AF15 | `DELETE /api/flashcards/:id` — 404 gdy nie znaleziono | 🔴 Wysoki | Integration |

#### Generations API

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| AG1 | `POST /api/generations` — 201 z proposals i generation_id | 🔴 Wysoki | Integration |
| AG2 | `POST /api/generations` — 400 na source_text < 1000 znaków | 🔴 Wysoki | Integration |
| AG3 | `POST /api/generations` — 400 na brakujący source_text | 🔴 Wysoki | Integration |
| AG4 | `POST /api/generations` — 500 na AI service error | 🟡 Średni | Integration |
| AG5 | `POST /api/generations/:id/accept` — 201 zapisuje flashcards | 🔴 Wysoki | Integration |
| AG6 | `POST /api/generations/:id/accept` — 400 na invalid UUID | 🟡 Średni | Integration |
| AG7 | `POST /api/generations/:id/accept` — 400 na pusty array | 🔴 Wysoki | Integration |
| AG8 | `POST /api/generations/:id/accept` — 404 gdy sesja nie istnieje | 🔴 Wysoki | Integration |
| AG9 | `POST /api/generations/:id/accept` — 409 gdy już finalized | 🔴 Wysoki | Integration |

#### Auth API

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| AA1 | `POST /api/auth/register` — 201 tworzy konto | 🔴 Wysoki | Integration |
| AA2 | `POST /api/auth/register` — 400 na invalid email | 🔴 Wysoki | Integration |
| AA3 | `POST /api/auth/register` — 400 na hasło < 8 znaków | 🔴 Wysoki | Integration |
| AA4 | `POST /api/auth/register` — 409 na istniejący email | 🟡 Średni | Integration |
| AA5 | `POST /api/auth/login` — 200 loguje użytkownika | 🔴 Wysoki | Integration |
| AA6 | `POST /api/auth/login` — 401 na złe dane | 🔴 Wysoki | Integration |
| AA7 | `POST /api/auth/logout` — 200 wylogowuje | 🟡 Średni | Integration |
| AA8 | `DELETE /api/auth/account` — 200 usuwa konto | 🟡 Średni | Integration |

```typescript
// Przykład: src/pages/api/flashcards/__tests__/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../index';
import { createMockAPIContext } from '../../../../../tests/helpers/api-test.helpers';

describe('GET /api/flashcards', () => {
  it('should return 200 with flashcards list', async () => {
    const { context } = createMockAPIContext({
      url: 'http://localhost:3000/api/flashcards?page=1&limit=10',
      user: { id: 'user-123', email: 'test@example.com' },
      supabaseData: {
        flashcards: [
          { id: 'fc-1', front: 'Q1', back: 'A1', source: 'manual', generation_id: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
        ],
        count: 1,
      },
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.flashcards).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('should return 400 for invalid limit parameter', async () => {
    const { context } = createMockAPIContext({
      url: 'http://localhost:3000/api/flashcards?limit=999',
      user: { id: 'user-123', email: 'test@example.com' },
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

### 4.5 Middleware (`src/middleware/index.ts`)

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| M1 | Public paths (/api/auth/login, /register, /logout) — przepuszcza bez auth | 🔴 Wysoki | Unit |
| M2 | Protected API path — 401 JSON gdy brak sesji | 🔴 Wysoki | Unit |
| M3 | Protected page (/flashcards) — redirect do /login gdy brak sesji | 🔴 Wysoki | Unit |
| M4 | Auth page (/login) — redirect do /flashcards gdy zalogowany | 🔴 Wysoki | Unit |
| M5 | Ustawia `locals.supabase` na każdym requeście | 🟡 Średni | Unit |
| M6 | Ustawia `locals.user` z email gdy zalogowany | 🔴 Wysoki | Unit |
| M7 | `locals.user` = undefined gdy user bez email | 🟡 Średni | Unit |

---

### 4.6 React Hooks (`src/hooks/`)

#### useFlashcards

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| HF1 | Inicjalizacja z `initialFlashcards` i `initialPagination` | 🔴 Wysoki | Unit |
| HF2 | `fetchFlashcards` — pobiera dane z API i aktualizuje stan | 🔴 Wysoki | Unit |
| HF3 | `setSearchQuery` — debounce 300ms przed fetchem | 🔴 Wysoki | Unit |
| HF4 | `setSearchQuery` — resetuje do page 1 | 🟡 Średni | Unit |
| HF5 | `setCurrentPage` — natychmiastowy fetch z nową stroną | 🟡 Średni | Unit |
| HF6 | `createFlashcard` — POST, toast success, reset page/search, refetch | 🔴 Wysoki | Unit |
| HF7 | `updateFlashcard` — PUT, toast success, refetch z kontekstem | 🔴 Wysoki | Unit |
| HF8 | `deleteFlashcard` — optimistic removal, refetch po sukcesie | 🔴 Wysoki | Unit |
| HF9 | `deleteFlashcard` — rollback na błąd fetch | 🔴 Wysoki | Unit |
| HF10 | 401 response — redirect do /login z toast error | 🔴 Wysoki | Unit |
| HF11 | Abort previous request gdy nowy fetch startuje | 🟡 Średni | Unit |
| HF12 | Cleanup: abort + clear timer on unmount | 🟡 Średni | Unit |
| HF13 | Error state — ustawia `error` z error message | 🟡 Średni | Unit |
| HF14 | Page bounds — gdy empty page > 1, przejdź do last page | 🟢 Niski | Unit |

#### useGenerateFlashcards

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| HG1 | `generate` — waliduje source_text przed wysłaniem | 🔴 Wysoki | Unit |
| HG2 | `generate` — POST do API, ustawia proposals i generationId | 🔴 Wysoki | Unit |
| HG3 | `generate` — viewState transitions: idle → generating → generated | 🔴 Wysoki | Unit |
| HG4 | `generate` — timeout error → errorMessage + viewState=error | 🔴 Wysoki | Unit |
| HG5 | `generate` — network error → user-friendly message | 🟡 Średni | Unit |
| HG6 | `acceptProposal` — zmienia status na 'accepted' | 🔴 Wysoki | Unit |
| HG7 | `rejectProposal` — zmienia status na 'rejected' | 🟡 Średni | Unit |
| HG8 | `editProposalFront`/`editProposalBack` — aktualizuje tekst | 🟡 Średni | Unit |
| HG9 | `acceptedCount` — zlicza proposals ze status 'accepted' | 🟡 Średni | Unit |
| HG10 | `saveAccepted` — POST do accept API, redirect na /flashcards | 🔴 Wysoki | Unit |
| HG11 | `saveAccepted` — waliduje flashcards przed wysłaniem | 🔴 Wysoki | Unit |
| HG12 | `saveAccepted` — 401 → redirect do /login | 🟡 Średni | Unit |
| HG13 | `saveAccepted` — error → toast + viewState reverts to 'generated' | 🟡 Średni | Unit |
| HG14 | Abort in-flight request on unmount | 🟡 Średni | Unit |

```typescript
// Przykład: src/hooks/__tests__/useFlashcards.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFlashcards } from '../useFlashcards';
import { toast } from 'sonner';
import { server } from '../../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

const initialProps = {
  initialFlashcards: [
    { id: '1', front: 'Q1', back: 'A1', source: 'manual' as const, generation_id: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  ],
  initialPagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

describe('useFlashcards', () => {
  it('should initialize with provided data', () => {
    const { result } = renderHook(() => useFlashcards(initialProps));

    expect(result.current.flashcards).toHaveLength(1);
    expect(result.current.pagination.total).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle optimistic delete with rollback on error', async () => {
    // Setup handler that rejects delete
    server.use(
      http.delete('/api/flashcards/1', () => {
        return HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Delete failed' } },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useFlashcards(initialProps));

    // Act: trigger delete
    await act(async () => {
      await result.current.deleteFlashcard('1');
    });

    // Assert: flashcard should be restored (rollback)
    expect(result.current.flashcards).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to delete flashcard');
  });

  it('should redirect to /login on 401 response', async () => {
    server.use(
      http.get('/api/flashcards', () => {
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
          { status: 401 }
        );
      })
    );

    const { result } = renderHook(() => useFlashcards(initialProps));

    await act(async () => {
      result.current.setCurrentPage(2);
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
  });
});
```

---

### 4.7 Komponenty React

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| C1 | `FlashcardCard` — renderuje front i back (truncated) | 🟡 Średni | Unit |
| C2 | `FlashcardCard` — wywołuje onEdit callback | 🟡 Średni | Unit |
| C3 | `FlashcardCard` — wywołuje onDelete callback | 🟡 Średni | Unit |
| C4 | `FlashcardCard` — wyświetla source badge (AI/Manual) | 🟢 Niski | Unit |
| C5 | `FlashcardEditDialog` — walidacja: front 1-500, back 1-2000 | 🔴 Wysoki | Unit |
| C6 | `FlashcardEditDialog` — submit wywołuje onSave z danymi | 🔴 Wysoki | Unit |
| C7 | `FlashcardEditDialog` — pre-fill przy edycji istniejącej fiszki | 🟡 Średni | Unit |
| C8 | `GenerationForm` — char counter aktualizuje się live | 🟡 Średni | Unit |
| C9 | `GenerationForm` — przycisk disabled gdy < 1000 znaków | 🔴 Wysoki | Unit |
| C10 | `GenerationForm` — przycisk disabled gdy isLoading=true | 🟡 Średni | Unit |
| C11 | `ProposalCard` — inline edit front/back | 🟡 Średni | Unit |
| C12 | `ProposalCard` — accept/reject buttons wywołują callbacks | 🟡 Średni | Unit |
| C13 | `ProposalCard` — visual state change on accept/reject | 🟢 Niski | Unit |

---

### 4.8 E2E (Playwright)

| # | Scenariusz | Priorytet | Typ |
|---|-----------|-----------|-----|
| E1 | Rejestracja → login → widzi pustą listę fiszek | 🔴 Wysoki | E2E |
| E2 | Login z poprawnymi danymi → redirect do /flashcards | 🔴 Wysoki | E2E |
| E3 | Login z błędnymi danymi → error message | 🔴 Wysoki | E2E |
| E4 | Niezalogowany → /flashcards → redirect do /login | 🔴 Wysoki | E2E |
| E5 | Zalogowany → /login → redirect do /flashcards | 🟡 Średni | E2E |
| E6 | Tworzenie fiszki ręcznie → widoczna na liście | 🔴 Wysoki | E2E |
| E7 | Edycja istniejącej fiszki → zaktualizowane dane | 🔴 Wysoki | E2E |
| E8 | Usunięcie fiszki → znika z listy | 🔴 Wysoki | E2E |
| E9 | Wyszukiwanie fiszek → filtruje wyniki | 🟡 Średni | E2E |
| E10 | Paginacja → nawigacja między stronami | 🟡 Średni | E2E |
| E11 | Generowanie fiszek → propozycje widoczne | 🔴 Wysoki | E2E |
| E12 | Accept + save proposals → redirect do flashcards z nowymi fiszkami | 🔴 Wysoki | E2E |
| E13 | Logout → redirect do /login | 🟡 Średni | E2E |

```typescript
// Przykład: e2e/pages/flashcards.page.ts (Page Object Model)
import { type Page, type Locator } from '@playwright/test';

export class FlashcardsPage {
  readonly page: Page;
  readonly newFlashcardButton: Locator;
  readonly searchInput: Locator;
  readonly flashcardCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newFlashcardButton = page.getByRole('button', { name: /new flashcard/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.flashcardCards = page.locator('[data-testid="flashcard-card"]');
    this.emptyState = page.getByText(/you don.*t have any flashcards/i);
  }

  async goto() {
    await this.page.goto('/flashcards');
  }

  async createFlashcard(front: string, back: string) {
    await this.newFlashcardButton.click();
    await this.page.getByLabel(/front/i).fill(front);
    await this.page.getByLabel(/back/i).fill(back);
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  async searchFlashcards(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce
    await this.page.waitForTimeout(400);
  }

  async getFlashcardCount() {
    return this.flashcardCards.count();
  }
}
```

```typescript
// Przykład: e2e/flashcards-crud.spec.ts
import { test, expect } from '@playwright/test';
import { FlashcardsPage } from './pages/flashcards.page';
import { LoginPage } from './pages/login.page';

test.describe('Flashcard CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await page.waitForURL('/flashcards');
  });

  test('should create a new flashcard', async ({ page }) => {
    const flashcardsPage = new FlashcardsPage(page);

    await flashcardsPage.createFlashcard(
      'What is Vitest?',
      'A fast unit test framework for Vite projects'
    );

    // Verify toast notification
    await expect(page.getByText(/flashcard created/i)).toBeVisible();

    // Verify flashcard appears in list
    await expect(page.getByText('What is Vitest?')).toBeVisible();
  });

  test('should delete a flashcard with confirmation', async ({ page }) => {
    const flashcardsPage = new FlashcardsPage(page);
    const initialCount = await flashcardsPage.getFlashcardCount();

    // Click delete on first card
    await page.locator('[data-testid="flashcard-card"]').first()
      .getByRole('button', { name: /delete/i }).click();

    // Confirm deletion dialog
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify count decreased
    await expect(flashcardsPage.flashcardCards).toHaveCount(initialCount - 1);
  });
});
```

---

## 5. Mockowanie i fixtures

### 5.1 Supabase Client Mock

```typescript
// tests/mocks/supabase.mock.ts
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a chainable mock for Supabase client.
 * Supports builder pattern: supabase.from().select().eq().single()
 */
export function createMockSupabase() {
  const chainMethods = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
  };

  // Make every method chainable (returns itself)
  for (const method of Object.values(chainMethods)) {
    method.mockReturnThis();
  }

  const from = vi.fn().mockReturnValue(chainMethods);
  const rpc = vi.fn();

  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    admin: {
      deleteUser: vi.fn(),
    },
  };

  return {
    from,
    rpc,
    auth,
    _chain: chainMethods, // Expose for fine-grained control
  };
}

/**
 * Configures the mock chain to resolve with specific data.
 * Usage: configureSupabaseResponse(mock, { data: [...], count: 10 });
 */
export function configureSupabaseResponse(
  mock: ReturnType<typeof createMockSupabase>,
  response: { data?: unknown; error?: { message: string; code?: string } | null; count?: number }
) {
  const { data = null, error = null, count } = response;

  // Configure the terminal method to resolve with data
  mock._chain.single.mockResolvedValue({ data, error });
  mock._chain.range.mockResolvedValue({ data, error, count: count ?? 0 });

  // For delete with count
  mock._chain.delete.mockReturnValue({
    ...mock._chain,
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error, count: count ?? 0 }),
    }),
  });
}
```

### 5.2 AI Service Mock

```typescript
// tests/mocks/ai-service.mock.ts
import { vi } from 'vitest';
import type { AIService } from '../../src/lib/services/ai.service';
import type { FlashcardProposalDTO } from '../../src/types';

export function createMockAIService(
  overrides: Partial<AIService> = {}
): AIService {
  return {
    get modelName() { return 'test-model'; },
    generateFlashcardProposals: vi.fn().mockResolvedValue([
      { front: 'Test Question 1?', back: 'Test Answer 1' },
      { front: 'Test Question 2?', back: 'Test Answer 2' },
    ] satisfies FlashcardProposalDTO[]),
    ...overrides,
  };
}
```

### 5.3 MSW Handlers

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { flashcardFixtures } from '../fixtures/flashcard.fixtures';
import { paginationFixtures } from '../fixtures/pagination.fixtures';

export const handlers = [
  // GET /api/flashcards
  http.get('/api/flashcards', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '20');

    return HttpResponse.json({
      flashcards: flashcardFixtures.list(limit),
      pagination: paginationFixtures.create({ page, limit, total: 45 }),
    });
  }),

  // POST /api/flashcards
  http.post('/api/flashcards', async ({ request }) => {
    const body = await request.json() as { front: string; back: string };
    return HttpResponse.json(
      flashcardFixtures.single({ ...body, source: 'manual' }),
      { status: 201 }
    );
  }),

  // DELETE /api/flashcards/:id
  http.delete('/api/flashcards/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // PUT /api/flashcards/:id
  http.put('/api/flashcards/:id', async ({ request }) => {
    const body = await request.json() as { front: string; back: string };
    return HttpResponse.json(
      flashcardFixtures.single(body)
    );
  }),

  // POST /api/generations
  http.post('/api/generations', () => {
    return HttpResponse.json({
      generation_id: '550e8400-e29b-41d4-a716-446655440000',
      flashcards_proposals: [
        { front: 'Generated Q1?', back: 'Generated A1' },
        { front: 'Generated Q2?', back: 'Generated A2' },
      ],
      generated_count: 2,
    }, { status: 201 });
  }),

  // POST /api/generations/:id/accept
  http.post('/api/generations/:id/accept', async ({ request }) => {
    const body = await request.json() as { flashcards: Array<{ front: string; back: string }> };
    return HttpResponse.json({
      flashcards: body.flashcards.map((fc, i) => ({
        id: `fc-${i}`,
        ...fc,
        source: 'ai_generated',
        generation_id: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      accepted_count: body.flashcards.length,
    }, { status: 201 });
  }),
];
```

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 5.4 Fixtures

```typescript
// tests/fixtures/flashcard.fixtures.ts
import type { FlashcardDTO } from '../../src/types';

let counter = 0;

export const flashcardFixtures = {
  single(overrides: Partial<FlashcardDTO> = {}): FlashcardDTO {
    counter++;
    return {
      id: `550e8400-e29b-41d4-a716-${String(counter).padStart(12, '0')}`,
      front: `Question ${counter}?`,
      back: `Answer ${counter}`,
      source: 'manual',
      generation_id: null,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      ...overrides,
    };
  },

  list(count = 5, overrides: Partial<FlashcardDTO> = {}): FlashcardDTO[] {
    return Array.from({ length: count }, () => flashcardFixtures.single(overrides));
  },

  aiGenerated(overrides: Partial<FlashcardDTO> = {}): FlashcardDTO {
    return flashcardFixtures.single({
      source: 'ai_generated',
      generation_id: '660e8400-e29b-41d4-a716-446655440000',
      ...overrides,
    });
  },
};

// tests/fixtures/pagination.fixtures.ts
import type { PaginationDTO } from '../../src/types';

export const paginationFixtures = {
  create(overrides: Partial<PaginationDTO> & { total?: number } = {}): PaginationDTO {
    const { page = 1, limit = 20, total = 0 } = overrides;
    return {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  },
};
```

### 5.5 API Test Helpers

```typescript
// tests/helpers/api-test.helpers.ts
import { vi } from 'vitest';
import { createMockSupabase } from '../mocks/supabase.mock';
import type { AuthUserDTO } from '../../src/types';

interface MockAPIContextOptions {
  url: string;
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  user?: AuthUserDTO;
  supabaseData?: {
    flashcards?: unknown[];
    count?: number;
    single?: unknown;
    error?: { message: string; code?: string } | null;
  };
}

/**
 * Creates a mock Astro APIContext for testing API endpoints.
 * Simulates: locals.user, locals.supabase, request, url, params
 */
export function createMockAPIContext(options: MockAPIContextOptions) {
  const { url, method = 'GET', body, params = {}, user, supabaseData } = options;

  const mockSupabase = createMockSupabase();

  // Configure supabase responses if provided
  if (supabaseData) {
    const { flashcards, count, single, error } = supabaseData;
    if (flashcards) {
      mockSupabase._chain.range.mockResolvedValue({ data: flashcards, error: error ?? null, count: count ?? flashcards.length });
    }
    if (single !== undefined) {
      mockSupabase._chain.single.mockResolvedValue({ data: single, error: error ?? null });
    }
  }

  const request = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const context = {
    request,
    url: new URL(url),
    params,
    locals: {
      user: user ?? undefined,
      supabase: mockSupabase,
    },
  };

  return { context, mockSupabase };
}
```

---

## 6. CI/CD integracja

### 6.1 GitHub Actions Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  unit-integration:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-integration  # E2E only if unit tests pass
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      USE_MOCK_AI: 'true'  # Always use mock AI in CI
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright (Chromium only)
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### 6.2 Kryteria blokujące merge

| Kryterium | Blokuje merge? | Uzasadnienie |
|-----------|---------------|--------------|
| Unit + Integration testy przechodzą | ✅ Tak | Zapobiega regresji logiki biznesowej |
| Coverage > 60% (statements) | ✅ Tak | Wymusza utrzymanie pokrycia |
| E2E testy przechodzą | ⚠️ Warunkowe | Non-blocking w PR (flaky risk), blocking na `master` |
| ESLint bez errorów | ✅ Tak | Spójność kodu |
| TypeScript kompiluje się | ✅ Tak | Bezpieczeństwo typów |

### 6.3 Lokalne pre-commit hooks

Istniejący `lint-staged` w `package.json` powinien zostać rozszerzony:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ],
    "*.astro": [
      "eslint --fix"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

> **Uwaga:** `vitest related --run` uruchamia tylko testy powiązane ze zmienionymi plikami. Szybkie i celne.

---

## 7. Metryki i cele

### 7.1 Docelowe pokrycie kodu (per warstwa)

| Warstwa | Target | Uzasadnienie |
|---------|--------|-------------|
| `src/lib/schemas/` | ≥ 90% | Czysto funkcyjne, łatwe do pełnego pokrycia |
| `src/lib/utils.ts` | ≥ 90% | j.w. |
| `src/lib/services/` | ≥ 80% | Kluczowa logika biznesowa |
| `src/pages/api/` | ≥ 75% | Integracyjne — pokrywają walidację + error handling |
| `src/middleware/` | ≥ 80% | Krytyczne dla bezpieczeństwa |
| `src/hooks/` | ≥ 70% | Złożone async flow, ale trudniejsze do testowania |
| `src/components/` | ≥ 50% | Skupiamy się na interakcji, nie rendererze |
| **Ogólnie** | **≥ 60%** | Realistyczne MVP, rosnące z czasem |

### 7.2 Docelowy czas wykonania

| Zestaw | Target | Limit akceptowalny |
|--------|--------|-------------------|
| Unit tests | < 5s | < 10s |
| Integration tests | < 15s | < 30s |
| E2E tests | < 60s | < 120s |
| Pełny suite (CI) | < 3 min | < 5 min |

### 7.3 KPI sukcesu wdrożenia testów

| KPI | Cel (3 miesiące) | Pomiar |
|-----|-----------------|--------|
| Test suite reliability | < 1% flaky rate | Monitoring CI runs |
| Czas feedback loop (unit) | < 10s | `vitest --watch` |
| Regresje na produkcji | 0 regresji wykrytych post-deploy | Issue tracker |
| Coverage trend | Rosnący co sprint | Raport coverage w CI |
| Developer confidence | Testy uruchamiane przed każdym PR | PR checks history |

### 7.4 Priorytety — co testować najpierw

```
1. Zod schemas      ← Zero mockowania, łapią 80% błędów walidacji
2. Utils            ← Czyste funkcje, natychmiastowy ROI
3. API endpoints    ← Integracyjne, pokrywają wiele warstw na raz
4. Middleware       ← Bezpieczeństwo, krytyczne
5. Services         ← Logika biznesowa
6. Hooks            ← Złożony stan, ale wymagają MSW
7. Components       ← Interakcja UI
8. E2E              ← Największy koszt, ale weryfikuje cały stack
```

---

## 8. Specyficzne wyzwania i rozwiązania

### 8.1 Testowanie Astro API Endpoints

**Problem:** Endpointy Astro to exportowane funkcje (GET, POST, PUT, DELETE) przyjmujące `APIContext` — nie ma HTTP serwera do odpytania w testach jednostkowych.

**Rozwiązanie:** Tworzymy mock `APIContext` z `createMockAPIContext()` i wywołujemy handler bezpośrednio:

```typescript
import { GET } from '../index';
const { context } = createMockAPIContext({ url: '...', user: {...} });
const response = await GET(context);
expect(response.status).toBe(200);
```

**Dlaczego nie supertest/pactum?** Bo endpointy Astro to nie Express middleware — to czyste funkcje. Bezpośrednie wywołanie jest szybsze i prostsze.

### 8.2 Mockowanie Supabase

**Problem:** Supabase client ma chainable API (`from().select().eq().single()`) — trudne do mockowania.

**Rozwiązanie:** Mock factory z `mockReturnThis()` na każdej metodzie łańcucha. Terminal methods (`.single()`, `.range()`) zwracają `Promise<{ data, error }>`.

**Alternatywa na przyszłość:** Dla testów integracyjnych z prawdziwą bazą — Supabase CLI z lokalną instancją (`supabase start`). Poza zakresem MVP.

### 8.3 Testowanie hooków z native fetch

**Problem:** Hooki używają `fetch` z `AbortController` + `AbortSignal.timeout()` — nie `axios`, nie TanStack Query.

**Rozwiązanie:** MSW interceptuje `fetch` na poziomie sieci — nie trzeba stubbować `window.fetch`. AbortController działa naturalnie.

### 8.4 Testowanie React komponentów hydrowanych w Astro

**Problem:** Komponenty React w Astro są hydrowane z `client:load` — w testach jednostkowych nie ma Astro.

**Rozwiązanie:** Testujemy komponenty React w izolacji (bez Astro). `@testing-library/react` renderuje je bezpośrednio. Integrację Astro ↔ React weryfikujemy przez E2E.

### 8.5 import.meta.env w testach

**Problem:** Astro/Vite używa `import.meta.env` — w testach Vitest to nie jest automatycznie dostępne.

**Rozwiązanie:** Vitest (jako Vite-based tool) obsługuje `import.meta.env` natywnie. Można ustawić zmienne w `vitest.config.ts`:

```typescript
// vitest.config.ts
define: {
  'import.meta.env.USE_MOCK_AI': JSON.stringify('true'),
}
```

Lub per-test:

```typescript
vi.stubEnv('USE_MOCK_AI', 'true');
```

### 8.6 E2E z Supabase

**Problem:** Testy E2E wymagają działającej bazy danych z użytkownikami testowymi.

**Rozwiązania (do wyboru):**

1. **Dedykowane konto testowe** — pre-created user w Supabase (najprostsze dla MVP)
2. **Supabase CLI** — lokalna instancja z seed danymi (`supabase db reset` przed testami)
3. **API-based setup** — testy tworzą usera przez API w `beforeAll`, usuwają w `afterAll`

**Rekomendacja MVP:** Opcja 3 (API-based setup) — samowystarczalne testy, nie wymagają zewnętrznej konfiguracji.

```typescript
// e2e/helpers/auth.helper.ts
import { type Page } from '@playwright/test';

export async function createTestUser(page: Page) {
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const response = await page.request.post('/api/auth/register', {
    data: { email, password },
  });

  return { email, password, response };
}

export async function cleanupTestUser(page: Page) {
  await page.request.delete('/api/auth/account');
}
```

### 8.7 Testowanie RLS (Row Level Security)

**Problem:** RLS jest egzekwowane przez PostgreSQL, nie przez kod aplikacji. Testy jednostkowe z mockowanym Supabase nie weryfikują RLS.

**Rozwiązanie:**

- **Unit/Integration:** Weryfikujemy czy kod przekazuje `user_id` w `.eq()` — explicit filter
- **E2E:** Test z dwoma użytkownikami — user A nie widzi fiszek user B
- **Dedykowany test RLS (opcjonalny):** SQL test z Supabase CLI sprawdzający polityki

```typescript
// E2E test dla RLS
test('user should not see flashcards from another user', async ({ browser }) => {
  // Create two isolated contexts (different users)
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // User A creates a flashcard
  await loginAs(pageA, 'userA@test.com', 'password');
  await createFlashcard(pageA, 'Secret Question', 'Secret Answer');

  // User B should not see it
  await loginAs(pageB, 'userB@test.com', 'password');
  const flashcards = await getFlashcards(pageB);
  expect(flashcards).not.toContainEqual(
    expect.objectContaining({ front: 'Secret Question' })
  );

  await contextA.close();
  await contextB.close();
});
```
