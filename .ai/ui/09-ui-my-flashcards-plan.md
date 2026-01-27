# Implementation Plan: "My Flashcards" View (`/flashcards`)

## 1. Overview

The "My Flashcards" view is the primary flashcard management hub for authenticated users. It provides a complete CRUD interface for flashcards: browsing a paginated list, searching, creating new manual flashcards, editing existing ones (both AI-generated and manual), and deleting flashcards with confirmation.

The view follows a server-side rendered (SSR) initial load pattern via Astro, with client-side React handling all subsequent interactions (search, pagination, CRUD operations). Toast notifications provide feedback for all user actions.

**Related User Stories:** US-005 (Edit), US-006 (Delete), US-007 (Manual Creation), US-009 (Secure Access)

## 2. View Routing

- **Path:** `/flashcards`
- **Astro Page:** `src/pages/flashcards.astro`
- **Layout:** `AppLayout.astro` (includes Navbar with active state highlighting)
- **Protection:** Middleware redirects unauthenticated users to `/login`. Authenticated users on `/login` or `/register` are redirected here.
- **SSR:** The Astro page fetches initial flashcard data server-side and passes it as serializable props to the React component (`client:load` directive for immediate hydration).

## 3. Component Structure

```
src/pages/flashcards.astro                  (Astro page - SSR data fetching)
└── AppLayout.astro                         (Layout with Navbar)
    └── FlashcardList                       (React, client:load - main container)
        ├── Page header area
        │   ├── <h1> "Moje fiszki"
        │   └── Button "+ Nowa fiszka"
        ├── Search Input                    (text input with search icon)
        ├── [Loading state] → Skeleton cards grid (6 placeholders)
        ├── [Error state] → Alert with retry button
        ├── [Empty state] → FlashcardEmpty
        ├── [Data state] → Grid of FlashcardCard
        │   └── FlashcardCard               (repeated, 1-3 columns responsive)
        │       ├── Front text (truncated)
        │       ├── Back text (truncated)
        │       ├── Source badge (AI / Manual) + date
        │       ├── Edit button
        │       └── Delete button
        ├── Pagination                      (Shadcn Pagination)
        ├── FlashcardEditDialog             (single instance, controlled)
        │   ├── Front textarea + char counter
        │   ├── Back textarea + char counter
        │   ├── Cancel button
        │   └── Save button
        └── FlashcardDeleteDialog           (single instance, controlled)
            ├── Confirmation message
            ├── Cancel button
            └── Delete button
```

**File structure:**

```
src/components/
├── flashcards/
│   ├── FlashcardList.tsx
│   ├── FlashcardCard.tsx
│   ├── FlashcardEditDialog.tsx
│   ├── FlashcardDeleteDialog.tsx
│   └── FlashcardEmpty.tsx
└── hooks/
    └── useFlashcards.ts
```

## 4. Component Details

### 4.1 `FlashcardList.tsx`

- **Description:** Main container component that orchestrates the entire "My Flashcards" view. Manages the top-level state via the `useFlashcards` custom hook, renders the search input, flashcard grid (or empty/loading/error states), pagination, and hosts the edit and delete dialogs. This is the single React entry point hydrated by `client:load` in the Astro page.
- **Main elements:**
  - Page header: `<h1>` with title "Moje fiszki" and a `<Button>` "+ Nowa fiszka" aligned right
  - Search: `<Input>` with placeholder "Szukaj fiszek..." and a search icon (Lucide `Search`)
  - Content area (conditional rendering):
    - **Loading:** Grid of 6 `<Skeleton>` cards matching `FlashcardCard` dimensions
    - **Error:** `<Alert variant="destructive">` with error message and a "Spróbuj ponownie" retry `<Button>`
    - **Empty (no flashcards at all):** `<FlashcardEmpty />`
    - **Empty (search with no results):** Inline message "Brak wyników dla podanego zapytania"
    - **Data:** Responsive grid of `<FlashcardCard>` components
  - Pagination: Shadcn `<Pagination>` component below the grid
  - `<FlashcardEditDialog>` (single instance, visibility controlled by state)
  - `<FlashcardDeleteDialog>` (single instance, visibility controlled by state)
- **Handled interactions:**
  - Click "+ Nowa fiszka" → open `FlashcardEditDialog` in create mode
  - Type in search → debounced search (300ms), reset to page 1
  - Click pagination → fetch page N
  - Receive `onEdit` from `FlashcardCard` → open `FlashcardEditDialog` in edit mode
  - Receive `onDelete` from `FlashcardCard` → open `FlashcardDeleteDialog`
  - Receive `onSave` from `FlashcardEditDialog` → create or update via hook
  - Receive `onConfirm` from `FlashcardDeleteDialog` → delete via hook (optimistic)
- **Validation:** None directly (delegates to child components)
- **Types:**
  - `FlashcardDTO`, `PaginationDTO` (from `src/types.ts`)
  - `FlashcardListProps` (component props interface)
- **Props:**
  ```typescript
  interface FlashcardListProps {
    initialFlashcards: FlashcardDTO[];
    initialPagination: PaginationDTO;
  }
  ```

### 4.2 `FlashcardCard.tsx`

- **Description:** Presentational component displaying a single flashcard in the grid. Shows truncated front/back content, source badge (AI or Manual with icon), creation date, and action buttons for editing and deleting. Uses Shadcn `Card` as the base.
- **Main elements:**
  - `<Card>` wrapper
  - `<CardHeader>`: Front text, truncated to ~150 characters with ellipsis
  - `<CardContent>`: Back text, truncated to ~150 characters with ellipsis, visually separated
  - `<CardFooter>`:
    - Source indicator: icon + label (`"AI"` with Bot icon or `"Manual"` with Pen icon from Lucide)
    - Formatted creation date (e.g., "15.01.2024")
    - Action buttons row: "Edytuj" `<Button variant="ghost" size="sm">` and delete `<Button variant="ghost" size="sm">` with Trash2 icon
- **Handled interactions:**
  - Click "Edytuj" → calls `onEdit()` prop
  - Click delete icon → calls `onDelete()` prop
- **Validation:** None
- **Types:**
  - `FlashcardDTO` (from `src/types.ts`)
  - `FlashcardSource` (from `src/types.ts`)
- **Props:**
  ```typescript
  interface FlashcardCardProps {
    flashcard: FlashcardDTO;
    onEdit: () => void;
    onDelete: () => void;
  }
  ```

### 4.3 `FlashcardEditDialog.tsx`

- **Description:** Modal dialog for creating a new flashcard or editing an existing one. Uses Shadcn `Dialog` component. Contains a form with two textareas (front and back), character counters, and action buttons. Performs client-side validation using the shared Zod schema before calling the parent's save callback.
- **Main elements:**
  - `<Dialog>` with `<DialogContent>`
  - `<DialogHeader>`: Title "Edytuj fiszkę" (edit mode) or "Nowa fiszka" (create mode)
  - Form body:
    - Label "Przód fiszki" + `<Textarea>` for front + character counter "X/500 znaków" + error message
    - Label "Tył fiszki" + `<Textarea>` for back + character counter "X/2000 znaków" + error message
  - `<DialogFooter>`:
    - "Anuluj" `<Button variant="outline">` → calls `onClose()`
    - "Zapisz" `<Button>` → validates and calls `onSave()` with form data
- **Handled interactions:**
  - Change textarea content → update local form state, clear field error, update char counter
  - Blur textarea → validate field (on-blur validation)
  - Click "Zapisz" → full form validation → call `onSave(data)` if valid
  - Click "Anuluj" or close dialog → call `onClose()`
  - Dialog close (ESC key, overlay click) → call `onClose()`
- **Validation (matching API schema):**
  - Front: required, 1–500 characters (`createFlashcardSchema.shape.front`)
  - Back: required, 1–2000 characters (`createFlashcardSchema.shape.back`)
  - On-blur: validate individual field
  - On-submit: validate entire form
- **Types:**
  - `FlashcardDTO` (for pre-filling edit mode)
  - `FlashcardFormData` (new ViewModel type)
  - `FlashcardFormErrors` (new ViewModel type)
- **Props:**
  ```typescript
  interface FlashcardEditDialogProps {
    flashcard: FlashcardDTO | null;  // null = create mode, non-null = edit mode
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: FlashcardFormData) => Promise<void>;
  }
  ```

### 4.4 `FlashcardDeleteDialog.tsx`

- **Description:** Confirmation dialog for permanently deleting a flashcard. Uses Shadcn `AlertDialog` to enforce explicit user confirmation before destructive action. Shows the flashcard's front text for context.
- **Main elements:**
  - `<AlertDialog>` with `<AlertDialogContent>`
  - `<AlertDialogHeader>`:
    - Title: "Usunąć fiszkę?"
    - Description: "Ta operacja jest nieodwracalna. Fiszka zostanie trwale usunięta." + preview of flashcard front text (truncated)
  - `<AlertDialogFooter>`:
    - "Anuluj" `<AlertDialogCancel>` → closes dialog
    - "Usuń" `<AlertDialogAction>` with destructive variant → calls `onConfirm()`
- **Handled interactions:**
  - Click "Usuń" → calls `onConfirm()` prop
  - Click "Anuluj" or close → calls `onCancel()` prop
- **Validation:** None
- **Types:**
  - `FlashcardDTO` (for displaying context)
- **Props:**
  ```typescript
  interface FlashcardDeleteDialogProps {
    flashcard: FlashcardDTO | null;
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }
  ```

### 4.5 `FlashcardEmpty.tsx`

- **Description:** Empty state component displayed when the user has no flashcards at all (not due to search filtering). Shows a friendly message with a CTA button to navigate to the generation page.
- **Main elements:**
  - Centered container with vertical layout
  - Book icon (Lucide `BookOpen`, large)
  - Heading: "Nie masz jeszcze fiszek"
  - Description: "Wygeneruj swoje pierwsze fiszki z tekstu lub dodaj je ręcznie."
  - CTA: `<Button>` "Generuj fiszki" → navigates to `/generate`
  - Secondary CTA: `<Button variant="outline">` "+ Nowa fiszka" → calls `onCreateNew()`
- **Handled interactions:**
  - Click "Generuj fiszki" → `window.location.href = '/generate'`
  - Click "+ Nowa fiszka" → calls `onCreateNew()` prop
- **Validation:** None
- **Types:** None
- **Props:**
  ```typescript
  interface FlashcardEmptyProps {
    onCreateNew: () => void;
  }
  ```

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

These types are already defined and should be reused as-is:

| Type | Fields | Usage |
|------|--------|-------|
| `FlashcardDTO` | `id: string`, `front: string`, `back: string`, `source: FlashcardSource`, `generation_id: string \| null`, `created_at: string`, `updated_at: string` | Flashcard data throughout all components |
| `FlashcardSource` | `"ai_generated" \| "manual"` | Source badge rendering |
| `PaginationDTO` | `page: number`, `limit: number`, `total: number`, `total_pages: number` | Pagination component state |
| `FlashcardsListDTO` | `flashcards: FlashcardDTO[]`, `pagination: PaginationDTO` | API GET response type |
| `CreateFlashcardCommand` | `{ front: string, back: string }` | API POST request body |
| `UpdateFlashcardCommand` | `{ front: string, back: string }` | API PUT request body |
| `FlashcardsQueryParams` | `page?: number`, `limit?: number`, `source?: FlashcardSource`, `sort?: "created_at" \| "updated_at"`, `order?: "asc" \| "desc"` | API GET query parameters |
| `ErrorResponseDTO` | `{ error: { code: string, message: string } }` | API error response handling |

### 5.2 Existing Zod Schemas (from `src/lib/schemas/flashcard.schema.ts`)

| Schema | Usage |
|--------|-------|
| `createFlashcardSchema` | Client-side validation in `FlashcardEditDialog` (both create and edit modes) |

### 5.3 New ViewModel Types

Define in a dedicated file `src/components/flashcards/types.ts`:

```typescript
/**
 * Form data for the flashcard edit/create dialog.
 * Mirrors CreateFlashcardCommand but used as local form state.
 */
export interface FlashcardFormData {
  front: string;
  back: string;
}

/**
 * Field-level validation errors for the flashcard form.
 */
export interface FlashcardFormErrors {
  front?: string;
  back?: string;
}
```

### 5.4 Component Props Interfaces

Each component defines its own props interface (detailed in Section 4). These are co-located with their respective component files, not in the shared types file.

## 6. State Management

### 6.1 Custom Hook: `useFlashcards`

**File:** `src/components/hooks/useFlashcards.ts`

This hook encapsulates all data fetching and mutation logic for the flashcards view. It manages the flashcard list state, handles API communication, and exposes actions for CRUD operations, search, and pagination.

**Parameters:**
```typescript
interface UseFlashcardsParams {
  initialFlashcards: FlashcardDTO[];
  initialPagination: PaginationDTO;
}
```

**Returned State:**
```typescript
interface UseFlashcardsReturn {
  // Data
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;

  // UI state
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  currentPage: number;

  // Actions
  setSearchQuery: (query: string) => void;    // Triggers debounced fetch
  setCurrentPage: (page: number) => void;     // Triggers fetch
  createFlashcard: (data: FlashcardFormData) => Promise<void>;
  updateFlashcard: (id: string, data: FlashcardFormData) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  retry: () => void;                           // Re-fetch current view
}
```

**Internal Implementation Details:**

1. **Initialization:** Uses `initialFlashcards` and `initialPagination` as default state values (from SSR).

2. **Fetch function (`fetchFlashcards`):** Internal function that builds query string from `currentPage`, `searchQuery`, and fixed defaults (`limit=20`, `sort=created_at`, `order=desc`). Calls `GET /api/flashcards?...` and updates `flashcards` and `pagination` state.

3. **Search debounce:** Uses a `useRef` for the debounce timer. When `setSearchQuery` is called, it updates the query state immediately (for input binding) and schedules a fetch after 300ms. Each new call resets the timer. Search always resets `currentPage` to 1.

4. **Pagination:** `setCurrentPage` triggers an immediate fetch with the new page number.

5. **CRUD Strategies** (as specified in UI plan):

   | Operation | Strategy | Context Preservation |
   |-----------|----------|---------------------|
   | **DELETE** | Optimistic removal + refetch | Preserves page and search |
   | **CREATE** | Refetch + reset | Resets to page 1, clears search |
   | **UPDATE** | Refetch with context | Preserves page and search |

6. **Optimistic Delete Flow:**
   ```
   1. Store backup of current flashcards
   2. Immediately remove from local state
   3. Call DELETE API
   4. On success: toast success, refetch current view (fix pagination)
   5. On failure: rollback to backup, toast error
   ```

7. **Error handling:** Sets `error` state with user-friendly message. The `retry` function re-executes the last fetch.

### 6.2 Dialog State in `FlashcardList`

Dialog visibility and target flashcard are managed locally in `FlashcardList` using `useState`:

```typescript
// Edit dialog state
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editingFlashcard, setEditingFlashcard] = useState<FlashcardDTO | null>(null);

// Delete dialog state
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deletingFlashcard, setDeletingFlashcard] = useState<FlashcardDTO | null>(null);
```

**Rationale:** Dialog state is a UI concern (which modal is visible, which flashcard is targeted) and doesn't belong in the data hook. This separation keeps `useFlashcards` focused on data operations and makes both the hook and the component easier to test independently.

### 6.3 Form State in `FlashcardEditDialog`

The dialog manages its own local form state:

```typescript
const [formData, setFormData] = useState<FlashcardFormData>({ front: '', back: '' });
const [errors, setErrors] = useState<FlashcardFormErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

The form state is initialized/reset via a `useEffect` that watches the `flashcard` prop and `isOpen` state:
- **Create mode** (`flashcard === null`): initializes empty form
- **Edit mode** (`flashcard` provided): pre-fills form with existing values
- **On close**: form state is reset on next open

## 7. API Integration

### 7.1 Endpoint: List Flashcards

| Aspect | Detail |
|--------|--------|
| **Method** | `GET` |
| **URL** | `/api/flashcards` |
| **Query Params** | `page` (number), `limit` (number, default 20), `sort` (string, default "created_at"), `order` (string, default "desc") |
| **Request Type** | N/A (query params only) |
| **Response Type (200)** | `FlashcardsListDTO` → `{ flashcards: FlashcardDTO[], pagination: PaginationDTO }` |
| **Error Response** | `ErrorResponseDTO` → `{ error: { code: string, message: string } }` |
| **Timeout** | 10 seconds |
| **Called by** | `useFlashcards` hook on mount, search, pagination |

### 7.2 Endpoint: Create Flashcard

| Aspect | Detail |
|--------|--------|
| **Method** | `POST` |
| **URL** | `/api/flashcards` |
| **Request Body** | `CreateFlashcardCommand` → `{ front: string, back: string }` |
| **Response Type (201)** | `FlashcardDTO` |
| **Error Response (400)** | `ErrorResponseDTO` with `code: "VALIDATION_ERROR"` |
| **Error Response (500)** | `ErrorResponseDTO` with `code: "INTERNAL_ERROR"` |
| **Timeout** | 10 seconds |
| **Called by** | `useFlashcards.createFlashcard()` |

### 7.3 Endpoint: Update Flashcard

| Aspect | Detail |
|--------|--------|
| **Method** | `PUT` |
| **URL** | `/api/flashcards/:id` |
| **Request Body** | `UpdateFlashcardCommand` → `{ front: string, back: string }` |
| **Response Type (200)** | `FlashcardDTO` |
| **Error Response (400)** | `ErrorResponseDTO` with `code: "VALIDATION_ERROR"` |
| **Error Response (404)** | `ErrorResponseDTO` with `code: "NOT_FOUND"` |
| **Error Response (500)** | `ErrorResponseDTO` with `code: "INTERNAL_ERROR"` |
| **Timeout** | 10 seconds |
| **Called by** | `useFlashcards.updateFlashcard()` |

### 7.4 Endpoint: Delete Flashcard

| Aspect | Detail |
|--------|--------|
| **Method** | `DELETE` |
| **URL** | `/api/flashcards/:id` |
| **Request Body** | N/A |
| **Response Type (204)** | No content |
| **Error Response (404)** | `ErrorResponseDTO` with `code: "NOT_FOUND"` |
| **Error Response (500)** | `ErrorResponseDTO` with `code: "INTERNAL_ERROR"` |
| **Timeout** | 10 seconds |
| **Called by** | `useFlashcards.deleteFlashcard()` (optimistic) |

### 7.5 Fetch Pattern

All API calls from the hook should use the native `fetch` API with `credentials: "include"` (for cookie-based auth) and `Content-Type: "application/json"` for request bodies. Implement a local helper or reusable function with `AbortController` for timeout support (10 seconds for all flashcard endpoints).

```typescript
// Simplified pattern used inside the hook
const response = await fetch(url, {
  method,
  headers: { "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
  credentials: "include",
  signal: AbortSignal.timeout(10_000),
});
```

## 8. User Interactions

### 8.1 View Flashcard List (Page Load)

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Navigate to `/flashcards` | Astro SSR fetches initial flashcards and renders page |
| 2 | - | React component hydrates with SSR data (no loading flash) |
| 3 | User sees flashcard grid | Grid displays 1 col (mobile), 2 cols (md), 3 cols (lg) |

### 8.2 Search Flashcards

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Type in search input | Input value updates immediately |
| 2 | - | After 300ms debounce: `isLoading=true`, fetch `GET /api/flashcards?search=...&page=1` |
| 3 | - | Display results or "Brak wyników dla podanego zapytania" message |
| 4 | Clear search input | Reset to page 1, fetch all flashcards |

### 8.3 Navigate Pages

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Click page number or next/previous | `isLoading=true`, fetch `GET /api/flashcards?page=N` |
| 2 | - | Update flashcard grid and pagination controls |

### 8.4 Create Flashcard (Manual)

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Click "+ Nowa fiszka" | Open `FlashcardEditDialog` with empty form (create mode) |
| 2 | Fill in "Przód fiszki" and "Tył fiszki" | Live character counters update |
| 3 | Click "Zapisz" | Client-side validation → if invalid, show field errors |
| 4 | - | If valid: `isSubmitting=true`, `POST /api/flashcards` |
| 5 | - | On success: close dialog, `toast.success("Utworzono fiszkę")`, reset to page 1, clear search, refetch |
| 6 | - | On failure: `toast.error(...)`, dialog stays open |

### 8.5 Edit Flashcard

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Click "Edytuj" on a flashcard card | Open `FlashcardEditDialog` pre-filled with flashcard data (edit mode) |
| 2 | Modify "Przód fiszki" and/or "Tył fiszki" | Live character counters update |
| 3 | Click "Zapisz" | Client-side validation → if invalid, show field errors |
| 4 | - | If valid: `isSubmitting=true`, `PUT /api/flashcards/:id` |
| 5 | - | On success: close dialog, `toast.success("Zaktualizowano fiszkę")`, refetch current view |
| 6 | - | On failure: `toast.error(...)`, dialog stays open |

### 8.6 Delete Flashcard

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Click delete icon (Trash2) on a flashcard card | Open `FlashcardDeleteDialog` with flashcard context |
| 2 | Click "Usuń" | Close dialog immediately |
| 3 | - | Optimistic: remove card from grid instantly |
| 4 | - | `DELETE /api/flashcards/:id` |
| 5 | - | On success: `toast.success("Usunięto fiszkę")`, refetch to fix pagination |
| 6 | - | On failure: rollback (re-add card to grid), `toast.error("Nie udało się usunąć fiszki")` |

## 9. Conditions and Validation

### 9.1 Flashcard Form Validation (FlashcardEditDialog)

Uses the shared Zod schema `createFlashcardSchema` from `src/lib/schemas/flashcard.schema.ts` for consistent client-side and server-side validation.

| Field | Condition | Error Message | Trigger |
|-------|-----------|---------------|---------|
| Front | Required (non-empty) | "Front must be between 1 and 500 characters" | On blur, on submit |
| Front | Max 500 characters | "Front must be between 1 and 500 characters" | On blur, on submit |
| Back | Required (non-empty) | "Back must be between 1 and 2000 characters" | On blur, on submit |
| Back | Max 2000 characters | "Back must be between 1 and 2000 characters" | On blur, on submit |

**Validation behavior:**
- **On blur:** Validate the individual field. Show error below the field if invalid.
- **On change:** Clear the field error when the user starts typing (same pattern as `LoginForm`).
- **On submit:** Validate all fields. If any field is invalid, show all errors and prevent API call. If valid, proceed with API call.

### 9.2 Search Input

| Condition | Behavior |
|-----------|----------|
| Empty search query | Fetch all flashcards (no filter) |
| Non-empty search query | Debounce 300ms, fetch with `search` param, reset to page 1 |
| Search query changed while loading | Cancel previous debounce timer, start new 300ms countdown |

### 9.3 Pagination

| Condition | Behavior |
|-----------|----------|
| `total_pages <= 1` | Hide pagination component |
| `currentPage === 1` | Disable "previous" button |
| `currentPage === total_pages` | Disable "next" button |

### 9.4 Save Button State (FlashcardEditDialog)

| Condition | Behavior |
|-----------|----------|
| `isSubmitting === true` | Button disabled, shows spinner and "Zapisywanie..." text |
| Both fields empty | Button enabled (validation happens on click) |
| Form has validation errors | Button enabled (user can retry after fixing) |

## 10. Error Handling

### 10.1 API Error Mapping

| API Error Code | User-Facing Message | Display Method |
|----------------|---------------------|----------------|
| `VALIDATION_ERROR` | Error message from API response | Toast error or form field error |
| `NOT_FOUND` | "Nie znaleziono fiszki. Mogła zostać już usunięta." | Toast error |
| `UNAUTHORIZED` | "Sesja wygasła. Zaloguj się ponownie." | Toast error + redirect to `/login` |
| `INTERNAL_ERROR` | "Wystąpił błąd. Spróbuj ponownie później." | Toast error or Alert with retry |
| Network error | "Nie udało się połączyć z serwerem. Sprawdź połączenie." | Toast error or Alert with retry |
| Timeout (`AbortError`) | "Przekroczono czas oczekiwania na odpowiedź." | Toast error or Alert with retry |

### 10.2 Error Handling by Context

| Context | Error Display | Recovery |
|---------|---------------|----------|
| **Initial page load (SSR fails)** | Show `Alert` with retry button in place of grid | Click retry to re-fetch client-side |
| **Search / pagination fetch** | Show `Alert` with retry button, preserve last good data below | Click retry or change search/page |
| **Create flashcard** | `toast.error(message)`, dialog stays open | Fix form and retry |
| **Update flashcard** | `toast.error(message)`, dialog stays open | Fix form and retry |
| **Delete flashcard** | Rollback optimistic removal, `toast.error(message)` | Try deleting again |
| **Refetch after CRUD** | Silent failure (non-critical), log to console | User can manually refresh page |

### 10.3 Session Expiration

If any API call returns `401 Unauthorized`, redirect to `/login` using `window.location.href` (full page reload to clear stale state). This should be handled centrally in the fetch helper inside the hook.

## 11. Implementation Steps

### Step 1: Install Required Shadcn Components

Install missing Shadcn components needed for this view:

```bash
npx shadcn@latest add dialog alert-dialog textarea pagination skeleton
```

**Components to install:** `dialog`, `alert-dialog`, `textarea`, `pagination`, `skeleton`

### Step 2: Add Toaster to AppLayout

Ensure the Sonner `<Toaster />` component is rendered in `AppLayout.astro` so toast notifications work on protected pages. Import and render it as a React component with `client:load`.

### Step 3: Create ViewModel Types

Create `src/components/flashcards/types.ts` with `FlashcardFormData` and `FlashcardFormErrors` interfaces.

### Step 4: Implement `useFlashcards` Custom Hook

Create `src/components/hooks/useFlashcards.ts`:

1. Accept `initialFlashcards` and `initialPagination` as parameters
2. Implement state for: `flashcards`, `pagination`, `isLoading`, `error`, `searchQuery`, `currentPage`
3. Implement `fetchFlashcards(page, search)` — builds URL with query params, calls `GET /api/flashcards`, updates state
4. Implement debounced search with `useRef` timer (300ms)
5. Implement `createFlashcard` — calls `POST /api/flashcards`, resets to page 1, clears search, refetches
6. Implement `updateFlashcard` — calls `PUT /api/flashcards/:id`, refetches current view
7. Implement `deleteFlashcard` — optimistic removal, calls `DELETE /api/flashcards/:id`, refetches or rollbacks
8. Implement `retry` — re-executes last fetch
9. Handle 401 responses with redirect to `/login`
10. Use `useCallback` for stable action references passed to child components

### Step 5: Implement `FlashcardEmpty` Component

Create `src/components/flashcards/FlashcardEmpty.tsx`:

1. Centered layout with BookOpen icon, heading, description, and two CTA buttons
2. "Generuj fiszki" button navigates to `/generate`
3. "+ Nowa fiszka" button calls `onCreateNew` prop

### Step 6: Implement `FlashcardCard` Component

Create `src/components/flashcards/FlashcardCard.tsx`:

1. Use Shadcn `Card`, `CardHeader`, `CardContent`, `CardFooter`
2. Truncate front and back text (e.g., 150 chars with `...`)
3. Source badge with appropriate icon (Bot for AI, Pen for Manual)
4. Format `created_at` date to locale string (e.g., "15.01.2024")
5. "Edytuj" button and Trash2 icon button with `aria-label="Usuń fiszkę"`
6. Apply `React.memo()` for performance (prevents re-render when parent state changes but this card's data hasn't)

### Step 7: Implement `FlashcardDeleteDialog` Component

Create `src/components/flashcards/FlashcardDeleteDialog.tsx`:

1. Use Shadcn `AlertDialog` with all subcomponents
2. Show truncated flashcard front text in the description for context
3. "Anuluj" and "Usuń" (destructive variant) buttons
4. Controlled open/close via props

### Step 8: Implement `FlashcardEditDialog` Component

Create `src/components/flashcards/FlashcardEditDialog.tsx`:

1. Use Shadcn `Dialog` with all subcomponents
2. Local state for `formData`, `errors`, `isSubmitting`
3. `useEffect` to initialize form on open (empty for create, pre-filled for edit)
4. Use `createFlashcardSchema` for validation (reuse existing Zod schema)
5. Field-level validation on blur (same pattern as `LoginForm`)
6. Clear field errors on change
7. Full form validation on submit
8. Character counters below each textarea
9. Disable inputs and show spinner during submission
10. Use `useId()` for unique IDs on form fields (accessibility)

### Step 9: Implement `FlashcardList` Container Component

Create `src/components/flashcards/FlashcardList.tsx`:

1. Use `useFlashcards` hook with initial data from props
2. Render page header with title and "+ Nowa fiszka" button
3. Render search `Input` with search icon and debounce connection to hook
4. Conditional rendering: loading skeletons / error alert / empty state / flashcard grid
5. Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
6. Skeleton loading: 6 `Skeleton` cards matching `FlashcardCard` dimensions
7. Render Shadcn `Pagination` when `total_pages > 1`
8. Manage dialog state (editDialogOpen, editingFlashcard, deleteDialogOpen, deletingFlashcard)
9. Wire up dialog callbacks to hook actions
10. Use `useCallback` for handlers passed to child components

### Step 10: Update `flashcards.astro` Page

Update `src/pages/flashcards.astro`:

1. Import `FlashcardService` from `src/lib/services/flashcard.service`
2. In Astro frontmatter: create service instance, fetch initial flashcards with default params
3. Handle SSR fetch errors gracefully (pass empty arrays as fallback)
4. Render `FlashcardList` with `client:load` directive and initial data props
5. Ensure data passed as props is serializable (plain objects)

### Step 11: Verify and Polish

1. Run the audit checklist (`mcp__shadcn__get_audit_checklist`)
2. Verify all ARIA attributes are in place (aria-labels on icon buttons, aria-live for dynamic content)
3. Test responsive layout at all breakpoints (mobile, md, lg)
4. Test keyboard navigation (Tab through cards, Enter to open dialogs, ESC to close)
5. Test error states (disconnect network, trigger API errors)
6. Test empty state rendering
7. Verify toast notifications appear for all CRUD operations
8. Ensure the Toaster component is rendered in AppLayout
