<db-plan>
@.ai/db/05-db-plan.md
</db-plan>

<prd>
@.ai/prd.md
</prd>

<tech-stack>
@.ai/tech-stack.md
</tech-stack>

Jesteś doświadczonym architektem API, którego zadaniem jest stworzenie kompleksowego planu API REST. Twój plan będzie
oparty na podanym schemacie bazy danych, dokumencie wymagań produktu (PRD) i stacku technologicznym podanym powyżej.
Uważnie przejrzyj dane wejściowe i wykonaj następujące kroki:

1. Przeanalizuj schemat bazy danych:
    - Zidentyfikuj główne encje (tabele)
    - Zanotuj relacje między jednostkami
    - Rozważ wszelkie indeksy, które mogą mieć wpływ na projekt API
    - Zwróć uwagę na warunki walidacji określone w schemacie.

2. Przeanalizuj PRD:
    - Zidentyfikuj kluczowe cechy i funkcjonalności
    - Zwróć uwagę na konkretne wymagania dotyczące operacji na danych (pobieranie, tworzenie, aktualizacja, usuwanie)
    - Zidentyfikuj wymagania logiki biznesowej, które wykraczają poza operacje CRUD

3. Rozważ stack technologiczny:
    - Upewnij się, że plan API jest zgodny z określonymi technologiami.
    - Rozważ, w jaki sposób te technologie mogą wpłynąć na projekt API

4. Tworzenie kompleksowego planu interfejsu API REST:
    - Zdefiniowanie głównych zasobów w oparciu o encje bazy danych i wymagania PRD
    - Zaprojektowanie endpointów CRUD dla każdego zasobu
    - Zaprojektowanie endpointów dla logiki biznesowej opisanej w PRD
    - Uwzględnienie paginacji, filtrowania i sortowania dla endpointów zwracających kolekcje.
    - Zaplanowanie odpowiedniego użycia metod HTTP
    - Zdefiniowanie struktur dla request i response
    - Uwzględnienie mechanizmów uwierzytelniania i autoryzacji, jeśli wspomniano o nich w PRD
    - Rozważenie ograniczenia szybkości i innych środków bezpieczeństwa

Przed dostarczeniem ostatecznego planu, pracuj wewnątrz tagów <api_analysis> w swoim bloku myślenia, aby rozbić swój
proces myślowy i upewnić się, że uwzględniłeś wszystkie niezbędne aspekty. W tej sekcji:

1. Wymień główne encje ze schematu bazy danych. Ponumeruj każdą encję i zacytuj odpowiednią część schematu.
2. Wymień kluczowe funkcje logiki biznesowej z PRD. Ponumeruj każdą funkcję i zacytuj odpowiednią część PRD.
3. Zmapuj funkcje określone w PRD z potencjalnymi endpointami API. Dla każdej funkcji rozważ co najmniej dwie możliwe
   formy endpointu, a następnie wyjaśnij, który z nich wybrałeś i dlaczego.
4. Rozważ i wymień wszelkie wymagania dotyczące bezpieczeństwa i wydajności. Dla każdego wymagania zacytuj fragment z
   dokumentów wejściowych, który je implikuje.
5. Wyraźnie mapuj logikę biznesową z PRD na endpointy API.
6. Uwzględnij warunki walidacji ze schematu bazy danych w planie API.

Ta sekcja myślenia może być dość długa.

Ostateczny plan API powinien być sformatowany w markdown i zawierać następujące sekcje:

```markdown
# REST API Plan

## 1. Zasoby

- Wymień każdy główny zasób i odpowiadającą mu tabelę bazy danych

## 2. Endpointy

Dla każdego endpointu podaj:

- Metoda HTTP
- Ścieżka URL
- Krótki opis
- Parametry zapytania (jeśli dotyczy)
- Struktura JSON requestu (jeśli dotyczy)
- Struktura JSON odpowiedzi (jeśli dotyczy)
- Kody i komunikaty sukcesu
- Kody i komunikaty błędów

## 3. Uwierzytelnianie i autoryzacja

- Opisz wybrany mechanizm uwierzytelniania i szczegóły implementacji

## 4. Walidacja i logika biznesowa

- Wypisz listę warunków walidacji dla każdego endpointu
- Opisz, w jaki sposób logika biznesowa jest zaimplementowana w API
```

Upewnij się, że Twój plan jest kompleksowy, dobrze skonstruowany i odnosi się do wszystkich aspektów materiałów
wejściowych. Jeśli jakieś informacje są niejasne/sprzeczne lub gdy jakaś kwestia wymaga doprecyzowania, to dopytaj
o nią użytkownika przed wygenerowaniem ostatecznego planu API. Możesz wykonywać kolejne iteracje w sekcji myślenia,
aż będziesz pewien, że wszystko zostało uwzględnione.

Końcowy wynik powinien składać się wyłącznie z planu API w formacie markdown w języku angielskim, który zapiszesz w
.ai/api/02-api-plan.md Rezultat nie powinien powielać ani powtarzać żadnej pracy wykonanej w bloku myślenia.