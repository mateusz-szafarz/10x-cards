# Prompt: Add `search` query parameter to GET /api/flashcards

## Task

Add text search functionality to the existing `GET /api/flashcards` endpoint. The `search` parameter should perform case-insensitive partial matching against `front` and `back` fields of flashcards (PostgreSQL `ILIKE`). A flashcard matches if either its `front` or `back` contains the search phrase.

This is a backend-only change spanning 4 layers: Zod schema, TypeScript types, service, and API endpoint. Additionally, extend the existing IntelliJ HTTP Client test scenario to cover search functionality.

## Context

The "My Flashcards" UI view (`/flashcards`) requires server-side search to enable debounced text search with pagination. The current backend implementation supports `page`, `limit`, `source`, `sort`, and `order` query parameters, but does **not** support `search`. This task fills that gap.

## Reference Files

### Files to modify:
1. @src/lib/schemas/flashcard.schema.ts — Zod validation schema for query params
2. @src/types.ts — `FlashcardsQueryParams` interface (shared types)
3. @src/lib/services/flashcard.service.ts — `listFlashcards` method (Supabase query builder)
4. @src/pages/api/flashcards/index.ts — GET handler (parse `search` from URL)
5. @.http/scenarios/func/02-flashcards-list-and-filters.http — HTTP Client test scenario

### Files for reference (read-only, do not modify):
- @src/db/database.types.ts — Database schema (flashcards table: `front: string`, `back: string`)
- @src/lib/utils.ts — Existing utilities (`buildPaginationMetadata`)
- @.claude/rules/backend.md — Backend coding rules

## Requirements

### 1. Schema Layer (`flashcard.schema.ts`)

Add an optional `search` field to `flashcardsQueryParamsSchema`:
- Type: `string`
- Optional (absence means no text filtering)
- Trimmed (strip leading/trailing whitespace)
- Maximum length: 200 characters
- Empty strings after trimming should be treated as absent (use `.transform` to convert `""` → `undefined`)

### 2. Types Layer (`types.ts`)

Add `search?: string` to `FlashcardsQueryParams` interface to keep it in sync with the Zod schema.

### 3. Service Layer (`flashcard.service.ts`)

In `listFlashcards` method:
- Destructure `search` from `params` alongside existing fields
- When `search` is provided (non-undefined), add a Supabase `or` filter with `ilike` on both `front` and `back` columns
- Escape `%` and `_` characters in the search string before embedding in the `ilike` pattern (these are PostgreSQL wildcard characters in LIKE/ILIKE expressions). Create a private standalone function `escapeIlikePattern(str: string): string` in `flashcard.service.ts`, outside the class, as it's specific to this service
- The filter should use a template literal: `.or(\`front.ilike.%${escapedSearch}%,back.ilike.%${escapedSearch}%\`)`
- Add the `.or()` filter after the existing optional `source` filter and before the `.order()` call
- The `search` filter must compose correctly with the existing optional `source` filter (both should apply when present)
- Note: Supabase PostgREST automatically parameterizes queries, so SQL injection is not a concern here. The escaping is only needed for ILIKE wildcard characters (`%` and `_`)

### 4. Endpoint Layer (`index.ts`)

In the GET handler:
- Parse `search` from `url.searchParams` the same way as existing params (with `?? undefined` for null-to-undefined conversion)
- Update the JSDoc comment to include `search` in the list of query parameters
- No other changes needed — the Zod schema and service handle the rest

### 5. HTTP Client Test Scenario (`02-flashcards-list-and-filters.http`)

Add a new **PHASE 8: TEST SEARCH** section after the existing Phase 7. Follow the exact formatting conventions visible in the existing file (phase header comments, `@name` annotations, handler scripts with `client.test` and `client.assert`, `console.log` messages).

Test cases to add:

1. **Search by exact word in `front`** — Search for `"React"` → expect exactly 1 result — the manual flashcard "What is React?"
2. **Search by word present only in `back`** — Search for `"programming language"` → expect exactly 1 result — the TypeScript flashcard (whose back says "strongly typed programming language")
3. **Search with no results** — Search for `"nonexistent_xyz_query"` → should return 0 flashcards with pagination total=0
4. **Search combined with source filter** — Search for `"React"` with `source=manual` → should return exactly 1 result (the manual "What is React?" flashcard), verifying that both search and source filters narrow down results together
5. **Search combined with pagination** — Search for `"What"` with `limit=1&page=1` → should return exactly 1 item with pagination total=5 (all flashcards contain "What" in their front)
6. **Search with empty string** — Search for `""` (empty) → should behave the same as no search parameter (return all flashcards), verifying the empty-to-undefined transform
7. **Search exceeding max length** — Search with a string longer than 200 characters → should return 400 with VALIDATION_ERROR

Update the final summary `console.log` block to include search in the list of tested features.

## Constraints

- Follow existing code patterns (early returns, guard clauses, explicit error handling)
- The `search` filter must work correctly in combination with all existing filters (`source`, `sort`, `order`, pagination)
- Use Supabase's `.or()` method for combining `front` and `back` ilike conditions
- Maintain backward compatibility — existing requests without `search` must behave identically
