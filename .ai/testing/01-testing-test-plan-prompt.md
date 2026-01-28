# Prompt: Plan testowania projektu 10x-cards

Jesteś doświadczonym inżynierem QA specjalizującym się w testowaniu aplikacji webowych opartych na architekturze SSR + client-side hydration. Twoim zadaniem jest stworzenie kompleksowego, praktycznego planu testów dla projektu 10x-cards.

## Kontekst projektu

<prd>
@.ai/prd.md
</prd>

<stos_technologiczny>
@.ai/tech-stack.md
</stos_technologiczny>

<architektura_ui>
@.ai/ui/05-ui-high-level-plan.md
</architektura_ui>

<plan_api>
@.ai/api/02-high-level-api-plan.md
</plan_api>

<schemat_bazy_danych>
@.ai/db/05-db-plan.md
</schemat_bazy_danych>

<vitest_rules>
@.claude/on-demand-rules/guide-for-unit-tests-with-vitest.md
</vitest_rules>

<playwright_rules>
@.claude/on-demand-rules/guide-for-e2e-tests-with-playwright.md
</playwright_rules>

## Specyfika techniczna do uwzględnienia

Projekt ma warstwową architekturę z czytelnymi granicami:

1. **Astro pages** (SSR) — renderują stronę server-side, pobierają dane inicjalne, przekazują jako props do React
2. **React components** (hydrowane `client:load`) — interaktywność, formularze, stany UI
3. **Custom hooks** (`useFlashcards`, `useGenerateFlashcards`) — zarządzanie stanem i wywołania API (native fetch + AbortController)
4. **API endpoints** (`src/pages/api/`) — walidacja Zod, delegacja do serwisów, standardowe `ErrorResponseDTO`
5. **Services** (`src/lib/services/`) — logika biznesowa, interakcja z Supabase
6. **Zod schemas** (`src/lib/schemas/`) — walidacja na granicy systemu (API)
7. **Supabase** — PostgreSQL z RLS, cookie-based auth, RPC functions

Kluczowe wzorce:
- Brak zewnętrznego state managementu — hooki Reacta + lokalne stany
- Brak TanStack Query — natywny fetch z AbortController + AbortSignal.timeout()
- Autentykacja — Supabase Auth z httpOnly cookies, middleware sprawdza sesję na każdym request
- AI integration — factory pattern (MockAIService / OpenRouterService), konfigurowany przez env
- Optymistyczne usuwanie z rollbackiem w hooku `useFlashcards`
- Transakcyjne zapisywanie zaakceptowanych propozycji przez RPC (`accept_generation`)

Decyzja technologiczna: plan testów musi bazować na **Vitest** (testy jednostkowe i integracyjne) oraz **Playwright** (testy E2E). To docelowy stack testowy projektu.

Aktualny stan: **brak jakiejkolwiek infrastruktury testowej** — nie ma Vitest, Playwright ani żadnych plików testowych.

## Wymagania dla planu testów

Stwórz plan testów, który:

1. **Uwzględnia warstwowość architektury** — dla każdej warstwy (schemas, services, API endpoints, hooks, components) zaproponuj odpowiedni typ testów, narzędzia i przykładowe scenariusze.

2. **Jest praktyczny i przyrostowy** — zaproponuj kolejność wdrażania testów od najwyższego ROI (najłatwiejsze do napisania / najwięcej wartości), tak żeby można było wdrażać testy iteracyjnie, a nie "wszystko na raz".

3. **Proponuje konkretny stack testowy** ze wskazaniem:
   - Narzędzi i bibliotek (z uzasadnieniem wyboru)
   - Konfiguracji (pliki konfiguracyjne, skrypty npm)
   - Struktury katalogów testowych

4. **Definiuje scenariusze testowe** dla kluczowych przepływów:
   - Rejestracja i logowanie (cookie-based auth)
   - Generowanie fiszek przez AI (pełny flow: tekst → API → AI service → proposals → accept)
   - CRUD fiszek (z paginacją i wyszukiwaniem)
   - Middleware (ochrona tras, przekierowania)
   - Obsługa błędów (401 session expiry, timeout, walidacja Zod)

5. **Adresuje wyzwania specyficzne dla tego stacku**:
   - Testowanie Astro SSR endpoints (API routes jako funkcje serwerowe)
   - Mockowanie Supabase (auth, database, RPC)
   - Testowanie React components hydrowanych w Astro (client:load)
   - Testowanie hooków z native fetch i AbortController
   - Izolacja testów od zewnętrznego AI API (mock vs real)
   - Testowanie RLS (Row Level Security) — czy użytkownik widzi tylko swoje dane

6. **Określa metryki i kryteria sukcesu**:
   - Docelowe pokrycie kodu (realistyczne cele per warstwa)
   - Kryteria akceptacji dla CI/CD pipeline
   - Co powinno blokować merge, a co nie

## Format odpowiedzi

Przedstaw plan w formacie Markdown z następującą strukturą:

1. **Strategia testowania** — podejście ogólne, piramida testów dla tego projektu
2. **Stack testowy** — narzędzia, konfiguracja, struktura katalogów
3. **Plan wdrażania** — kolejność implementacji testów (fazy) z uzasadnieniem priorytetów
4. **Scenariusze testowe per warstwa** — konkretne przypadki testowe z oznaczeniem priorytetu
5. **Mockowanie i fixtures** — strategia dla Supabase, AI service, fetch
6. **CI/CD integracja** — pipeline, kryteria blokujące, raportowanie
7. **Metryki i cele** — pokrycie, czas wykonania, kryteria sukcesu

Plan powinien być napisany po polsku, w formie gotowej do wdrożenia — nie jako ogólne zalecenia, ale jako konkretny action plan z przykładami kodu konfiguracyjnego i strukturą plików.

Wygenerowany plan zapisz w pliku /home/mateusz/projects/plg/10x-cards/.ai/testing/02-testing-test-plan.md (aktualnie nie istnieje).