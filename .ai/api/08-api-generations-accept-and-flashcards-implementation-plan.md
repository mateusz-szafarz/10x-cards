# Implementation Plan: Generations Accept & Flashcards API Endpoints

## Overview

This document outlines the implementation plan for the remaining API endpoints required to complete the flashcard
management and AI generation acceptance functionality.

**Endpoints to Implement:**

- `POST /api/generations/:id/accept` - Accept and save selected AI-generated flashcards
- `GET /api/flashcards` - List user's flashcards with pagination and filtering
- `GET /api/flashcards/:id` - Get a single flashcard by ID
- `POST /api/flashcards` - Create a manual flashcard
- `PUT /api/flashcards/:id` - Update an existing flashcard
- `DELETE /api/flashcards/:id` - Delete a flashcard

**Related Documentation:**

- High-level API plan: `.ai/api/02-high-level-api-plan.md`
- Auth guide: `.claude/on-demand-rules/auth-guide-for-new-api-endpoints.md`
- PRD: `.ai/prd.md`

---

## Architecture Overview

### New Files to Create

```
src/
├── pages/api/
│   ├── flashcards/
│   │   ├── index.ts                    # GET, POST /api/flashcards
│   │   └── [id].ts                     # GET, PUT, DELETE /api/flashcards/:id
│   └── generations/
│       └── [id]/
│           └── accept.ts               # POST /api/generations/:id/accept
├── lib/
│   ├── services/
│   │   └── flashcard.service.ts        # FlashcardService (new)
│   └── schemas/
│       └── flashcard.schema.ts         # Zod schemas for flashcards (new)
└── db/
    └── rpc/
        └── accept-generation.sql       # RPC function for transactional accept (new)

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_add_accept_generation_rpc.sql  # New migration
```

### Existing Files to Modify

```
src/
├── lib/
│   ├── utils.ts                        # Add validateUUID(), buildPaginationMetadata()
│   ├── services/
│   │   └── generation.service.ts       # Add acceptFlashcards() method
│   └── schemas/
│       └── generation.schema.ts        # Add acceptGenerationSchema
```

---

## Database Changes

### 1. RPC Function for Transactional Accept

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_accept_generation_rpc.sql`

**Purpose:** Ensure atomicity when accepting flashcards - both INSERT flashcards and UPDATE generation_session must
succeed or both fail.

**Function Signature:**

```sql
create
or replace function accept_generation(
  p_generation_id uuid,
  p_user_id uuid,
  p_flashcards jsonb
) returns jsonb
```

**Business Logic:**

1. Verify generation session exists and belongs to user (404 if not)
2. Verify session not already finalized (`accepted_count IS NULL`) (409 if finalized)
3. Insert all flashcards in bulk
4. Update `generation_sessions.accepted_count`
5. Return created flashcards with IDs

**Error Handling:**

- Return JSON with error codes that match API spec:
    - `NOT_FOUND` - generation session not found
    - `ALREADY_FINALIZED` - session already finalized
    - Any SQL error wrapped as `INTERNAL_ERROR`

**Implementation Details:**

- Use `SECURITY DEFINER` or rely on RLS policies (prefer RLS)
- Validate input: `p_flashcards` must be array of objects with `front` and `back`
- Set `source = 'ai_generated'` and `generation_id = p_generation_id` for all inserted flashcards
- Return array of created flashcards with all fields (id, front, back, source, generation_id, created_at, updated_at)

---

## Utility Functions

### File: `src/lib/utils.ts`

#### 1. `validateUUID(id: string): boolean`

Validates if a string is a valid UUID v4.

**Implementation:**

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}
```

**Usage:** Validate path parameters (`:id`) before database queries.

#### 2. `buildPaginationMetadata(page: number, limit: number, total: number): PaginationDTO`

Calculates pagination metadata.

**Implementation:**

```typescript
export function buildPaginationMetadata(
  page: number,
  limit: number,
  total: number
): PaginationDTO {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}
```

**Usage:** Used in GET /api/flashcards and future list endpoints.

---

## Zod Schemas

### File: `src/lib/schemas/flashcard.schema.ts` (NEW)

```typescript
import { z } from "zod";

/**
 * Schema for creating a manual flashcard.
 * POST /api/flashcards
 */
export const createFlashcardSchema = z.object({
  front: z
    .string({ required_error: "Front is required" })
    .min(1, "Front must be between 1 and 500 characters")
    .max(500, "Front must be between 1 and 500 characters"),
  back: z
    .string({ required_error: "Back is required" })
    .min(1, "Back must be between 1 and 2000 characters")
    .max(2000, "Back must be between 1 and 2000 characters"),
});

/**
 * Schema for updating a flashcard.
 * PUT /api/flashcards/:id
 *
 * Same validation as createFlashcardSchema.
 */
export const updateFlashcardSchema = createFlashcardSchema;

/**
 * Schema for flashcards query parameters.
 * GET /api/flashcards
 */
export const flashcardsQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(["ai_generated", "manual"]).optional(),
  sort: z.enum(["created_at", "updated_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;
export type FlashcardsQueryParamsInput = z.infer<typeof flashcardsQueryParamsSchema>;
```

### File: `src/lib/schemas/generation.schema.ts` (MODIFY)

Add schema for accepting flashcards:

```typescript
/**
 * Schema for accepting generated flashcard proposals.
 * POST /api/generations/:id/accept
 */
export const acceptGenerationSchema = z.object({
    flashcards: z
      .array(
        z.object({
          front: z
            .string({ required_error: "Front is required" })
            .min(1, "Front must be between 1 and 500 characters")
            .max(500, "Front must be between 1 and 500 characters"),
          back: z
            .string({ required_error: "Back is required" })
            .min(1, "Back must be between 1 and 2000 characters")
            .max(2000, "Back must be between 1 and 2000 characters"),
        })
      )
      .nonempty("Flashcards array cannot be empty"),
  });

export type AcceptGenerationInput = z.infer<typeof acceptGenerationSchema>;
```

---

## Services

### File: `src/lib/services/flashcard.service.ts` (NEW)

Service responsible for flashcard CRUD operations.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type {
  FlashcardDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  FlashcardsListDTO,
  FlashcardsQueryParams,
} from "../../types";
import { buildPaginationMetadata } from "../utils";

export class FlashcardService {
  constructor(private readonly supabase: SupabaseClient<Database>) {
  }

  /**
   * Creates a manual flashcard.
   */
  async createFlashcard(
    command: CreateFlashcardCommand,
    userId: string
  ): Promise<FlashcardDTO> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .insert({
        front: command.front,
        back: command.back,
        user_id: userId,
        source: "manual",
        generation_id: null,
      })
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Updates an existing flashcard.
   */
  async updateFlashcard(
    id: string,
    command: UpdateFlashcardCommand,
    userId: string
  ): Promise<FlashcardDTO | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .update({
        front: command.front,
        back: command.back,
      })
      .eq("id", id)
      .eq("user_id", userId) // Explicit filter + RLS
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned (not found or no access)
        return null;
      }
      throw new Error(`Failed to update flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Deletes a flashcard.
   */
  async deleteFlashcard(id: string, userId: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("flashcards")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId); // Explicit filter + RLS

    if (error) {
      throw new Error(`Failed to delete flashcard: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  /**
   * Gets a single flashcard by ID.
   */
  async getFlashcardById(id: string, userId: string): Promise<FlashcardDTO | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", userId) // Explicit filter + RLS
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Lists flashcards with pagination and filtering.
   */
  async listFlashcards(
    params: FlashcardsQueryParams,
    userId: string
  ): Promise<FlashcardsListDTO> {
    const { page = 1, limit = 20, source, sort = "created_at", order = "desc" } = params;

    // Calculate offset for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with dynamic filtering and sorting
    let query = this.supabase
      .from("flashcards")
      .select("id, front, back, source, generation_id, created_at, updated_at", {
        count: "exact",
      })
      .eq("user_id", userId); // Explicit filter + RLS

    // Optional source filter
    if (source) {
      query = query.eq("source", source);
    }

    // Sorting
    query = query.order(sort, { ascending: order === "asc" });

    // Pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list flashcards: ${error.message}`);
    }

    return {
      flashcards: data ?? [],
      pagination: buildPaginationMetadata(page, limit, count ?? 0),
    };
  }
}
```

### File: `src/lib/services/generation.service.ts` (MODIFY)

Add method for accepting flashcards:

```typescript
/**
 * Accepts selected flashcard proposals and saves them to the database.
 * Uses RPC function to ensure transactional consistency.
 *
 * @param generationId - The generation session ID
 * @param flashcards - Array of flashcard proposals to accept
 * @param userId - The user ID
 * @returns AcceptGenerationResponseDTO with created flashcards
 * @throws Error with specific codes: NOT_FOUND, ALREADY_FINALIZED, INTERNAL_ERROR
 */
async
acceptFlashcards(
  generationId
:
string,
  flashcards
:
FlashcardProposalDTO[],
  userId
:
string
):
Promise < AcceptGenerationResponseDTO > {
  // Call RPC function for transactional accept
  const { data, error } = await this.supabase.rpc("accept_generation", {
    p_generation_id: generationId,
    p_user_id: userId,
    p_flashcards: flashcards,
  });

  if(error) {
    // Parse error from RPC function
    // RPC should return structured errors
    throw new Error(error.message);
  }

  // RPC returns object with structure: { flashcards: [], accepted_count: number }
  // Or error object: { error: { code: string, message: string } }
  if(data && 'error' in data
)
{
  const err = data.error as { code: string; message: string };
  const error = new Error(err.message) as Error & { code: string };
  error.code = err.code;
  throw error;
}

return {
  flashcards: data.flashcards,
  accepted_count: data.accepted_count,
};
}
```

---

## API Endpoints Implementation

### 1. POST /api/generations/:id/accept

**File:** `src/pages/api/generations/[id]/accept.ts`

**Purpose:** Accept selected flashcard proposals from an AI generation session.

**Implementation:**

```typescript
import type { APIRoute } from "astro";
import { acceptGenerationSchema } from "../../../../lib/schemas/generation.schema";
import { GenerationService } from "../../../../lib/services/generation.service";
import { MockAIService } from "../../../../lib/services/ai.service";
import { validateUUID } from "../../../../lib/utils";
import type { AcceptGenerationResponseDTO, ErrorResponseDTO } from "../../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  // Extract generation ID from path
  const generationId = params.id;

  // Validate UUID format
  if (!generationId || !validateUUID(generationId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid generation ID format",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate input using Zod schema
  const validationResult = acceptGenerationSchema.safeParse(body);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Validation failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get dependencies
  const supabase = locals.supabase;
  const aiService = new MockAIService(); // Not used here, but required for service
  const generationService = new GenerationService(supabase, aiService);

  // Accept flashcards
  try {
    const result = await generationService.acceptFlashcards(
      generationId,
      validationResult.data.flashcards,
      locals.user!.id
    );

    return new Response(JSON.stringify(result satisfies AcceptGenerationResponseDTO), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as Error & { code: string }).code;

      if (errorCode === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Generation session not found",
            },
          } satisfies ErrorResponseDTO),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      if (errorCode === "ALREADY_FINALIZED") {
        return new Response(
          JSON.stringify({
            error: {
              code: "ALREADY_FINALIZED",
              message: "Generation session has already been finalized",
            },
          } satisfies ErrorResponseDTO),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
    console.error("Accept generation error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to save flashcards",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

---

### 2. GET & POST /api/flashcards

**File:** `src/pages/api/flashcards/index.ts`

**Purpose:**

- GET: List user's flashcards with pagination and filtering
- POST: Create a manual flashcard

**Implementation:**

```typescript
import type { APIRoute } from "astro";
import {
  createFlashcardSchema,
  flashcardsQueryParamsSchema,
} from "../../../lib/schemas/flashcard.schema";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import type {
  FlashcardDTO,
  FlashcardsListDTO,
  ErrorResponseDTO,
} from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards
 *
 * Lists user's flashcards with pagination and optional filtering.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  // Parse and validate query parameters
  const params = {
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
    source: url.searchParams.get("source"),
    sort: url.searchParams.get("sort"),
    order: url.searchParams.get("order"),
  };

  const validationResult = flashcardsQueryParamsSchema.safeParse(params);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Invalid pagination parameters",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get flashcards from service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const result = await flashcardService.listFlashcards(
      validationResult.data,
      locals.user!.id
    );

    return new Response(JSON.stringify(result satisfies FlashcardsListDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List flashcards error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch flashcards",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * POST /api/flashcards
 *
 * Creates a new manual flashcard.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate input using Zod schema
  const validationResult = createFlashcardSchema.safeParse(body);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Validation failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create flashcard via service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const result = await flashcardService.createFlashcard(
      validationResult.data,
      locals.user!.id
    );

    return new Response(JSON.stringify(result satisfies FlashcardDTO), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create flashcard error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create flashcard",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

---

### 3. GET, PUT, DELETE /api/flashcards/:id

**File:** `src/pages/api/flashcards/[id].ts`

**Purpose:** Get, update, or delete a specific flashcard by ID.

**Implementation:**

```typescript
import type { APIRoute } from "astro";
import { updateFlashcardSchema } from "../../../lib/schemas/flashcard.schema";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { validateUUID } from "../../../lib/utils";
import type { FlashcardDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards/:id
 *
 * Retrieves a single flashcard by ID.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const flashcardId = params.id;

  // Validate UUID format
  if (!flashcardId || !validateUUID(flashcardId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid flashcard ID format",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get flashcard from service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const flashcard = await flashcardService.getFlashcardById(
      flashcardId,
      locals.user!.id
    );

    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found",
          },
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(flashcard satisfies FlashcardDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get flashcard error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch flashcard",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * PUT /api/flashcards/:id
 *
 * Updates an existing flashcard.
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const flashcardId = params.id;

  // Validate UUID format
  if (!flashcardId || !validateUUID(flashcardId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid flashcard ID format",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate input using Zod schema
  const validationResult = updateFlashcardSchema.safeParse(body);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Validation failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Update flashcard via service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const flashcard = await flashcardService.updateFlashcard(
      flashcardId,
      validationResult.data,
      locals.user!.id
    );

    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found",
          },
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(flashcard satisfies FlashcardDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Update flashcard error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update flashcard",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * DELETE /api/flashcards/:id
 *
 * Deletes a flashcard permanently.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const flashcardId = params.id;

  // Validate UUID format
  if (!flashcardId || !validateUUID(flashcardId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid flashcard ID format",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Delete flashcard via service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const deleted = await flashcardService.deleteFlashcard(
      flashcardId,
      locals.user!.id
    );

    if (!deleted) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found",
          },
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete flashcard error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete flashcard",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

---

## Implementation Order

### Phase 1: Foundation (Database & Utilities)

1. Create database migration for RPC function (`accept_generation`)
2. Run migration on local Supabase
3. Add utility functions to `src/lib/utils.ts`:
    - `validateUUID()`
    - `buildPaginationMetadata()`

### Phase 2: Schemas

4. Create `src/lib/schemas/flashcard.schema.ts` with:
    - `createFlashcardSchema`
    - `updateFlashcardSchema`
    - `flashcardsQueryParamsSchema`
5. Add `acceptGenerationSchema` to `src/lib/schemas/generation.schema.ts`

### Phase 3: Services

6. Create `src/lib/services/flashcard.service.ts` with complete FlashcardService class
7. Add `acceptFlashcards()` method to `src/lib/services/generation.service.ts`

### Phase 4: API Endpoints (Flashcards CRUD)

8. Implement `src/pages/api/flashcards/index.ts` (GET, POST)
9. Implement `src/pages/api/flashcards/[id].ts` (GET, PUT, DELETE)

### Phase 5: API Endpoints (Generation Accept)

10. Implement `src/pages/api/generations/[id]/accept.ts` (POST)

---

## Testing Strategy

**Note:** Automated tests are out of scope for this task.

---

## Security Considerations

### Authentication & Authorization

- ✅ All endpoints are protected by middleware (automatic 401 for unauthenticated requests)
- ✅ All database queries use explicit `user_id` filter (`eq('user_id', userId)`)
- ✅ RLS policies provide defense in depth (safety net)
- ✅ Users cannot access other users' data (test with multiple accounts)

### Input Validation

- ✅ All inputs validated with Zod schemas before processing
- ✅ UUID format validated before database queries
- ✅ Character limits enforced (front: 1-500, back: 1-2000)
- ✅ Pagination parameters validated (page > 0, limit 1-100)

### Database Security

- ✅ RPC function for accept endpoint ensures transactionality
- ✅ No SQL injection possible (using Supabase query builder)
- ✅ Proper error handling without leaking sensitive information

### Error Handling

- ✅ All errors follow consistent `ErrorResponseDTO` format
- ✅ Never leak internal error details to client
- ✅ Log detailed errors server-side for debugging
- ✅ Use `satisfies ErrorResponseDTO` for type safety

---

## Future Enhancements (Out of Scope)

These items are explicitly **not** included in this implementation plan:

1. **Rate Limiting:** Add rate limiting middleware for flashcard operations
2. **Automated Tests:** Unit tests for services, integration tests for endpoints
3. **Spaced Repetition:** Add SRS-related columns and logic to flashcards table
4. **Bulk Operations:** Endpoints for bulk create/update/delete
5. **Search:** Full-text search across flashcard content
6. **Analytics:** Endpoints for usage statistics and acceptance rates
7. **Export/Import:** Endpoints for exporting flashcards to various formats

---

## References

- **Database Schema:** `supabase/migrations/20260106122326_initial_schema.sql`
- **Type Definitions:** `src/types.ts`
- **Existing Endpoints:**
    - `src/pages/api/auth/register.ts` (example of best practices)
    - `src/pages/api/generations/index.ts` (example service usage)

---

## Summary

This implementation plan provides a complete, step-by-step guide to implementing the remaining API endpoints for the
flashcard management system. The plan emphasizes:

1. **Transactionality** through PostgreSQL RPC function
2. **Type safety** with Zod schemas and TypeScript
3. **Security** with explicit filters, RLS, and input validation
4. **Maintainability** with service layer abstraction
5. **Consistency** with existing codebase patterns

The implementation follows established patterns from existing endpoints and adheres to Astro, Supabase, and TypeScript
best practices.
