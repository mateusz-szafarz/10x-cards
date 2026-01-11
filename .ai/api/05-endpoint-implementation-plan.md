# API Endpoint Implementation Plan: POST /api/generations

<analysis>

## 1. Kluczowe punkty specyfikacji API

- **Cel**: Endpoint do generowania propozycji fiszek przez AI na podstawie tekstu źródłowego
- **Metoda HTTP**: POST
- **Ścieżka**: `/api/generations`
- **Autoryzacja**: Bearer token (Supabase Auth)
- **Kod sukcesu**: 201 Created
- **Efekty uboczne**:
  - Sukces: Tworzenie rekordu w `generation_sessions` (z `accepted_count = NULL`)
  - Błąd: Tworzenie rekordu w `generation_error_logs`
- **Ważne**: Propozycje fiszek NIE są zapisywane do bazy - są zwracane do przeglądu przez użytkownika

## 2. Parametry żądania

**Wymagane:**
- `source_text` (string): Tekst źródłowy do analizy przez AI
  - Walidacja: 1000-10000 znaków
  - Przesyłany w body jako JSON

**Opcjonalne:**
- Brak opcjonalnych parametrów

## 3. Typy DTO i Command Models

**Istniejące typy w `src/types.ts`:**
- `CreateGenerationCommand` - command model dla żądania
- `FlashcardProposalDTO` - struktura pojedynczej propozycji fiszki
- `GenerationResponseDTO` - struktura odpowiedzi sukcesu
- `ErrorResponseDTO` - standardowa struktura błędu

**Potrzebne dodatkowe typy:**
- Zod schema dla walidacji `CreateGenerationCommand`
- Typy wewnętrzne dla komunikacji z OpenRouter API

## 4. Wyodrębnienie logiki do serwisów

Potrzebne będą dwa nowe serwisy:

1. **`GenerationService`** (`src/lib/services/generation.service.ts`)
   - Orkiestracja procesu generowania
   - Zapis sesji do `generation_sessions`
   - Zapis błędów do `generation_error_logs`
   - Metoda główna: `generateFlashcards(userId, sourceText)`

2. **`OpenRouterService`** (`src/lib/services/openrouter.service.ts`)
   - Komunikacja z OpenRouter API
   - Budowanie promptów dla modelu AI
   - Parsowanie odpowiedzi AI do `FlashcardProposalDTO[]`
   - Obsługa retry i timeout

## 5. Walidacja danych wejściowych

**Zod Schema:**
```typescript
const createGenerationSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Source text must be at least 1000 characters")
    .max(10000, "Source text must not exceed 10000 characters")
});
```

**Punkty walidacji:**
- Obecność pola `source_text`
- Typ danych: string
- Długość: 1000-10000 znaków
- Walidacja na poziomie endpointu przed przekazaniem do serwisu

## 6. Rejestrowanie błędów

Błędy związane z AI (kody 500, 503) muszą być logowane do `generation_error_logs`:

```typescript
interface ErrorLogEntry {
  user_id: string;
  source_text: string;
  error_code: string;  // np. "AI_SERVICE_ERROR", "AI_SERVICE_UNAVAILABLE"
  error_message: string;
  model_used: string;
}
```

**Kiedy logować:**
- Błąd odpowiedzi z OpenRouter API
- Timeout komunikacji z AI
- Nieprawidłowy format odpowiedzi AI
- Rate limiting z OpenRouter

## 7. Potencjalne zagrożenia bezpieczeństwa

1. **Injection attacks**: Tekst źródłowy trafia do prompta AI - należy go odpowiednio osadzić
2. **DoS przez duże żądania**: Limit 10000 znaków chroni przed zbyt dużymi payloadami
3. **Token leakage**: Klucz API OpenRouter musi być tylko po stronie serwera
4. **Rate limiting**: Brak wbudowanego limitu - użytkownik może generować wiele sesji
5. **Prompt injection**: Użytkownik może próbować manipulować zachowaniem AI

## 8. Scenariusze błędów

| Status | Kod                   | Warunek                                       |
|--------|-----------------------|-----------------------------------------------|
| 400    | VALIDATION_ERROR      | Brak `source_text` w body                     |
| 400    | VALIDATION_ERROR      | `source_text` < 1000 lub > 10000 znaków       |
| 400    | VALIDATION_ERROR      | `source_text` nie jest stringiem              |
| 401    | UNAUTHORIZED          | Brak tokena lub nieprawidłowy token           |
| 500    | AI_SERVICE_ERROR      | Błąd odpowiedzi z OpenRouter                  |
| 500    | AI_SERVICE_ERROR      | Nieprawidłowy format odpowiedzi AI            |
| 503    | AI_SERVICE_UNAVAILABLE| Timeout lub niedostępność OpenRouter          |

</analysis>

---

## 1. Przegląd endpointu

Endpoint `POST /api/generations` służy do inicjowania sesji generowania fiszek przez AI. Użytkownik przesyła tekst źródłowy (1000-10000 znaków), który jest analizowany przez model językowy (LLM) poprzez usługę OpenRouter. W odpowiedzi użytkownik otrzymuje propozycje fiszek do przeglądu i ewentualnej edycji przed zapisaniem.

Endpoint tworzy rekord w tabeli `generation_sessions` przy każdym udanym wywołaniu. W przypadku błędów związanych z usługą AI, zapisuje szczegóły do tabeli `generation_error_logs`.

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/generations`
- **Nagłówki**:
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json` (wymagany)

**Parametry:**
- **Wymagane**:
  - `source_text` (string): Tekst źródłowy do analizy, 1000-10000 znaków
- **Opcjonalne**: Brak

**Request Body:**
```json
{
  "source_text": "Long text content between 1000-10000 characters..."
}
```

## 3. Wykorzystywane typy

**Istniejące typy z `src/types.ts`:**

```typescript
// Command model dla żądania
type CreateGenerationCommand = Pick<GenerationSessionInsert, "source_text">;

// DTO dla pojedynczej propozycji fiszki
interface FlashcardProposalDTO {
  front: string;
  back: string;
}

// DTO odpowiedzi sukcesu
interface GenerationResponseDTO {
  generation_id: string;
  flashcards_proposals: FlashcardProposalDTO[];
  generated_count: number;
}

// Standardowa struktura błędu
interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
  };
}
```

**Nowe typy do utworzenia:**

```typescript
// src/lib/schemas/generation.schema.ts
// Zod schema dla walidacji

// src/lib/services/openrouter.types.ts
// Typy dla komunikacji z OpenRouter API
```

## 4. Szczegóły odpowiedzi

**Sukces (201 Created):**
```json
{
  "generation_id": "uuid",
  "flashcards_proposals": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy"
    }
  ],
  "generated_count": 5
}
```

**Błędy:**

| Status | Struktura odpowiedzi |
|--------|---------------------|
| 400    | `{ "error": { "code": "VALIDATION_ERROR", "message": "Source text is required" } }` |
| 400    | `{ "error": { "code": "VALIDATION_ERROR", "message": "Source text must be between 1000 and 10000 characters" } }` |
| 401    | `{ "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" } }` |
| 500    | `{ "error": { "code": "AI_SERVICE_ERROR", "message": "Failed to generate flashcards" } }` |
| 503    | `{ "error": { "code": "AI_SERVICE_UNAVAILABLE", "message": "AI service is temporarily unavailable" } }` |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Client    │────▶│  API Endpoint    │────▶│ GenerationService │
│             │     │  /api/generations │     │                   │
└─────────────┘     └──────────────────┘     └───────────────────┘
                              │                        │
                              ▼                        ▼
                    ┌──────────────────┐     ┌───────────────────┐
                    │  Zod Validation  │     │ OpenRouterService │
                    └──────────────────┘     └───────────────────┘
                                                       │
                                                       ▼
                                             ┌───────────────────┐
                                             │   OpenRouter API  │
                                             │   (External LLM)  │
                                             └───────────────────┘
                                                       │
                              ┌─────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase Database                         │
├─────────────────────────────┬───────────────────────────────────┤
│   generation_sessions       │     generation_error_logs         │
│   (przy sukcesie)           │     (przy błędzie AI)             │
└─────────────────────────────┴───────────────────────────────────┘
```

**Kroki przepływu:**

1. Klient wysyła POST z `source_text` i tokenem autoryzacji
2. Middleware Astro weryfikuje token i ustawia `context.locals.supabase`
3. Endpoint waliduje body za pomocą Zod schema
4. `GenerationService.generateFlashcards()` jest wywoływany
5. `OpenRouterService.generateFlashcardProposals()` wysyła prompt do AI
6. Po otrzymaniu odpowiedzi AI, parsuje propozycje fiszek
7. Sukces: Zapis do `generation_sessions`, zwrot 201 z propozycjami
8. Błąd AI: Zapis do `generation_error_logs`, zwrot 500/503

## 6. Względy bezpieczeństwa

### Uwierzytelnianie i autoryzacja
- Token Bearer weryfikowany przez middleware Supabase
- `user_id` pobierany z kontekstu sesji, nie z requestu
- Dostęp tylko do własnych danych (RLS na poziomie Supabase)

### Walidacja danych wejściowych
- Zod schema z restrykcyjną walidacją długości tekstu
- Limit 10000 znaków zapobiega atakom DoS przez duże payloady
- Trim/sanityzacja tekstu przed wysłaniem do AI

### Ochrona przed Prompt Injection
- Tekst użytkownika osadzany w jasno określonej sekcji prompta
- Instrukcje systemowe przed tekstem użytkownika
- Walidacja formatu odpowiedzi AI

### Bezpieczeństwo kluczy API
- Klucz OpenRouter tylko w zmiennych środowiskowych serwera
- Nigdy nie eksponowany w odpowiedziach błędów

### Ograniczenia użycia
- Rozważyć rate limiting na poziomie użytkownika (przyszła implementacja)
- Monitorowanie kosztów generacji per user

## 7. Obsługa błędów

### Błędy walidacji (400)

```typescript
// Brak source_text
if (!body.source_text) {
  return new Response(JSON.stringify({
    error: { code: "VALIDATION_ERROR", message: "Source text is required" }
  }), { status: 400 });
}

// Nieprawidłowa długość
const result = schema.safeParse(body);
if (!result.success) {
  return new Response(JSON.stringify({
    error: {
      code: "VALIDATION_ERROR",
      message: "Source text must be between 1000 and 10000 characters"
    }
  }), { status: 400 });
}
```

### Błędy autoryzacji (401)

```typescript
// W middleware lub na początku endpointu
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return new Response(JSON.stringify({
    error: { code: "UNAUTHORIZED", message: "Not authenticated" }
  }), { status: 401 });
}
```

### Błędy serwisu AI (500, 503)

```typescript
try {
  const proposals = await openRouterService.generate(sourceText);
  // ...
} catch (error) {
  // Zapis do generation_error_logs
  await generationService.logError({
    user_id: user.id,
    source_text: sourceText,
    error_code: error.isTimeout ? "AI_SERVICE_UNAVAILABLE" : "AI_SERVICE_ERROR",
    error_message: error.message,
    model_used: config.modelId
  });

  const status = error.isTimeout ? 503 : 500;
  const code = error.isTimeout ? "AI_SERVICE_UNAVAILABLE" : "AI_SERVICE_ERROR";
  const message = error.isTimeout
    ? "AI service is temporarily unavailable"
    : "Failed to generate flashcards";

  return new Response(JSON.stringify({
    error: { code, message }
  }), { status });
}
```

## 8. Rozważania dotyczące wydajności

### Czas odpowiedzi
- Wywołanie OpenRouter może trwać 5-30 sekund
- Rozważyć implementację streamingu w przyszłości
- Timeout na poziomie 60 sekund dla wywołań AI

### Optymalizacje
- Pojedyncze wywołanie AI zamiast wielu małych
- Asynchroniczny zapis do bazy (nie blokuje odpowiedzi)
- Połączenie do bazy z connection pooling (Supabase wbudowane)

### Monitoring
- Logowanie czasu generacji do metryki
- Śledzenie kosztów per model/user
- Alerting przy wysokim error rate

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie struktury

1. Utworzenie pliku schematu walidacji `src/lib/schemas/generation.schema.ts`
   ```typescript
   // Zod schema dla CreateGenerationCommand
   export const createGenerationSchema = z.object({
     source_text: z
       .string({ required_error: "Source text is required" })
       .min(1000, "Source text must be between 1000 and 10000 characters")
       .max(10000, "Source text must be between 1000 and 10000 characters")
   });
   ```

2. Utworzenie pliku typów dla OpenRouter `src/lib/services/openrouter.types.ts`
   ```typescript
   // Typy żądania i odpowiedzi OpenRouter
   // Konfiguracja modelu
   ```

### Etap 2: Implementacja OpenRouterService

3. Utworzenie `src/lib/services/openrouter.service.ts`
   - Konfiguracja klienta HTTP (fetch)
   - Metoda `generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]>`
   - Budowanie prompta systemowego i użytkownika
   - Parsowanie odpowiedzi JSON z AI
   - Obsługa błędów i timeout

4. Utworzenie prompta dla AI
   - System prompt definiujący rolę i format odpowiedzi
   - User prompt z tekstem źródłowym
   - Instrukcje generowania fiszek w formacie JSON

### Etap 3: Implementacja GenerationService

5. Utworzenie `src/lib/services/generation.service.ts`
   - Metoda `generateFlashcards(userId: string, sourceText: string): Promise<GenerationResponseDTO>`
   - Metoda `logError(errorData: ErrorLogEntry): Promise<void>`
   - Integracja z OpenRouterService
   - Zapis do `generation_sessions`
   - Obsługa transakcji i rollback

### Etap 4: Implementacja endpointu

6. Utworzenie `src/pages/api/generations/index.ts`
   ```typescript
   export const prerender = false;

   export const POST: APIRoute = async ({ locals, request }) => {
     // 1. Sprawdzenie autoryzacji
     // 2. Parsowanie i walidacja body
     // 3. Wywołanie GenerationService
     // 4. Zwrot odpowiedzi
   };
   ```

### Etap 5: Konfiguracja środowiska

7. Dodanie zmiennych środowiskowych
   ```
   OPENROUTER_API_KEY=sk-...
   OPENROUTER_MODEL_ID=openai/gpt-4o-mini
   ```

8. Aktualizacja typów dla `import.meta.env`

### Etap 6: Testowanie

9. Testy jednostkowe dla schematów walidacji
10. Testy integracyjne dla serwisów (z mockami OpenRouter)
11. Testy E2E dla pełnego przepływu endpointu
12. Testy błędów i edge cases

### Etap 7: Dokumentacja i finalizacja

13. Aktualizacja dokumentacji API
14. Code review i refactoring
15. Deployment na środowisko staging
16. Testy akceptacyjne