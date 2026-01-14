<decisions>

1. Nawigacja główna: Top navigation z komponentem NavigationMenu z Shadcn
2. Flow generowania fiszek: Single-page flow z progresywnie ujawnianymi sekcjami (textarea → propozycje → zapis)
3. Prezentacja propozycji AI: Jeden Card na fiszkę z front/back jako oddzielnymi sekcjami (niezależna edycja), wspólne
   przyciski Akceptuj/Odrzuć
4. Obsługa loading/error: Per-komponent z ustandaryzowanymi komponentami (Skeleton, Alert)
5. Data fetching: Zwykły fetch + useState + useEffect (bez TanStack Query)
6. Lista "Moje fiszki": Paginacja z komponentem Pagination
7. Wyszukiwanie w "Moje fiszki": Pole Input z debounce (300ms), bez filtrowania po źródle
8. Edycja propozycji AI: Inline editing bezpośrednio na karcie
9. Edycja istniejących fiszek: Modal Dialog z formularzem
10. Widok "Sesja nauki": Pominięty w MVP (niedostępny)
11. Zarządzanie stanem formularzy: Natywny useState (bez React Hook Form)
12. Zarządzanie stanem globalnym: useState + props drilling (bez Zustand, dodany w razie potrzeby)
13. Responsywność: Desktop-first z mobile breakpoints
14. Ochrona tras: Astro middleware sprawdzający sesję Supabase
15. Empty states: Komponent Empty z Shadcn
16. Toast notifications: Komponent Sonner z Shadcn
17. Potwierdzenie usunięcia: AlertDialog tylko dla usunięcia z "Moje fiszki" (nie dla odrzucenia propozycji)
18. Walidacja formularzy auth: Hybrydowa (on-blur + on-submit)
19. Walidacja pól fiszki: Prosta client-side z useState
20. Obsługa timeout: fetchWithTimeout z AbortController
21. Layouty Astro: BaseLayout.astro + AppLayout.astro
22. Active state nawigacji: Podkreślenie aktywnego linku na podstawie Astro.url.pathname
23. Formularz logowania: Gotowy blok login-01 z Shadcn
24. Mikro-interakcje: Wbudowane w Shadcn (bez własnych animacji)
25. NavigationMenu ma się zwijać do hamburger menu na mobile
26. Zachowanie strony głównej - redirect do /flashcards (zalogowany) lub /login (niezalogowany).
27. Brak dedykowanej strony profilu użytkownika w MVP - tylko dropdown z wylogowaniem.

</decisions>

<matched_recommendations>

1. Top navigation dla płaskiej struktury: NavigationMenu lepszy niż Sidebar dla 3-4 głównych sekcji na tym samym
   poziomie hierarchii
2. Single-page flow z progressive disclosure: Prostsze niż wizard dla krótkiego procesu, użytkownik widzi kontekst
3. Cards dla obiektów (fiszek): Lepiej wizualizują "fiszkowy" charakter danych niż tabela
4. Paginacja zamiast infinite scroll: Prostsza implementacja, lepsza kontrola dla użytkownika przy "zarządzaniu" danymi
5. Inline editing dla propozycji AI: Szybsza edycja wielu elementów w porównaniu do modali
6. Modal dla edycji istniejących fiszek: Skupia uwagę na formalnej edycji pojedynczego elementu
7. Desktop-first: Generowanie fiszek (długi tekst) wygodniejsze na desktopie
8. Astro middleware dla auth: Centralne miejsce autoryzacji, analogiczne do Spring Security Filter Chain
9. Feature-based struktura plików: Skaluje się lepiej niż type-based, powiązane pliki są blisko siebie
10. Debounce dla wyszukiwania: Redukuje liczbę requestów, lepszy UX
11. On-blur walidacja: Kompromis między real-time (irytujące) a on-submit (późny feedback)
12. fetchWithTimeout z AbortController: Zapobiega "wiszącym" requestom przy problemach sieciowych

</matched_recommendations>

<conversation_summary>

# Główne wymagania dotyczące architektury UI

## Stack technologiczny

- Framework: Astro 5 (strony statyczne + routing) + React 19 (komponenty interaktywne)
- Styling: Tailwind CSS 4
- Komponenty UI: Shadcn/ui (wariant "new-york", kolor bazowy "neutral")
- Powiadomienia: Sonner (toast notifications)

## Zasady architektoniczne

- Prostota ponad elastyczność - natywne mechanizmy React (useState, useEffect, fetch) zamiast zewnętrznych bibliotek
- Desktop-first responsive design
- Per-komponent obsługa stanów (loading, error, empty) z reużywalnymi komponentami
- Feature-based organizacja kodu

# Kluczowe widoki, ekrany i przepływy użytkownika

## Struktura nawigacji

[Logo] [Generowanie] [Moje fiszki] .............. [Profil ▼]

- Top navigation z NavigationMenu
- Active state (podkreślenie) dla aktualnej strony
- Dropdown dla profilu użytkownika (wylogowanie)

## Widoki aplikacji

1. Strona logowania (/login)

- Gotowy blok login-01 z Shadcn
- Walidacja on-blur + on-submit
- Email: format email
- Hasło: minimum 8 znaków
- Layout: BaseLayout (bez nawigacji)

2. Strona rejestracji (/register)

- Analogicznie do logowania
- Te same zasady walidacji

3. Widok generowania fiszek (/generate)

- Single-page flow:
  ┌─────────────────────────────────────────────┐
  │ [Textarea - wklej tekst źródłowy]           │
  │ │
  │ [Generuj fiszki]                            │
  └─────────────────────────────────────────────┘
  ↓ (po wygenerowaniu)
  ┌─────────────────────────────────────────────┐
  │ Propozycje fiszek (X)                       │
  │ ┌─────────────────────────────────────────┐ │
  │ │ Front: "..."              [Edytuj ✏️]   │ │
  │ ├─────────────────────────────────────────┤ │
  │ │ Back: "..."               [Edytuj ✏️]   │ │
  │ ├─────────────────────────────────────────┤ │
  │ │ [✓ Akceptuj]         [✗ Odrzuć]         │ │
  │ └─────────────────────────────────────────┘ │
  │ ... (więcej kart)                           │
  │ │
  │ [Zapisz zaakceptowane (Y)]                  │
  └─────────────────────────────────────────────┘
- Przycisk "Generuj" w stanie loading podczas generowania (spinner + disabled)
- Inline editing dla front/back (kliknięcie "Edytuj" zamienia tekst na input)
- Toast po zapisaniu: "Zapisano X fiszek"

4. Widok "Moje fiszki" (/flashcards)

- Nagłówek:
  Moje fiszki                    [+ Nowa fiszka]
  [🔍 Szukaj...                              ]
- Lista kart z paginacją:
  ┌─────────────────────────────────────────────┐
  │ Front: "Co to jest closure?"                │
  │ Back: "Funkcja wraz z..."                   │
  │ Źródło: AI | Utworzono: 2024-01-15 │
  │ [Edytuj]                        [Usuń 🗑️]  │
  └─────────────────────────────────────────────┘
- Paginacja: [< Poprzednia] [1] [2] [3] [Następna >]
- Empty state: Komponent Empty z CTA "Wygeneruj pierwsze fiszki"
- Edycja: Modal Dialog z formularzem
- Usunięcie: AlertDialog z potwierdzeniem

5. Widok sesji nauki

- Pominięty w MVP - strona z komunikatem "Wkrótce dostępne" lub ukryty w nawigacji

## Przepływy użytkownika

Flow 1: Generowanie fiszek
[Wklej tekst] → [Klik "Generuj"] → [Loading...] → [Przegląd propozycji]
→ [Akceptuj/Odrzuć/Edytuj] → [Klik "Zapisz"] → [Toast "Zapisano"] → [Redirect do "Moje fiszki"]

Flow 2: Zarządzanie fiszkami
[Lista fiszek] → [Szukaj/Paginacja] → [Klik "Edytuj"] → [Modal z formularzem]
→ [Zapisz] → [Toast "Zaktualizowano"] → [Odświeżenie listy]

Flow 3: Ręczne tworzenie fiszki
[Klik "+ Nowa fiszka"] → [Modal z pustym formularzem] → [Wypełnij front/back]
→ [Zapisz] → [Toast "Utworzono"] → [Odświeżenie listy]

# Strategia integracji z API i zarządzania stanem

## Data fetching

```tsx
// Wzorzec dla każdego komponentu pobierającego dane
const [data, setData] = useState<T | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithTimeout('/api/endpoint', {}, 10000)
      if (!response.ok) throw new Error('Błąd serwera')
      setData(await response.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
  fetchData()
}, [dependencies])
```

## Timeout wrapper

```ts
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout = 10000
): Promise<Response> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }

}
```

## Timeouty per endpoint

┌─────────────────────────────────┬─────────────────────┐
│ Endpoint │ Timeout │
├─────────────────────────────────┼─────────────────────┤
│ POST /api/generations │ 60s (AI generation) │
├─────────────────────────────────┼─────────────────────┤
│ GET /api/flashcards │ 10s │
├─────────────────────────────────┼─────────────────────┤
│ POST/PUT/DELETE /api/flashcards │ 10s │
├─────────────────────────────────┼─────────────────────┤
│ POST /api/auth/*                │ 10s │
└─────────────────────────────────┴─────────────────────┘

## Zarządzanie stanem

- Stan lokalny komponentu: useState dla formularzy, list, loading states
- Props drilling: przekazywanie danych między komponentami parent-child
- Brak globalnego state managera: Zustand dodany tylko jeśli props drilling stanie się problematyczne (4+ poziomy)

## Integracja z API endpoints

┌─────────────┬──────────────────────┬────────┬───────────────────────────────────┐
│ Widok │ Endpoint │ Metoda │ Opis │
├─────────────┼──────────────────────┼────────┼───────────────────────────────────┤
│ Generowanie │ /api/generations │ POST │ Generowanie propozycji z tekstu │
├─────────────┼──────────────────────┼────────┼───────────────────────────────────┤
│ Moje fiszki │ /api/flashcards │ GET │ Lista z paginacją i wyszukiwaniem │
├─────────────┼──────────────────────┼────────┼───────────────────────────────────┤
│ Moje fiszki │ /api/flashcards │ POST │ Tworzenie nowej fiszki │
├─────────────┼──────────────────────┼────────┼───────────────────────────────────┤
│ Moje fiszki │ /api/flashcards/{id} │ GET │ Szczegóły fiszki (dla edycji)     │
├─────────────┼──────────────────────┼────────┼───────────────────────────────────┤
│ Moje fiszki │ /api/flashcards/{id} │ PUT │ Aktualizacja fiszki │
├─────────────┼──────────────────────┼────────┼───────────────────────────────────┤
│ Moje fiszki │ /api/flashcards/{id} │ DELETE │ Usunięcie fiszki │
└─────────────┴──────────────────────┴────────┴───────────────────────────────────┘

# Responsywność, dostępność i bezpieczeństwo

## Responsywność (Desktop-first)

Desktop (default): pełny layout, karty w grid 2-3 kolumny
Tablet (md:):      karty w 2 kolumny, nawigacja bez zmian
Mobile (sm:):      karty w 1 kolumnę, hamburger menu (opcjonalnie)

- Tailwind breakpoints: sm: (640px), md: (768px), lg: (1024px)
- Textarea na generowanie: w-full na wszystkich breakpointach
- Karty fiszek: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Dostępność (a11y)

- Shadcn komponenty są zgodne z ARIA standards (wbudowane)
- AlertDialog ma semantykę dla destrukcyjnych akcji
- Focus management w modalach (automatyczne przez Shadcn)
- Keyboard navigation dla nawigacji i formularzy
- Odpowiednie aria-label dla przycisków z ikonami

## Bezpieczeństwo

### Astro middleware dla ochrony tras

```ts
// src/middleware/index.ts
const protectedPaths = ['/generate', '/flashcards', '/profile']
const authPaths = ['/login', '/register']

export const onRequest = async (context, next) => {
  const session = await getSession(context)
  const path = context.url.pathname

  if (protectedPaths.some(p => path.startsWith(p)) && !session) {
    return context.redirect('/login')
  }

  if (authPaths.includes(path) && session) {
    return context.redirect('/flashcards')
  }

  return next()

}
```

### Walidacja:

- Client-side: szybki feedback dla UX
- Server-side (API): źródło prawdy, zwraca 400 dla nieprawidłowych danych
- Sanityzacja inputów przez API przed zapisem do bazy

# Struktura plików i komponenty

## Layouty Astro

src/layouts/
├── BaseLayout.astro # HTML wrapper, meta tagi, Sonner provider
└── AppLayout.astro # BaseLayout + Navbar + main + Footer

## Struktura komponentów React

src/components/
├── ui/ # Shadcn (nie modyfikować)
│ ├── button.tsx
│ ├── card.tsx
│ ├── dialog.tsx
│ ├── empty.tsx
│ ├── input.tsx
│ ├── navigation-menu.tsx
│ ├── pagination.tsx
│ ├── skeleton.tsx
│ ├── alert.tsx
│ ├── alert-dialog.tsx
│ └── sonner.tsx
│
├── layout/
│ ├── Navbar.tsx # Top navigation
│ ├── NavLink.tsx # Link z active state
│ └── Footer.tsx # Stopka (opcjonalna)
│
├── flashcards/
│ ├── FlashcardCard.tsx # Karta istniejącej fiszki
│ ├── FlashcardList.tsx # Lista + paginacja + wyszukiwanie
│ ├── FlashcardEditDialog.tsx # Modal edycji/tworzenia
│ └── FlashcardEmpty.tsx # Empty state dla listy
│
├── generation/
│ ├── GenerationForm.tsx # Textarea + przycisk generuj
│ ├── ProposalCard.tsx # Karta propozycji AI (inline edit)
│ ├── ProposalList.tsx # Lista propozycji + przycisk zapisz
│ └── GenerationEmpty.tsx # Stan gdy brak propozycji
│
└── common/
├── LoadingSpinner.tsx # Reużywalny spinner
└── ErrorAlert.tsx # Reużywalny alert błędu z retry

## Strony Astro

src/pages/
├── index.astro # Redirect do /flashcards lub /login
├── login.astro # Strona logowania
├── register.astro # Strona rejestracji
├── generate.astro # Widok generowania
├── flashcards/
│ └── index.astro # Lista "Moje fiszki"
└── api/ # API endpoints (istniejące)

## Komponenty Shadcn do zainstalowania

npx shadcn@latest add navigation-menu card button input textarea \
dialog alert-dialog pagination skeleton alert empty sonner

</conversation_summary>

<unresolved_issues>

1. Blok login-01 customizacja: Nie sprawdzono dokładnie jak wygląda blok login-01 - może wymagać dostosowania do
   polskich tekstów i stylu aplikacji.
2. Skeleton loading: Nie ustalono dokładnego wyglądu skeleton loaders dla listy fiszek - ile "placeholder" kart pokazać
   podczas ładowania.

<unresolved_issues>
