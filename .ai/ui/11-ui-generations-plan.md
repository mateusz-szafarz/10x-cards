# Plan implementacji widoku "Generate Flashcards"

## 1. Przegląd

The "Generate Flashcards" view (`/generate`) enables authenticated users to paste source text (1000-10000 characters) and use AI to generate flashcard proposals. Users can review each proposal, accept or reject it, and optionally edit the front/back text inline before saving the accepted proposals to their collection. The view follows a single-page progressive disclosure flow: starting with just a text input, then revealing proposals after generation, and finally redirecting to `/flashcards` after saving.

This view implements user stories US-003 (AI generation), US-004 (review and approval), and US-005 (editing proposals).

## 2. Routing widoku

- **Path**: `/generate`
- **File**: `src/pages/generate.astro`
- **Layout**: `AppLayout.astro` (with Navbar, requires authentication)
- **Protection**: Middleware redirects unauthenticated users to `/login`
- **No SSR data**: The page starts in an idle state (no server-side data fetching needed, unlike `/flashcards`)

## 3. Struktura komponentów

```
src/pages/generate.astro
└── GenerateView.tsx (client:load) — React container, orchestrates entire view
    ├── GenerationForm.tsx — Textarea + character counter + generate button
    │   ├── <Textarea> (shadcn/ui)
    │   ├── Character counter (inline <div>)
    │   └── <Button> (shadcn/ui) — "Generate flashcards" / "Generate again"
    │
    ├── [viewState === 'generating'] Skeleton loading cards
    │
    ├── [viewState === 'error'] <Alert> with error message + retry button
    │
    └── [viewState === 'generated' | 'saving'] ProposalList.tsx
        ├── Header: "Flashcard proposals (N)" + "Accepted: M"
        ├── ProposalCard.tsx (× N) — Individual proposal with inline editing
        │   ├── <Card> (shadcn/ui)
        │   ├── Front section: text display or inline <Textarea>
        │   ├── Back section: text display or inline <Textarea>
        │   ├── Status indicator (accepted/rejected visual feedback)
        │   └── Action buttons: Accept / Reject
        └── <Button> "Save accepted (M)" — disabled when M === 0 or saving
```

### Component file structure

```
src/components/generation/
├── types.ts                 # ViewModel types for the generation feature
├── GenerateView.tsx         # Container component (orchestrator)
├── GenerationForm.tsx       # Source text input form
├── ProposalList.tsx         # Proposals container with save button
└── ProposalCard.tsx         # Individual proposal card (controlled)

src/hooks/
└── useGenerateFlashcards.ts # Custom hook for generation state & API
```

## 4. Szczegoly komponentow

### 4.1 GenerateView

- **Description**: Top-level React container component rendered with `client:load` in the Astro page. Orchestrates the entire generation flow by wiring the `useGenerateFlashcards` hook to child components. Handles conditional rendering based on `viewState`.
- **Main elements**:
  - Page header (`<h1>` with title "Generate flashcards")
  - `<GenerationForm>` — always visible
  - Conditional content area based on `viewState`:
    - `'idle'`: nothing below the form
    - `'generating'`: skeleton loading cards (6 skeleton placeholders)
    - `'error'`: `<Alert>` with error message and "Try again" button
    - `'generated'` / `'saving'` with empty proposals: `<Alert variant="default">` with message "No flashcard proposals were generated from this text. Try with different or more detailed source material." and "Generate again" is available via the form above.
    - `'generated'` / `'saving'` with proposals: `<ProposalList>` with proposals
- **Handled interactions**: None directly — delegates all interaction handling to children via callbacks from the hook.
- **Validation**: None directly — delegates to children and hook.
- **Types**: `GenerateViewState`, `FlashcardProposalViewModel` (from `generation/types.ts`)
- **Props**: None (self-contained, uses hook internally)

### 4.2 GenerationForm

- **Description**: Form component containing the source text `<Textarea>`, a character counter, and the generate/regenerate button. Responsible for source text validation and user feedback about text length requirements.
- **Main elements**:
  - `<Label>` — "Paste your source text (1000-10000 characters)"
  - `<Textarea>` (shadcn/ui) — `maxLength={10000}`, `rows={8}`, placeholder text
  - Character counter `<div>` — shows `"{count}/10000 characters (min. 1000)"`, highlights in destructive color when under minimum
  - Validation error `<span>` — shown below textarea when validation fails
  - `<Button>` (shadcn/ui) — "Generate flashcards" initially, "Generate again" after first generation, shows `<Loader2>` spinner during generation
- **Handled interactions**:
  - `onChange` on textarea → calls `onSourceTextChange(value)`, clears validation error
  - `onBlur` on textarea → validates minimum length, shows error if < 1000 chars
  - `onClick` on button → calls `onGenerate()`
- **Validation**:
  - Source text must be 1000-10000 characters
  - On blur: validate minimum length (show error if not empty and < 1000)
  - On submit (via parent): full Zod validation before API call
  - `maxLength={10000}` HTML attribute prevents exceeding maximum
- **Types**: None specific — uses primitive props
- **Props**:
  ```typescript
  interface GenerationFormProps {
    sourceText: string;
    onSourceTextChange: (text: string) => void;
    onGenerate: () => void;
    isLoading: boolean;          // true when viewState === 'generating'
    hasProposals: boolean;       // true when proposals exist (changes button text)
    isDisabled: boolean;         // true when viewState === 'saving'
  }
  ```

### 4.3 ProposalList

- **Description**: Container component that renders the list of AI-generated proposals with a summary header and a save button. Manages the visual layout and provides the "Save accepted" action. Renders `ProposalCard` for each proposal.
- **Main elements**:
  - Header `<div>` — displays "Flashcard proposals ({total})" and "Accepted: {acceptedCount}" counter
  - List of `<ProposalCard>` components — one per proposal
  - `<Button>` "Save accepted ({acceptedCount})" — at the bottom, disabled when `acceptedCount === 0` or `isSaving`, shows spinner when saving
- **Handled interactions**:
  - `onClick` on save button → calls `onSave()`
  - Passes through all proposal-level callbacks to `ProposalCard`
- **Validation**: None directly (delegated to ProposalCard and hook)
- **Types**: `FlashcardProposalViewModel[]`
- **Props**:
  ```typescript
  interface ProposalListProps {
    proposals: FlashcardProposalViewModel[];
    acceptedCount: number;
    isSaving: boolean;
    onAccept: (index: number) => void;
    onReject: (index: number) => void;
    onEditFront: (index: number, value: string) => void;
    onEditBack: (index: number, value: string) => void;
    onSave: () => void;
  }
  ```

### 4.4 ProposalCard

- **Description**: Controlled presentational component displaying a single flashcard proposal. Shows front/back content with inline editing capability. The proposal's data state (front, back, status) is fully managed by the parent; this component only holds local UI state for editing mode (`isEditingFront`, `isEditingBack`). Memoized with `React.memo()` for performance.
- **Main elements**:
  - `<Card>` (shadcn/ui) — wrapper with conditional styling based on status:
    - `'pending'`: default card styling
    - `'accepted'`: border-green-500/green accent, subtle green background tint
    - `'rejected'`: opacity-50, muted styling
  - Front section:
    - Display mode: text content + "Edit" button (`<Button variant="ghost">`). If front is empty, show a warning indicator (destructive border/icon) to signal invalid content.
    - Edit mode: `<Textarea>` with current value, `maxLength={500}`, character counter (0/500), blur to close
  - Back section:
    - Display mode: text content + "Edit" button. If back is empty, show a warning indicator (destructive border/icon) to signal invalid content.
    - Edit mode: `<Textarea>` with current value, `maxLength={2000}`, character counter (0/2000), blur to close
  - Action footer:
    - `'pending'` status: `<Button>` "Accept" (default variant) + `<Button>` "Reject" (outline/ghost variant)
    - `'accepted'` status: `<Button>` "Accepted ✓" (disabled/success style) + `<Button>` "Reject" (still available)
    - `'rejected'` status: `<Button>` "Accept" (to undo) + `<Button>` "Rejected" (disabled style)
- **Handled interactions**:
  - Click "Edit" on front → sets local `isEditingFront = true`, shows inline textarea
  - Change text in front textarea → calls `onEditFront(value)` (updates parent state)
  - Blur from front textarea → sets `isEditingFront = false`
  - Click "Edit" on back → sets local `isEditingBack = true`
  - Change text in back textarea → calls `onEditBack(value)` (updates parent state)
  - Blur from back textarea → sets `isEditingBack = false`
  - Click "Accept" → calls `onAccept()`
  - Click "Reject" → calls `onReject()`
- **Validation**:
  - Front: shows character counter during editing, highlights in destructive color if empty or > 500 chars
  - Back: shows character counter during editing, highlights in destructive color if empty or > 2000 chars
  - Validation is visual feedback only — actual validation before save happens in the hook
- **Types**: `FlashcardProposalViewModel`, `ProposalStatus`
- **Props**:
  ```typescript
  interface ProposalCardProps {
    proposal: FlashcardProposalViewModel;
    isDisabled: boolean;         // true when viewState === 'saving' — disables Accept/Reject/Edit buttons
    onAccept: () => void;
    onReject: () => void;
    onEditFront: (value: string) => void;
    onEditBack: (value: string) => void;
  }
  ```

## 5. Typy

### 5.1 Existing types (from `src/types.ts`) — reuse as-is

| Type | Fields | Usage |
|------|--------|-------|
| `FlashcardProposalDTO` | `{ front: string; back: string }` | API response proposal structure |
| `GenerationResponseDTO` | `{ generation_id: string; flashcards_proposals: FlashcardProposalDTO[]; generated_count: number }` | Response from POST /api/generations |
| `AcceptGenerationCommand` | `{ flashcards: FlashcardProposalDTO[] }` | Request body for POST /api/generations/:id/accept |
| `AcceptGenerationResponseDTO` | `{ flashcards: FlashcardDTO[]; accepted_count: number }` | Response from accept endpoint |
| `ErrorResponseDTO` | `{ error: { code: string; message: string } }` | Standard API error response |

### 5.2 New types (in `src/components/generation/types.ts`)

```typescript
/**
 * Status of a flashcard proposal during user review.
 * - 'pending': not yet reviewed by user
 * - 'accepted': user accepted the proposal for saving
 * - 'rejected': user rejected the proposal
 */
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

/**
 * ViewModel extending FlashcardProposalDTO with client-side review status.
 * Used by ProposalList and ProposalCard components.
 * The front/back fields may contain user-edited values.
 */
export interface FlashcardProposalViewModel {
  front: string;
  back: string;
  status: ProposalStatus;
}

/**
 * Represents the overall state of the generation view.
 * Controls which UI section is displayed.
 * - 'idle': initial state, only form visible
 * - 'generating': API call in progress, skeleton loading
 * - 'generated': proposals received and displayed
 * - 'saving': accepted proposals being saved
 * - 'error': generation failed (displayed as Alert in UI).
 *   Note: Save errors do NOT set this state — they use toast notifications
 *   and revert viewState to 'generated', keeping proposals visible.
 */
export type GenerateViewState = 'idle' | 'generating' | 'generated' | 'saving' | 'error';
```

### 5.3 Existing Zod schemas (from `src/lib/schemas/generation.schema.ts`) — reuse for client-side validation

| Schema | Validation rules | Usage |
|--------|-----------------|-------|
| `createGenerationSchema` | `source_text`: string, min 1000, max 10000 | Validate source text before generation |
| `acceptGenerationSchema` | `flashcards`: non-empty array of `{ front: 1-500 chars, back: 1-2000 chars }` | Validate accepted proposals before saving |

## 6. Zarzadzanie stanem

### Custom hook: `useGenerateFlashcards` (`src/hooks/useGenerateFlashcards.ts`)

This hook encapsulates all state management and API communication for the generation view, following the pattern established by `useFlashcards`. It manages the full lifecycle: source text → generation → proposal review → save.

Imports `{ toast } from "sonner"` for user feedback notifications (success/error toasts), following the same pattern as `useFlashcards.ts`.

#### State variables

| Variable | Type | Initial | Purpose |
|----------|------|---------|---------|
| `sourceText` | `string` | `""` | User-entered source text |
| `proposals` | `FlashcardProposalViewModel[]` | `[]` | List of AI proposals with review status |
| `generationId` | `string \| null` | `null` | ID from generation API (needed for accept endpoint) |
| `viewState` | `GenerateViewState` | `'idle'` | Controls overall UI state |
| `errorMessage` | `string \| null` | `null` | Error message to display in Alert |

#### Derived values

| Value | Derivation | Purpose |
|-------|-----------|---------|
| `acceptedCount` | `proposals.filter(p => p.status === 'accepted').length` | Displayed in UI, controls save button state |

#### Refs

| Ref | Type | Purpose |
|-----|------|---------|
| `abortControllerRef` | `AbortController \| null` | Cancels in-flight API requests on unmount or new generation |

#### Returned interface

```typescript
interface UseGenerateFlashcardsReturn {
  // State
  sourceText: string;
  proposals: FlashcardProposalViewModel[];
  generationId: string | null;
  viewState: GenerateViewState;
  errorMessage: string | null;
  acceptedCount: number;

  // Actions
  setSourceText: (text: string) => void;
  generate: () => Promise<void>;
  acceptProposal: (index: number) => void;
  rejectProposal: (index: number) => void;
  editProposalFront: (index: number, value: string) => void;
  editProposalBack: (index: number, value: string) => void;
  saveAccepted: () => Promise<void>;
}
```

#### Action details

**`setSourceText(text: string)`**
- Updates `sourceText` state
- Pure state setter, no side effects

**`generate()`**
1. Validate `sourceText` with `createGenerationSchema` — if invalid, set `errorMessage`, return
2. Cancel previous in-flight request via `abortControllerRef`
3. Set `viewState = 'generating'`, clear `errorMessage`, clear `proposals`
4. POST `/api/generations` with `{ source_text: sourceText }`, timeout 60s
5. On 401 → redirect to `/login`
6. On error → set `viewState = 'error'`, set `errorMessage` (mapped from API error code)
7. On success → map `flashcards_proposals` to `FlashcardProposalViewModel[]` (all with `status: 'pending'`), store `generation_id`, set `viewState = 'generated'`

**`acceptProposal(index: number)`**
- Updates `proposals[index].status` to `'accepted'`

**`rejectProposal(index: number)`**
- Updates `proposals[index].status` to `'rejected'`

**`editProposalFront(index: number, value: string)`**
- Updates `proposals[index].front` to `value`

**`editProposalBack(index: number, value: string)`**
- Updates `proposals[index].back` to `value`

**`saveAccepted()`**
1. Filter proposals with `status === 'accepted'`
2. Validate filtered proposals with `acceptGenerationSchema` — if invalid, show toast error, return
3. Set `viewState = 'saving'`
4. POST `/api/generations/{generationId}/accept` with `{ flashcards: [...] }`, timeout 10s
5. On 401 → redirect to `/login`
6. On 409 (ALREADY_FINALIZED) → toast error, set `viewState = 'generated'`
7. On other error → toast error, set `viewState = 'generated'`
8. On success → toast success "Saved {N} flashcards", redirect to `/flashcards`

#### Cleanup

- `useEffect` cleanup cancels in-flight requests via `abortControllerRef` on unmount

## 7. Integracja API

### 7.1 POST /api/generations — Generate flashcard proposals

| Aspect | Detail |
|--------|--------|
| **Endpoint** | `POST /api/generations` |
| **Request body** | `{ source_text: string }` (1000-10000 chars) |
| **Request type** | `CreateGenerationCommand` from `src/types.ts` |
| **Response 201** | `GenerationResponseDTO { generation_id, flashcards_proposals, generated_count }` |
| **Response 400** | `ErrorResponseDTO` with `VALIDATION_ERROR` |
| **Response 500** | `ErrorResponseDTO` with `INTERNAL_ERROR` |
| **Timeout** | 60 seconds (`AbortSignal.timeout(60_000)`) |
| **Headers** | `Content-Type: application/json` |
| **Credentials** | `credentials: "include"` (for cookies) |

### 7.2 POST /api/generations/:id/accept — Save accepted proposals

| Aspect | Detail |
|--------|--------|
| **Endpoint** | `POST /api/generations/{generationId}/accept` |
| **Request body** | `{ flashcards: Array<{ front: string, back: string }> }` |
| **Request type** | `AcceptGenerationCommand` from `src/types.ts` |
| **Response 201** | `AcceptGenerationResponseDTO { flashcards, accepted_count }` |
| **Response 400** | `ErrorResponseDTO` with `VALIDATION_ERROR` |
| **Response 404** | `ErrorResponseDTO` with `NOT_FOUND` |
| **Response 409** | `ErrorResponseDTO` with `ALREADY_FINALIZED` |
| **Response 500** | `ErrorResponseDTO` with `INTERNAL_ERROR` |
| **Timeout** | 10 seconds (`AbortSignal.timeout(10_000)`) |
| **Headers** | `Content-Type: application/json` |
| **Credentials** | `credentials: "include"` |

### 7.3 Fetch pattern

Following the established project pattern (see `useFlashcards.ts`):

```typescript
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  credentials: "include",
  signal: AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]),
});
```

Using `AbortSignal.any()` combines the component unmount abort signal with the timeout signal, matching the pattern used in `useFlashcards`.

## 8. Interakcje uzytkownika

### 8.1 Source text input

| Step | User action | System response |
|------|------------|-----------------|
| 1 | Types or pastes text into textarea | Character counter updates in real-time; validation error cleared on change |
| 2 | Blurs from textarea | If text is not empty and < 1000 chars, shows validation error |
| 3 | Text reaches 10000 chars | `maxLength` attribute prevents further input |

### 8.2 Flashcard generation

| Step | User action | System response |
|------|------------|-----------------|
| 1 | Clicks "Generate flashcards" | Client-side Zod validation of source text |
| 2 | (validation passes) | Button shows spinner + "Generating...", skeleton cards appear below |
| 3 | (API responds successfully) | Skeleton cards replaced with ProposalCards, button text changes to "Generate again" |
| 4 | (API responds with error) | Alert shown with error message and "Try again" button |

### 8.3 Proposal review

| Step | User action | System response |
|------|------------|-----------------|
| 1 | Clicks "Accept" on a proposal | Card gets green accent, button changes to "Accepted ✓", accepted counter increments |
| 2 | Clicks "Reject" on a proposal | Card dims (opacity-50), button changes to "Rejected", accepted counter decrements if was accepted |
| 3 | Clicks "Accept" on a rejected proposal | Reverses rejection — card returns to accepted state |
| 4 | Clicks "Reject" on an accepted proposal | Reverses acceptance — card becomes rejected |

### 8.4 Inline editing

| Step | User action | System response |
|------|------------|-----------------|
| 1 | Clicks "Edit" on front | Front text replaced with Textarea (pre-filled), character counter shown |
| 2 | Edits text in textarea | Parent state updated on each keystroke, counter updates |
| 3 | Blurs from textarea | Textarea closes, updated text displayed |

### 8.5 Saving accepted proposals

| Step | User action | System response |
|------|------------|-----------------|
| 1 | Clicks "Save accepted (N)" | Client-side validation of all accepted proposals |
| 2 | (validation passes) | Button shows spinner + "Saving...", all interaction disabled |
| 3 | (API responds successfully) | Toast "Saved N flashcards", redirect to `/flashcards` |
| 4 | (API responds with error) | Toast with error message, UI returns to generated state |

### 8.6 Regeneration

| Step | User action | System response |
|------|------------|-----------------|
| 1 | Modifies source text (optional) | Character counter updates |
| 2 | Clicks "Generate again" | Previous proposals cleared, new generation starts (same flow as 8.2) |

## 9. Warunki i walidacja

### 9.1 Source text validation (GenerationForm)

| Condition | Validation rule | When checked | UI effect |
|-----------|----------------|--------------|-----------|
| Text is empty | `source_text` is required | On submit | Error message below textarea: "Source text is required" |
| Text < 1000 chars | min 1000 characters | On blur + on submit | Error message: "Source text must be between 1000 and 10000 characters" |
| Text > 10000 chars | max 10000 characters | Prevented by `maxLength` | Character counter shows limit reached |
| Character counter | Display current/max | Continuously | Counter text changes to destructive color when < 1000 |

> **Note**: Empty textarea on blur intentionally does not show a validation error, to avoid prematurely flagging an untouched or cleared field. The "Source text is required" error is only shown on submit.

### 9.2 Proposal field validation (ProposalCard — visual only)

| Condition | Validation rule | When checked | UI effect |
|-----------|----------------|--------------|-----------|
| Front is empty | min 1 character | During inline editing (visual) | Counter in destructive color |
| Front > 500 chars | max 500 characters | During inline editing (visual) | Counter in destructive color, `maxLength` attribute |
| Back is empty | min 1 character | During inline editing (visual) | Counter in destructive color |
| Back > 2000 chars | max 2000 characters | During inline editing (visual) | Counter in destructive color, `maxLength` attribute |

### 9.3 Save validation (useGenerateFlashcards hook)

| Condition | Validation rule | When checked | UI effect |
|-----------|----------------|--------------|-----------|
| No accepted proposals | `acceptedCount === 0` | Continuously | Save button disabled |
| Accepted proposals have invalid fields | Zod `acceptGenerationSchema` | On save attempt | Toast error with validation message |
| Accepted front empty or > 500 | front: 1-500 chars | On save attempt | Toast error |
| Accepted back empty or > 2000 | back: 1-2000 chars | On save attempt | Toast error |

### 9.4 Button state conditions

| Button | Disabled when |
|--------|-------------|
| "Generate flashcards" | `viewState === 'generating'` OR `viewState === 'saving'` |
| "Save accepted (N)" | `acceptedCount === 0` OR `viewState === 'saving'` |
| "Try again" (error alert) | `viewState === 'generating'` |
| Proposal "Accept" / "Reject" | `viewState === 'saving'` |
| Proposal "Edit" buttons | `viewState === 'saving'` |

## 10. Obsluga bledow

### 10.1 Error scenarios and handling

| Error scenario | API response | User feedback | Recovery action |
|----------------|-------------|---------------|-----------------|
| Invalid source text (client) | N/A | Inline error below textarea | Fix text and retry |
| Invalid source text (server) | 400 `VALIDATION_ERROR` | Alert with error message | Fix text and retry |
| AI generation failure | 500 `INTERNAL_ERROR` | Alert: "Failed to generate flashcards. Please try again." | "Try again" button |
| AI service unavailable | 500 `INTERNAL_ERROR` | Alert: "An unexpected error occurred. Please try again." | "Try again" button |
| Generation timeout (60s) | AbortError | Alert: "Request timed out. Please try again." | "Try again" button |
| Network error during generation | TypeError/NetworkError | Alert: "Unable to connect to server. Please check your connection." | "Try again" button |
| Session expired (generation) | 401 | Toast: "Session expired" | Redirect to `/login` |
| Session expired (save) | 401 | Toast: "Session expired" | Redirect to `/login` |
| Generation not found (save) | 404 `NOT_FOUND` | Toast: "Generation session not found. Please generate new flashcards." | User regenerates |
| Already finalized (save) | 409 `ALREADY_FINALIZED` | Toast: "These flashcards have already been saved." | UI stays in generated state |
| Invalid proposals (save) | 400 `VALIDATION_ERROR` | Toast: "Some flashcards have invalid content. Please review and try again." | Fix content, retry save |
| Save failure | 500 `INTERNAL_ERROR` | Toast: "Failed to save flashcards. Please try again." | Retry save button |
| Save timeout (10s) | AbortError | Toast: "Request timed out. Please try again." | Retry save button |
| Component unmount during request | AbortError | None (silently ignored) | N/A |

### 10.2 Error message mapping

```typescript
const mapGenerationErrorToMessage = (code: string, status: number): string => {
  if (status === 401) return ""; // handled separately via redirect

  const messages: Record<string, string> = {
    VALIDATION_ERROR: "Invalid input. Please check your text and try again.",
    INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
  };

  return messages[code] || "An unexpected error occurred. Please try again.";
};

const mapAcceptErrorToMessage = (code: string): string => {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: "Some flashcards have invalid content. Please review and try again.",
    NOT_FOUND: "Generation session not found. Please generate new flashcards.",
    ALREADY_FINALIZED: "These flashcards have already been saved.",
    INTERNAL_ERROR: "Failed to save flashcards. Please try again.",
  };

  return messages[code] || "An unexpected error occurred. Please try again.";
};
```

### 10.3 Timeout and network error handling

Following the existing project pattern (`useFlashcards.ts`):

> **Note on `AbortSignal.any()` behavior**: When combining signals via `AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)])`, each signal preserves its native error type. `controller.abort()` (component unmount) throws `AbortError`, while `AbortSignal.timeout()` throws `TimeoutError`. This allows the catch block below to distinguish between the two cases reliably.

```typescript
// In the catch block:
if (err instanceof Error && err.name === "AbortError") {
  // Component unmount — silently ignore
  return;
}

// DOMException for timeout
if (err instanceof DOMException && err.name === "TimeoutError") {
  setErrorMessage("Request timed out. Please try again.");
  setViewState("error");
  return;
}

// Network error
if (err instanceof TypeError) {
  setErrorMessage("Unable to connect to server. Please check your connection.");
  setViewState("error");
  return;
}
```

## 11. Kroki implementacji

### Step 1: Create generation feature types

**File**: `src/components/generation/types.ts`

Define `ProposalStatus`, `FlashcardProposalViewModel`, and `GenerateViewState` types as described in section 5.2.

### Step 2: Create the `useGenerateFlashcards` custom hook

**File**: `src/hooks/useGenerateFlashcards.ts`

Implement the hook as described in section 6:
- State variables: `sourceText`, `proposals`, `generationId`, `viewState`, `errorMessage`
- Derived: `acceptedCount` via `useMemo`
- Actions: `setSourceText`, `generate`, `acceptProposal`, `rejectProposal`, `editProposalFront`, `editProposalBack`, `saveAccepted`
- Use `useCallback` for all action functions
- Use `useRef` for `AbortController`
- Cleanup effect for aborting in-flight requests on unmount
- Follow fetch pattern from `useFlashcards.ts` (AbortSignal.any, credentials, error mapping)

### Step 3: Create the ProposalCard component

**File**: `src/components/generation/ProposalCard.tsx`

- Build as a controlled component wrapped with `React.memo()`
- Implement front/back display with inline editing toggle
- Use local `useState` only for `isEditingFront` and `isEditingBack`
- Add character counters during editing mode
- Style card based on proposal status (green for accepted, dimmed for rejected)
- Wire Accept/Reject buttons to parent callbacks

### Step 4: Create the ProposalList component

**File**: `src/components/generation/ProposalList.tsx`

- Render header with proposal count and accepted count
- Map proposals to `ProposalCard` components, passing callbacks with bound index
- Render "Save accepted (N)" button at the bottom
- Use `aria-live="polite"` on the accepted counter for screen reader updates

### Step 5: Create the GenerationForm component

**File**: `src/components/generation/GenerationForm.tsx`

- Implement `<Textarea>` with `maxLength={10000}`
- Add character counter with conditional destructive styling when < 1000
- Implement blur validation using `createGenerationSchema.shape.source_text`
- Clear error on change
- Render button with dynamic text ("Generate flashcards" vs "Generate again") and spinner

### Step 6: Create the GenerateView container component

**File**: `src/components/generation/GenerateView.tsx`

- Wire `useGenerateFlashcards` hook
- Render `<h1>` page header
- Render `<GenerationForm>` with hook state/actions
- Conditionally render based on `viewState`:
  - `'generating'`: 6 `<Skeleton>` cards in a grid
  - `'error'`: `<Alert variant="destructive">` with error message and "Try again" button
  - `'generated'` / `'saving'`: `<ProposalList>` with proposals and actions
- Use `<div aria-live="polite">` wrapper around the dynamic content area

### Step 7: Update the Astro page

**File**: `src/pages/generate.astro`

- Replace the current placeholder content with `<GenerateView client:load />`
- Keep the existing `AppLayout` wrapper with `currentPath="/generate"`
- Import `GenerateView` from `../components/generation/GenerateView`

### Step 8: Verify and test manually

- Test the complete flow: paste text → generate → review → accept/reject → edit → save → redirect
- Test error scenarios: empty text, short text, network error, timeout
- Test responsive layout on mobile breakpoints
- Test keyboard navigation and screen reader compatibility
- Test 401 handling (expired session)
- Test "Generate again" flow
- Verify character counters and validation messages
