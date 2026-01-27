Wciel się w rolę doświadczonego programisty frontendu. Twoim zadaniem jest stworzenie szczegółowego planu wdrożenia nowego widoku do generowania flash cards z użyciem AI przez zalogowanego użytkownika aplikacji 10x-cards. Plan ten powinien być kompleksowy i wystarczająco jasny dla innego programisty frontendowego, aby mógł poprawnie i wydajnie wdrożyć nowe widoki. Implementowany widok:
- "Generate Flashcards" (/generate)

**Ważne:**
- Plan implementacji oraz cały interfejs użytkownika mają być w języku angielskim.
- Plan ma się skupić na samej implementacji UI (z uwzględnieniem aspektu testowalności kodu, ale bez implementacji testów na tym etapie).
- Prompt zawiera referencję do high level planu UI, w którym znajduje się wiele cennych informacji. Bardzo ważne jest, aby generowany plan implementacji zawierał WSZYSTKIE informacje, które są istotne z perspektywy implementowanego widoku.

Najpierw przejrzyj następujące informacje:

1. Product Requirements Document (PRD): @.ai/prd.md

2. High level UI plan (for the whole app - required to understand how new view fit in): @.ai/ui/05-ui-high-level-plan.md

3. Potentially useful API Endpoints Implementation:
- @src/pages/api/generations/index.ts
- @src/pages/api/generations/[id]/accept.ts

4. Type Definitions: @src/types.ts

5. Tech Stack: @.ai/tech-stack.md
 
6. Related project rules:
- @.claude/rules/frontend.md
- @.claude/rules/astro.md
- @.claude/rules/react.md
- @.claude/on-demand-rules/ui-shadcn-helper.md

Przed utworzeniem ostatecznego planu wdrożenia przeprowadź analizę i planowanie wewnątrz tagów <implementation_breakdown> w swoim bloku myślenia. Ta sekcja może być długa, ponieważ obejmuje szczegółowe przeanalizowanie wszystkich aspektów implementacji widoku.

W swojej analizie wykonaj następujące kroki:
0. Dla każdej sekcji wejściowej (punkty 1-6 powyżej):
- Podsumuj kluczowe punkty
- Wymień wszelkie wymagania lub ograniczenia
- Zwróć uwagę na wszelkie potencjalne wyzwania lub ważne kwestie
1. Przeanalizuj obecny codebase pod kątem:
- Przegląd struktury projektu w katalogu ./src
- Identyfikacja istniejących wzorców (komponenty, hooki, utilities)
- Analiza istniejących implementacji formularzy (jeśli istnieją) w celu zachowania spójności
2. Wyodrębnij i wypisz kluczowe wymagania z PRD (dotyczące implementowanego widoku).
3. Wymień wszystkie podstawowe komponenty, które będą potrzebne wraz z krótkim opisem ich przeznaczenia, typów, których będą wymagały, obsługiwanych zdarzeń i warunków walidacji.
4. Stwórz wysokopoziomowy diagram drzewa komponentów.
5. Zidentyfikuj wymagane DTO i niestandardowe typy ViewModel dla każdego komponentu widoku. Preferuj wykorzystanie istniejących typów. Szczegółowo wyjaśnij nowe typy, określając ich pola i powiązane typy.
6. Zidentyfikuj potencjalne zmienne stanu i niestandardowe hooki, wyjaśniając ich cel i sposób ich użycia.
7. Wymień wymagane wywołania API i odpowiadające im akcje frontendowe.
8. Zmapuj każdą powiązaną "user story" z PRD do konkretnych szczegółów implementacji, komponentów lub funkcji.
9. Wymień interakcje użytkownika i ich oczekiwane wyniki
10. Wymień warunki wymagane przez API i jak je weryfikować na poziomie komponentów.
11. Zidentyfikuj potencjalne scenariusze błędów i zasugeruj, jak sobie z nimi poradzić.
12. Wymień potencjalne wyzwania związane z wdrożeniem tego widoku i zasugeruj możliwe rozwiązania.

Po przeprowadzeniu analizy dostarcz plan wdrożenia w formacie Markdown z następującymi sekcjami:

1. Przegląd: Krótkie podsumowanie widoku i jego celu.
2. Routing widoku: Określenie ścieżki, na której widok powinien być dostępny.
3. Struktura komponentów: Zarys głównych komponentów i ich hierarchii.
4. Szczegóły komponentu: Dla każdego komponentu należy opisać:
- Opis komponentu, jego przeznaczenie i z czego się składa
- Główne elementy HTML i komponenty dzieci, które budują komponent
- Obsługiwane zdarzenia
- Warunki walidacji (szczegółowe warunki, zgodnie z API)
- Typy (DTO i ViewModel) wymagane przez komponent
- Propsy, które komponent przyjmuje od rodzica (interfejs komponentu)
5. Typy: Szczegółowy opis typów wymaganych do implementacji widoku, w tym dokładny podział wszelkich nowych typów lub modeli widoku według pól i typów.
6. Zarządzanie stanem: Szczegółowy opis sposobu zarządzania stanem w widoku, określenie, czy wymagany jest customowy hook.
7. Integracja API: Wyjaśnienie sposobu integracji z dostarczonym punktem końcowym. Precyzyjnie wskazuje typy żądania i odpowiedzi.
8. Interakcje użytkownika: Szczegółowy opis interakcji użytkownika i sposobu ich obsługi.
9. Warunki i walidacja: Opis warunków, które są weryfikowane przez interfejs, których komponentów dotyczą i jak wpływają one na stan interfejsu.
10. Obsługa błędów: Opis sposobu obsługi potencjalnych błędów lub przypadków brzegowych.
11. Kroki implementacji: Przewodnik krok po kroku dotyczący implementacji widoku.

Upewnij się, że Twój plan jest zgodny z PRD, historyjkami użytkownika i uwzględnia dostarczony stack technologiczny.

Wygenerowany plan zapisz w pliku /home/mateusz/projects/plg/10x-cards/.ai/ui/11-ui-generations-plan.md (plik aktualnie nie istnieje).

Oto przykład tego, jak powinien wyglądać plik wyjściowy (treść jest do zastąpienia):

```markdown
# Plan implementacji widoku [Nazwa widoku]

## 1. Przegląd
[Krótki opis widoku i jego celu]

## 2. Routing widoku
[Ścieżka, na której widok powinien być dostępny]

## 3. Struktura komponentów
[Zarys głównych komponentów i ich hierarchii]

## 4. Szczegóły komponentów
### [Nazwa komponentu 1]
- Opis komponentu [opis]
- Główne elementy: [opis]
- Obsługiwane interakcje: [lista]
- Obsługiwana walidacja: [lista, szczegółowa]
- Typy: [lista]
- Propsy: [lista]

### [Nazwa komponentu 2]
[...]

## 5. Typy
[Szczegółowy opis wymaganych typów]

## 6. Zarządzanie stanem
[Opis zarządzania stanem w widoku]

## 7. Integracja API
[Wyjaśnienie integracji z dostarczonym endpointem, wskazanie typów żądania i odpowiedzi]

## 8. Interakcje użytkownika
[Szczegółowy opis interakcji użytkownika]

## 9. Warunki i walidacja
[Szczegółowy opis warunków i ich walidacji]

## 10. Obsługa błędów
[Opis obsługi potencjalnych błędów]

## 11. Kroki implementacji
1. [Krok 1]
2. [Krok 2]
3. [...]
```