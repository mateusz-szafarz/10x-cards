Jesteś wykwalifikowanym architektem frontend, którego zadaniem jest stworzenie kompleksowej architektury interfejsu
użytkownika na podstawie dokumentu wymagań produktu (PRD), planu API i notatek z sesji planowania architektury UI. Twoim
celem jest
zaprojektowanie struktury interfejsu użytkownika, która skutecznie spełnia wymagania produktu, jest zgodna z
możliwościami API i uwzględnia spostrzeżenia z sesji planowania.

Najpierw dokładnie przejrzyj następujące dokumenty:

Dokument wymagań produktu (PRD):
<prd>
@.ai/prd.md
</prd>

Plan API:
<api_plan>
@.ai/api/02-api-plan.md
</api_plan>

Session Notes:
<session_notes>
@.ai/ui/03-ui-planning-session-summary.md
</session_notes>

Twoim zadaniem jest zaprojektowanie szczegółowej architektury interfejsu użytkownika, która obejmuje niezbędne widoki,
mapowanie podróży użytkownika, strukturę nawigacji i kluczowe elementy dla każdego widoku. Projekt powinien uwzględniać
takie obszary jak:

- user experience (UX),
- accessibility,
- security.

Wykonaj następujące kroki, aby jak najlepiej przygotować się do wygenerowania kompletnego planu implementacji UI:

1. Dokładnie przeanalizuj PRD, plan API i notatki z sesji planowania.
2. Wyodrębnij i wypisz kluczowe wymagania z PRD.
3. Zidentyfikuj i wymień główne punkty końcowe API i ich cele.
4. Utworz listę wszystkich niezbędnych widoków na podstawie PRD, planu API i notatek z sesji.
5. Określ główne cele i kluczowe informacje dla każdego widoku.
6. Zaplanuj podróż użytkownika między widokami, w tym podział krok po kroku dla głównego przypadku użycia.
7. Zaprojektuj strukturę nawigacji.
8. Zaproponuj kluczowe elementy interfejsu użytkownika dla każdego widoku, biorąc pod uwagę UX, dostępność i
   bezpieczeństwo.
9. Rozważ potencjalne przypadki brzegowe oraz obsługę stanów wyjątkowych (obsługa błędów i ładowania).
10. Upewnij się, że architektura interfejsu użytkownika jest zgodna z planem API.
11. Przeanalizuj i zmapuj wszystkie historyjki użytkownika z PRD do architektury interfejsu użytkownika.
12. Dokonaj wyraźnego mapowania wymagań na elementy interfejsu użytkownika.
13. Rozważ potencjalne "punkty bólu" użytkownika oraz sposób, w jaki interfejs użytkownika je rozwiązuje.

Dla każdego głównego kroku pracuj wewnątrz tagów <ui_architecture_planning> w bloku myślenia, aby rozbić proces myślowy
przed przejściem do następnego kroku. Ta sekcja może być dość długa, ale to dobrze. Wnikliwa analiza jest kluczowa do
stworzenia solidnej architektury interfejsu użytkownika.

Przedstaw ostateczną architekturę interfejsu użytkownika w następującym formacie Markdown:

```markdown
# Architektura UI dla aplikacji 10x-cards

## 1. Przegląd struktury UI

[Przedstaw ogólny przegląd struktury UI]

## 2. Lista widoków

Dla każdego widoku podaj:

- Nazwę widoku
- Ścieżkę widoku
- Główny cel
- Kluczowe informacje do wyświetlenia
- Kluczowe komponenty widoku
- UX, dostępność i względy bezpieczeństwa

## 3. Mapa podróży użytkownika

[Opisz/zobrazuj przepływ między widokami i kluczowymi interakcjami użytkownika]

## 4. Układ i struktura nawigacji

[Wyjaśnij, w jaki sposób użytkownicy będą poruszać się między widokami]

## 5. Kluczowe komponenty

[Wymień i krótko opisz kluczowe komponenty, które będą używane w poszczególnych widokach].
```

Skup się przede wszystkim na architekturze interfejsu użytkownika, podróży użytkownika, nawigacji i kluczowych
elementach dla
każdego widoku. Postaraj się nie pominąć żadnej z informacji zawartych w podsumowania sesji planowania UI.

Końcowy rezultat powinien składać się wyłącznie z architektury UI w formacie Markdown w języku polskim, którą zapiszesz
w pliku .ai/ui/05-ui-plan.md. Nie powielaj ani nie powtarzaj żadnej pracy wykonanej w bloku myślenia. W celu czytelnego
zobrazowania i udokumentowania zaproponowanej architektury UI możesz użyć diagramów ASCII oraz Mermaid.