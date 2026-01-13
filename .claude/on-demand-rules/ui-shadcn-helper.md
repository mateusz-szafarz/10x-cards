# Shadcn UI Components

Ten projekt wykorzystuje @shadcn/ui dla komponentów interfejsu użytkownika. Są to pięknie zaprojektowane, dostępne komponenty, które można dostosować do swojej aplikacji.

## Odszukiwanie zainstalowanych komponentów

Komponenty są dostępne w folderze `src/components/ui`, zgodnie z aliasami z pliku `components.json`

## Wykorzystanie komponentu

Zaimportuj komponent zgodnie ze skonfigurowanym aliasem `@/`

```tsx
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
```

Przykładowe wykorzystanie komponentów:

```tsx
<Button variant="outline">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

## Serwer MCP Shadcn - Przeglądanie i zarządzanie komponentami

W tym projekcie dostępny jest serwer MCP (Model Context Protocol) dla shadcn, który umożliwia programowe przeglądanie i zarządzanie komponentami bez konieczności ręcznego odwiedzania dokumentacji.

### Dostępne narzędzia MCP

1. **`mcp__shadcn__get_project_registries`** - Lista skonfigurowanych rejestrów w projekcie
2. **`mcp__shadcn__list_items_in_registries`** - Lista wszystkich dostępnych komponentów
3. **`mcp__shadcn__search_items_in_registries`** - Wyszukiwanie komponentów (fuzzy matching)
4. **`mcp__shadcn__view_items_in_registries`** - Szczegóły komponentu (kod źródłowy, pliki)
5. **`mcp__shadcn__get_item_examples_from_registries`** - Przykłady użycia z pełnym kodem
6. **`mcp__shadcn__get_add_command_for_items`** - Komenda CLI do instalacji komponentu
7. **`mcp__shadcn__get_audit_checklist`** - Checklist po utworzeniu komponentów

### Przykłady użycia narzędzi MCP

**Wyszukiwanie komponentu:**
```typescript
// Znajdź komponenty związane z kartami
mcp__shadcn__search_items_in_registries({
  registries: ["@shadcn"],
  query: "card"
})
```

**Podgląd przykładów użycia:**
```typescript
// Znajdź przykłady użycia przycisku
mcp__shadcn__get_item_examples_from_registries({
  registries: ["@shadcn"],
  query: "button-demo"
})
// Zwraca pełny kod implementacji z dependencies
```

**Pobranie komendy instalacji:**
```typescript
// Otrzymaj komendę do instalacji wielu komponentów na raz
mcp__shadcn__get_add_command_for_items({
  items: ["@shadcn/button", "@shadcn/card", "@shadcn/dialog"]
})
```

## Instalowanie dodatkowych komponentów

Wiele innych komponentów jest dostępnych w rejestrze @shadcn. Pełną listę można znaleźć na stronie https://ui.shadcn.com/r lub za pomocą narzędzi MCP.

Aby zainstalować nowy komponent, wykorzystaj shadcn CLI:

```bash
npx shadcn@latest add [component-name]
```

Przykładowo, aby dodać komponent accordion:

```bash
npx shadcn@latest add accordion
```

**Instalacja wielu komponentów jednocześnie:**
```bash
npx shadcn@latest add button card dialog
```

Ważne: `npx shadcn-ui@latest` zostało wycofane, korzystaj z `npx shadcn@latest`

## Dostępne komponenty (438 items w @shadcn)

### Podstawowe komponenty UI (50+)

**Layout & Containers:**
- Card, Separator, AspectRatio, Resizable, ScrollArea

**Formularze:**
- Input, InputGroup, Textarea, Checkbox, RadioGroup, Select, NativeSelect
- Toggle, ToggleGroup, Switch, Slider, InputOTP
- Form (React Hook Form), Form (TanStack Form), Field, Label

**Przyciski & Akcje:**
- Button, ButtonGroup

**Wyświetlanie danych:**
- Badge, Alert, Avatar, Progress, Skeleton, Spinner, Table, Empty, Item

**Nawigacja:**
- Breadcrumb, Menubar, NavigationMenu, Pagination, Tabs, Sidebar

**Dialogi & Overlays:**
- Dialog, AlertDialog, Drawer, Sheet, Popover, HoverCard, Tooltip

**Menu:**
- DropdownMenu, ContextMenu, Command

**Inne:**
- Accordion, Collapsible, Carousel, Calendar, Chart, Kbd, Sonner (toast notifications)

### Pre-built Blocks - Gotowe sekcje (150+)

**Uwaga:** Bloki to w pełni funkcjonalne, złożone komponenty łączące wiele prostych komponentów. Idealne do szybkiego prototypowania!

**Authentication:**
- `login-01` do `login-05` - Różne warianty stron logowania
- `signup-01` do `signup-05` - Różne warianty rejestracji
- `otp-01` do `otp-05` - Weryfikacja OTP

**Sidebars (16 wariantów):**
- `sidebar-01` - Prosty sidebar z nawigacją pogrupowaną sekcjami
- `sidebar-02` - Z collapsible sections
- `sidebar-03` - Z podmenu
- `sidebar-04` - Floating sidebar z podmenu
- `sidebar-07` - Składany do ikon
- `sidebar-11` - Z collapsible file tree
- `sidebar-12` - Z kalendarzem
- ...i wiele więcej

**Calendar (32 warianty):**
- `calendar-01` - Prosty kalendarz
- `calendar-04` - Single month z range selection
- `calendar-16` - Z time picker
- `calendar-22` - Date picker
- `calendar-23` - Date range picker
- `calendar-24` - Date and time picker
- `calendar-29` - Natural language date picker
- ...i wiele więcej

**Dashboard:**
- `dashboard-01` - Dashboard z sidebar, charts i data table

**Charts (60+ przykładów):**
- Area charts: `chart-area-default`, `chart-area-stacked`, `chart-area-interactive`
- Bar charts: `chart-bar-default`, `chart-bar-horizontal`, `chart-bar-stacked`
- Line charts: `chart-line-default`, `chart-line-multiple`, `chart-line-interactive`
- Pie charts: `chart-pie-donut`, `chart-pie-interactive`, `chart-pie-legend`
- Radar charts: `chart-radar-default`, `chart-radar-multiple`
- Radial charts: `chart-radial-simple`, `chart-radial-stacked`

### Przykłady użycia (Examples/Demos) - 200+

Każdy komponent posiada wiele przykładów demonstracyjnych z pełnym kodem:
- `button-demo`, `button-loading`, `button-with-icon`
- `form-rhf-demo`, `form-rhf-array`, `form-rhf-complex`
- `dialog-demo`, `drawer-demo`, `sheet-demo`
- `input-group-demo`, `input-group-button`, `input-group-icon`
- ...i setki innych

**Jak znaleźć przykłady:**
- Użyj MCP: `mcp__shadcn__get_item_examples_from_registries` z query jak "button-demo" lub "accordion example"
- Wzorce nazewnictwa: `{component}-demo`, `{component} example`, `example-{component}`

### Utilities & Themes

**Hooks:**
- `use-mobile` - Hook do wykrywania urządzeń mobilnych

**Themes (5 wariantów):**
- `theme-stone`, `theme-zinc`, `theme-neutral`, `theme-gray`, `theme-slate`

**Lib:**
- `utils` - Utility functions (cn, etc.)

## Component Styling

Ten projekt wykorzystuje wariant stylu „new-york" z kolorem bazowym "neutral" i zmiennymi CSS do tworzenia motywów, zgodnie z konfiguracją w `components.json`.

## Best Practices

1. **Zacznij od przykładów** - Przed implementacją sprawdź dostępne demo komponentu używając MCP tools
2. **Wykorzystaj bloki** - Dla złożonych UI (login, dashboard) użyj gotowych bloków zamiast budować od zera
3. **Kompozycja** - Komponenty są zaprojektowane do komponowania (np. Card z Form, Dialog z Form)
4. **Dostępność** - Wszystkie komponenty są zgodne z ARIA standards
5. **Customizacja** - Komponenty są kopiowane do projektu, więc możesz je swobodnie modyfikować

## Workflow zalecany dla LLM

Gdy użytkownik prosi o implementację UI:

1. **Sprawdź dostępne komponenty** używając `mcp__shadcn__search_items_in_registries`
2. **Znajdź przykłady** używając `mcp__shadcn__get_item_examples_from_registries`
3. **Sprawdź czy istnieje gotowy block** (np. `login-02` zamiast budować formularz od zera)
4. **Pobierz komendę instalacji** używając `mcp__shadcn__get_add_command_for_items`
5. **Zainstaluj komponent** używając `npx shadcn@latest add ...`
6. **Zaimplementuj** bazując na przykładach z registry
7. **Uruchom audit checklist** używając `mcp__shadcn__get_audit_checklist` po zakończeniu