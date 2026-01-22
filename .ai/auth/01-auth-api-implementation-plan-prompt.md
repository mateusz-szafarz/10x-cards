Wciel się w rolę doświadczonego developera fullstack ze specjalizacją w Astro oraz Supabase. Twoim zadaniem jest
przygotowanie profesjonalnego planu
implementacji autentykacji w API. Dostępne informacje:

- PRD projektu: @.ai/prd.md
- tech stack: @.ai/tech-stack.md
- high level plan dla całego API (nie tylko auth): @.ai/api/02-high-level-api-plan.md
- referencyjny projekt w którym już takie API zostało zaimplementowane: @/home/mateusz/projects/plg/ai-rules-builder/ -
  ogólnie możemy traktować ten
  referencyjny projekt jako źródło best practises, ale w projekcie nad którym pracujemy będziemy robić prostszą
  implementację, np nie będziemy używać
  captchy, a "email confiramtion" będzie wyłączone

Upewnij się, że plan zawiera kompletną (działającą) autentykacji API. Zakres powinien obejmować m.in. wszystkie
endpointy z sekcji "2.1
Authentication" z @/home/mateusz/projects/plg/10x-cards/.ai/api/02-high-level-api-plan.md oraz przejście z użycia
zahardcodowanego user id w
istniejącym endpoincie @/home/mateusz/projects/plg/10x-cards/src/pages/api/generations/index.ts na użycie aktywnej
sesji.

Wyegenrowany plan zapisz w formacie markdown w istniejącym pliku
@/home/mateusz/projects/plg/10x-cards/.ai/auth/01-auth-api-implementation-plan.md
(obecnie jest pusty).

  ---
Ważne: zanim przystąpisz do generowania planu przeanalizuj wszystkie dostępne dane i wypisz w formie wypunktowanej listy
gdy coś będzie niejasne lub
sprzeczne lub gdy ważnych informacji będzie brakowało. W liście zawrzyj swoją rekomendację dootyczącą danego aspektu.