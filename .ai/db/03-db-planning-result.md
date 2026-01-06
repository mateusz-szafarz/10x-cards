# Decisions

  1. Struktura fiszek: Płaska lista fiszek przypisana bezpośrednio do użytkownika (bez zestawów/kolekcji)
  2. Źródło fiszki: Kolumna source typu ENUM z wartościami 'ai_generated' i 'manual'
  3. Spaced repetition: Struktura dla algorytmu powtórek NIE jest częścią MVP - zostanie dodana w przyszłości
  4. Tekst źródłowy: Przechowywany w bazie danych w tabeli generation_sessions
  5. Strategia usuwania: Twarde usuwanie (hard delete) dla wszystkich tabel, w tym generation_sessions i generation_error_logs
  6. Indeksy: flashcards(user_id) oraz generation_sessions(user_id, created_at)
  7. Ograniczenia długości: Egzekwowane na poziomie bazy danych (CHECK constraints)
  8. Row Level Security: Pełna izolacja danych użytkowników poprzez polityki RLS z auth.uid()
  9. Klucze główne: UUID z gen_random_uuid() dla wszystkich tabel
  10. Śledzenie błędów: Dodatkowa tabela generation_error_logs dla nieudanych generowań
  11. Typ kolumny model_used: VARCHAR(100) zamiast ENUM (elastyczność dla modeli Openrouter)
  12. Audyt zmian: Kolumny created_at i updated_at z triggerem moddatetime
  13. Propozycje AI: Przechowywane w stanie React, NIE w bazie danych przed zatwierdzeniem
  14. Odpowiedzi API: Tylko przetworzone dane (counts), bez surowych odpowiedzi JSON
  15. Nullable generation_id: Dozwolony NULL bez dodatkowego CHECK constraint łączącego z source
  16. Kaskadowe usuwanie sesji: ON DELETE SET NULL dla generation_id w flashcards
  17. Walidacja source_text: CHECK constraint (1000-10000 znaków) zarówno dla generation_sessions jak i generation_error_logs
  18. Dane użytkownika: Wyłącznie auth.users z Supabase, bez dodatkowej tabeli profilowej

# Matched Recommendations

  1. Płaska struktura fiszek - bezpośrednie powiązanie flashcards.user_id z użytkownikiem bez warstwy kolekcji
  2. ENUM flashcard_source - typ flashcard_source z dwoma wartościami dla oznaczenia pochodzenia
  3. Tabela generation_sessions - przechowuje source_text, model_used, generated_count, accepted_count, created_at
  4. Tabela generation_error_logs - przechowuje source_text, error_code, error_message, model_used, created_at
  5. UUID jako PK - standard Supabase, bezpieczny i skalowalny
  6. Hard delete z kaskadą - przy usunięciu użytkownika usuwane są wszystkie powiązane dane (RODO compliance)
  7. RLS policies - WHERE user_id = auth.uid() dla SELECT/INSERT/UPDATE/DELETE na wszystkich tabelach z danymi użytkownika
  8. Indeksy kompozytowe - optymalizacja dla najczęstszych zapytań (lista fiszek, historia generowań)
  9. Trigger moddatetime - automatyczna aktualizacja updated_at przy modyfikacji rekordów
  10. ON DELETE SET NULL - zachowanie fiszek po usunięciu sesji generowania, utrata tylko metadanych

# Database Planning Summary

##  Główne wymagania schematu

  Schemat bazy danych dla MVP aplikacji 10x-cards opiera się na trzech głównych tabelach obsługujących funkcjonalność generowania fiszek przez AI oraz ręcznego tworzenia:

  | Tabela                | Cel                                                     |
  |-----------------------|---------------------------------------------------------|
  | flashcards            | Przechowywanie fiszek użytkowników (przód, tył, źródło) |
  | generation_sessions   | Metadane udanych sesji generowania AI                   |
  | generation_error_logs | Logi nieudanych prób generowania                        |

## Kluczowe encje i relacje

  auth.users (Supabase Auth)
      │
      ├── 1:N ── flashcards
      │              └── N:1 ── generation_sessions (nullable, ON DELETE SET NULL)
      │
      ├── 1:N ── generation_sessions
      │
      └── 1:N ── generation_error_logs

  Relacje:
  - Użytkownik → wiele fiszek (1:N, CASCADE DELETE)
  - Użytkownik → wiele sesji generowania (1:N, CASCADE DELETE)
  - Użytkownik → wiele logów błędów (1:N, CASCADE DELETE)
  - Sesja generowania → wiele fiszek (1:N, SET NULL on delete)

##  Kwestie bezpieczeństwa

  - Row Level Security (RLS) na wszystkich tabelach z danymi użytkownika
  - Izolacja danych - użytkownik widzi tylko własne zasoby
  - RODO compliance - twarde usuwanie umożliwia pełne usunięcie danych na żądanie
  - Nieprzewidywalne UUID - bezpieczniejsze niż sekwencyjne ID

##  Kwestie skalowalności

  - Indeksy na user_id i kompozytowe (user_id, created_at) dla wydajnych zapytań
  - UUID eliminuje problemy z sekwencjami przy skalowaniu horyzontalnym
  - VARCHAR dla model_used - elastyczność bez migracji przy zmianach modeli AI
  - Brak przechowywania surowych odpowiedzi API - oszczędność storage

# Struktura tabel (szczegóły)

  flashcards:
  - id UUID PK
  - user_id UUID FK → auth.users (NOT NULL)
  - generation_id UUID FK → generation_sessions (NULLABLE)
  - front VARCHAR z CHECK (max 500 znaków)
  - back VARCHAR z CHECK (max 2000 znaków)
  - source ENUM flashcard_source ('ai_generated', 'manual')
  - created_at TIMESTAMPTZ
  - updated_at TIMESTAMPTZ (trigger moddatetime)

  generation_sessions:
  - id UUID PK
  - user_id UUID FK → auth.users (NOT NULL)
  - source_text TEXT z CHECK (1000-10000 znaków)
  - model_used VARCHAR(100)
  - generated_count INTEGER
  - accepted_count INTEGER
  - created_at TIMESTAMPTZ

  generation_error_logs:
  - id UUID PK
  - user_id UUID FK → auth.users (NOT NULL)
  - source_text TEXT z CHECK (1000-10000 znaków)
  - error_code VARCHAR(50)
  - error_message TEXT
  - model_used VARCHAR(100)
  - created_at TIMESTAMPTZ
