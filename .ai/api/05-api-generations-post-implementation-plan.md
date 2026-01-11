# API Endpoint Implementation Plan: POST /api/generations

## 1. Przegląd endpointu

Endpoint `POST /api/generations` służy do inicjowania sesji generowania fiszek przez AI. Użytkownik przesyła tekst
źródłowy (1000-10000 znaków), który jest analizowany przez model językowy (LLM) poprzez usługę OpenRouter. W odpowiedzi
użytkownik otrzymuje propozycje fiszek do przeglądu i ewentualnej edycji przed zapisaniem.

Endpoint tworzy rekord w tabeli `generation_sessions` przy każdym udanym wywołaniu. W przypadku błędów związanych z
usługą AI, zapisuje szczegóły do tabeli `generation_error_logs`.

## 2. Uproszczenia na etapie MVP

> ⚠️ **UWAGA**: Poniższe uproszczenia mają na celu szybkie przejście do implementacji UI i testów funkcjonalnych.
> Zostaną usunięte w kolejnych iteracjach.

### 2.1. Brak autentykacji

- **Zahardcodowany user ID**: `484dc1d3-add5-4701-a9a5-d91b12fb6165`
- Endpoint nie wymaga tokenu Bearer
- Nagłówek `Authorization` jest ignorowany
- Autentykacja zostanie dodana w osobnym etapie

### 2.2. Wyłączony Row Level Security (RLS)

- RLS jest tymczasowo wyłączony na wszystkich tabelach
- Pozwala to na prostsze testowanie bez konieczności konfiguracji polityk
- RLS zostanie włączony po implementacji autentykacji

### 2.3. Zamockowany serwis AI (OpenRouter)

- Zamiast rzeczywistego wywołania OpenRouter API, używamy mockowej implementacji
- Mock zwraca predefiniowane propozycje fiszek
- Pozwala to na testowanie flow bez kosztów API i zależności od zewnętrznego serwisu
- Rzeczywista integracja z OpenRouter zostanie dodana w kolejnym etapie

## 3. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/generations`
- **Nagłówki**:
    - `Content-Type: application/json` (wymagany)
    - ~~`Authorization: Bearer <access_token>`~~ (pominięty w MVP)

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

## 4. Wykorzystywane typy

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
```

## 5. Szczegóły odpowiedzi

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

| Status | Struktura odpowiedzi                                                                                              |
|--------|-------------------------------------------------------------------------------------------------------------------|
| 400    | `{ "error": { "code": "VALIDATION_ERROR", "message": "Source text is required" } }`                               |
| 400    | `{ "error": { "code": "VALIDATION_ERROR", "message": "Source text must be between 1000 and 10000 characters" } }` |

> **Uwaga MVP**: Błędy 401 (UNAUTHORIZED), 500 (AI_SERVICE_ERROR) i 503 (AI_SERVICE_UNAVAILABLE) zostaną dodane
> po implementacji autentykacji i rzeczywistej integracji z OpenRouter.

## 6. Przepływ danych (MVP)

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Client    │────▶│  API Endpoint    │────▶│ GenerationService │
│             │     │  /api/generations │     │                   │
└─────────────┘     └──────────────────┘     └───────────────────┘
                              │                        │
                              ▼                        ▼
                    ┌──────────────────┐     ┌───────────────────┐
                    │  Zod Validation  │     │ MockAIService     │
                    └──────────────────┘     │ (zamiast OpenRouter)│
                                             └───────────────────┘
                                                       │
                              ┌─────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Database (RLS OFF)                   │
├─────────────────────────────────────────────────────────────────┤
│   generation_sessions (hardcoded user_id)                        │
└─────────────────────────────────────────────────────────────────┘
```

**Kroki przepływu (MVP):**

1. Klient wysyła POST z `source_text`
2. Endpoint waliduje body za pomocą Zod schema
3. `GenerationService.generateFlashcards()` jest wywoływany z zahardcodowanym `user_id`
4. `MockAIService.generateFlashcardProposals()` zwraca predefiniowane propozycje
5. Zapis do `generation_sessions` z zahardcodowanym `user_id`
6. Zwrot 201 z propozycjami fiszek

## 7. Względy bezpieczeństwa

### Walidacja danych wejściowych

- Zod schema z restrykcyjną walidacją długości tekstu
- Limit 10000 znaków zapobiega atakom DoS przez duże payloady

### Uproszczenia MVP (do uzupełnienia później)

| Aspekt                | Status MVP                      | Docelowa implementacja           |
|-----------------------|---------------------------------|----------------------------------|
| Uwierzytelnianie      | ❌ Pominięte (hardcoded user_id) | Token Bearer + Supabase Auth     |
| Autoryzacja (RLS)     | ❌ Wyłączona                     | RLS na poziomie Supabase         |
| Ochrona Prompt Inject | ❌ Nie dotyczy (mock)            | Sanityzacja + structured prompts |
| Bezpieczeństwo kluczy | ❌ Nie dotyczy (mock)            | Klucz OpenRouter w env vars      |
| Rate limiting         | ❌ Brak                          | Rate limit per user              |

## 8. Obsługa błędów

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

> **Uwaga MVP**: Obsługa błędów autoryzacji (401) i błędów serwisu AI (500, 503) zostanie dodana
> w kolejnych etapach implementacji.

## 9. Rozważania dotyczące wydajności

### MVP

- MockAIService zwraca odpowiedź natychmiastowo
- Brak opóźnień związanych z zewnętrznym API
- Idealne dla szybkiego prototypowania UI

### Docelowa implementacja (do uwzględnienia później)

- Wywołanie OpenRouter może trwać 5-30 sekund
- Rozważyć implementację streamingu
- Timeout na poziomie 60 sekund dla wywołań AI

## 10. Etapy wdrożenia

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

### Etap 2: Implementacja MockAIService

2. Utworzenie `src/lib/services/ai.service.ts`
   ```typescript
   // Interfejs dla serwisu AI (umożliwia łatwą zamianę mocka na rzeczywisty serwis)
   export interface AIService {
     generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]>;
   }

   // Mockowa implementacja
   export class MockAIService implements AIService {
     async generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]> {
       // Generuje 3-5 przykładowych fiszek bazując na długości tekstu
       // Symuluje opóźnienie 500-1000ms dla realizmu
     }
   }
   ```

### Etap 3: Implementacja GenerationService

3. Utworzenie `src/lib/services/generation.service.ts`
    - Metoda `generateFlashcards(sourceText: string): Promise<GenerationResponseDTO>`
    - Zahardcodowany `user_id`: `484dc1d3-add5-4701-a9a5-d91b12fb6165`
    - Integracja z MockAIService
    - Zapis do `generation_sessions`

### Etap 4: Implementacja endpointu

4. Utworzenie `src/pages/api/generations/index.ts`
   ```typescript
   export const prerender = false;

   // Hardcoded user ID for MVP
   const HARDCODED_USER_ID = "484dc1d3-add5-4701-a9a5-d91b12fb6165";

   export const POST: APIRoute = async ({ request }) => {
     // 1. Parsowanie i walidacja body (Zod)
     // 2. Wywołanie GenerationService z HARDCODED_USER_ID
     // 3. Zwrot odpowiedzi 201 z propozycjami
   };
   ```

### Etap 5: Weryfikacja i testy manualne

5. Testy manualne endpointu
    - Test walidacji (za krótki/długi tekst)
    - Test poprawnego flow z mockiem
    - Weryfikacja zapisu do bazy danych

## 11. Przyszłe etapy (poza zakresem MVP)

Poniższe elementy zostaną zaimplementowane w kolejnych iteracjach:

### Autentykacja i autoryzacja

- Implementacja middleware weryfikującego token Bearer
- Włączenie RLS na tabelach
- Pobieranie `user_id` z kontekstu sesji

### Integracja z OpenRouter

- Utworzenie `OpenRouterService` implementującego interfejs `AIService`
- Konfiguracja kluczy API i zmiennych środowiskowych
- Obsługa błędów i timeoutów
- Logowanie błędów do `generation_error_logs`

### Rozszerzona obsługa błędów

- Błędy 401 (UNAUTHORIZED)
- Błędy 500 (AI_SERVICE_ERROR)
- Błędy 503 (AI_SERVICE_UNAVAILABLE)