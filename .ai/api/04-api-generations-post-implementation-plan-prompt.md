Jesteś doświadczonym architektem oprogramowania, którego zadaniem jest stworzenie szczegółowego planu wdrożenia
endpointu REST API. Twój plan poprowadzi zespół programistów w skutecznym i poprawnym wdrożeniu tego endpointu.

Zanim zaczniemy, zapoznaj się z poniższymi informacjami:

1. Route API specification:
   <route_api_specification>
   Initiates an AI generation session. Sends source text to LLM and returns flashcard proposals.

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "source_text": "Long text content between 1000-10000 characters..."
}
```

**Validation:**

- `source_text`: required, 1000-10000 characters

**Response (201 Created):**

```json
{
  "generation_id": "uuid",
  "flashcards_proposals": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy"
    },
    {
      "front": "What are the reactants of photosynthesis?",
      "back": "Carbon dioxide, water, and light energy"
    }
  ],
  "generated_count": 5
}
```

**Error Responses:**

| Status | Code                   | Message                                               |
|--------|------------------------|-------------------------------------------------------|
| 400    | VALIDATION_ERROR       | Source text is required                               |
| 400    | VALIDATION_ERROR       | Source text must be between 1000 and 10000 characters |
| 401    | UNAUTHORIZED           | Not authenticated                                     |
| 500    | AI_SERVICE_ERROR       | Failed to generate flashcards                         |
| 503    | AI_SERVICE_UNAVAILABLE | AI service is temporarily unavailable                 |

**Notes:**

- On success, creates a `generation_sessions` record with `accepted_count = NULL`
- On failure, creates a `generation_error_logs` record
- The `flashcards_proposals` are NOT saved to database yet - they are returned for user review
  </route_api_specification>

2. Related database resources:
   <related_db_resources>

### 1. Table generation_sessions

Stores metadata for successful AI generation sessions.

| Column          | Type         | Constraints                                           |
|-----------------|--------------|-------------------------------------------------------|
| id              | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid()                |
| user_id         | UUID         | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| source_text     | TEXT         | NOT NULL, CHECK (char_length between 1000-10000)      |
| model_used      | VARCHAR(100) | NOT NULL                                              |
| generated_count | INTEGER      | NOT NULL, CHECK (>= 0)                                |
| accepted_count  | INTEGER      | CHECK (>= 0), can be NULL until session is finalized  |
| created_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                               |

```sql
CREATE TABLE generation_sessions
(
    id              UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    source_text     TEXT         NOT NULL,
    model_used      VARCHAR(100) NOT NULL,
    generated_count INTEGER      NOT NULL,
    accepted_count  INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT generation_sessions_source_text_length CHECK (char_length(source_text) >= 1000 AND char_length(source_text) <= 10000),
    CONSTRAINT generation_sessions_generated_count_positive CHECK (generated_count >= 0),
    CONSTRAINT generation_sessions_accepted_count_positive CHECK (accepted_count IS NULL OR accepted_count >= 0)
);
```

### 2. Table generation_error_logs

Stores logs for failed AI generation attempts.

| Column        | Type         | Constraints                                           |
|---------------|--------------|-------------------------------------------------------|
| id            | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid()                |
| user_id       | UUID         | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| source_text   | TEXT         | NOT NULL, CHECK (char_length between 1000-10000)      |
| error_code    | VARCHAR(50)  | NOT NULL                                              |
| error_message | TEXT         | NOT NULL                                              |
| model_used    | VARCHAR(100) | NOT NULL                                              |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                               |

```sql
CREATE TABLE generation_error_logs
(
    id            UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    source_text   TEXT         NOT NULL,
    error_code    VARCHAR(50)  NOT NULL,
    error_message TEXT         NOT NULL,
    model_used    VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT generation_error_logs_source_text_length CHECK (char_length(source_text) >= 1000 AND char_length(source_text) <= 10000)
);
```

### 3. Indexes

-- Composite index for fetching user's generation history ordered by date
CREATE INDEX idx_generation_sessions_user_id_created_at ON generation_sessions(user_id, created_at DESC);

-- Index for error logs lookup by user
CREATE INDEX idx_generation_error_logs_user_id ON generation_error_logs(user_id);

### 4. Design notes

**ENUM for flashcard source**: Using PostgreSQL ENUM type (`flashcard_source`) ensures data integrity and makes querying
by source efficient.

**VARCHAR for model_used**: Using VARCHAR(100) instead of ENUM allows flexibility when adding new AI models via
Openrouter without requiring database migrations.

</related_db_resources>

3. Definicje typów:
   <type_definitions>
   @src/types.ts
   </type_definitions>

3. Tech stack:
   <tech_stack>
   @.ai/tech-stack.md
   </tech_stack>

4. Implementation rules:
   <implementation_rules>
   @.claude/rules/backend.md
   @.claude/rules/astro.md
   </implementation_rules>

Twoim zadaniem jest stworzenie kompleksowego planu wdrożenia endpointu interfejsu API REST. Przed dostarczeniem
ostatecznego planu użyj znaczników <analysis>, aby przeanalizować informacje i nakreślić swoje podejście. W tej
analizie:

1. Podsumuj kluczowe punkty specyfikacji API.
2. Wymień wymagane i opcjonalne parametry ze specyfikacji API.
3. Wymień niezbędne typy DTO i Command Modele.
4. Zastanów się, jak wyodrębnić logikę do service (istniejącego lub nowego, jeśli nie istnieje).
5. Zaplanuj walidację danych wejściowych zgodnie ze specyfikacją API endpointa, zasobami bazy danych i regułami
   implementacji.
6. Określ sposób rejestrowania błędów w tabeli błędów (jeśli dotyczy).
7. Zidentyfikuj potencjalne zagrożenia bezpieczeństwa na podstawie specyfikację API i stacku technologicznego.
8. Nakreśl potencjalne scenariusze błędów i odpowiadające im kody stanu.

Po przeprowadzeniu analizy utwórz szczegółowy plan wdrożenia w formacie markdown. Plan powinien zawierać następujące
sekcje:

1. Przegląd endpointu
2. Szczegóły żądania (HTTP request)
3. Szczegóły odpowiedzi (HTTP response)
4. Przepływ danych
5. Względy bezpieczeństwa
6. Obsługa błędów
7. Wydajność
8. Kroki implementacji

W całym planie upewnij się, że

- Używa prawidłowych kodów stanu API:
    - 200 dla pomyślnego odczytu
    - 201 dla pomyślnego utworzenia
    - 400 dla nieprawidłowych danych wejściowych
    - 401 dla nieautoryzowanego dostępu
    - 404 dla nieznalezionych zasobów
    - 500 dla błędów po stronie serwera
- Dostosowano do dostarczonego stacku technologicznego
- Postępuje zgodnie z podanymi zasadami implementacji

Końcowym wynikiem powinien być dobrze zorganizowany plan wdrożenia w formacie markdown. Oto przykład tego, jak powinny
wyglądać dane wyjściowe:

```markdown

# API Endpoint Implementation Plan: [Nazwa endpointu]

## 1. Przegląd endpointu

[Krótki opis celu i funkcjonalności endpointu]

## 2. Szczegóły żądania

- Metoda HTTP: [GET/POST/PUT/DELETE]
- Struktura URL: [wzorzec URL]
- Parametry:
    - Wymagane: [Lista wymaganych parametrów]
    - Opcjonalne: [Lista opcjonalnych parametrów]
- Request Body: [Struktura treści żądania, jeśli dotyczy]

## 3. Wykorzystywane typy

[DTOs i Command Modele niezbędne do implementacji]

## 3. Szczegóły odpowiedzi

[Oczekiwana struktura odpowiedzi i kody statusu]

## 4. Przepływ danych

[Opis przepływu danych, w tym interakcji z zewnętrznymi usługami lub bazami danych]

## 5. Względy bezpieczeństwa

[Szczegóły uwierzytelniania, autoryzacji i walidacji danych]

## 6. Obsługa błędów

[Lista potencjalnych błędów i sposób ich obsługi]

## 7. Rozważania dotyczące wydajności

[Potencjalne wąskie gardła i strategie optymalizacji]

## 8. Etapy wdrożenia

1. [Krok 1]
2. [Krok 2]
3. [Krok 3]
   ...

```

Końcowy wynik powinien składać się wyłącznie z planu wdrożenia w formacie markdown i nie powinien powielać ani powtarzać
żadnej pracy wykonanej w sekcji analizy.

Pamiętaj, aby zapisać swój plan wdrożenia w .ai/api/05-endpoint-implementation-plan.md. Upewnij się, że plan jest
szczegółowy, przejrzysty i zapewnia kompleksowe wskazówki dla zespołu programistów.