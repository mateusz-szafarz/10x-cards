# OpenRouter Service Implementation Guide

## 1. Service Overview

The `OpenRouterService` is a production implementation of the `AIService` interface that communicates with the
OpenRouter API to generate flashcard proposals based on user-provided text. This service replaces the `MockAIService`
stub currently used in the project.

### Purpose

- Accept source text (1,000-10,000 characters) from users
- Send structured prompts to LLM models via OpenRouter API
- Parse and validate AI-generated flashcard proposals
- Return typed `FlashcardProposalDTO[]` for frontend consumption
- Handle errors gracefully with user-friendly messages

### Key Characteristics

- **Technology**: TypeScript 5, native Fetch API
- **API Provider**: OpenRouter.ai
- **Model**: `google/gemma-3-27b-it:free` (supports structured output)
- **Response Format**: Structured JSON via `response_format` with JSON schema
- **Error Handling**: Comprehensive with retry logic for transient failures
- **Type Safety**: Runtime validation using Zod schemas

---

## 2. Constructor Description

The constructor initializes the service with configuration and validates required environment variables.

```typescript
constructor(config: OpenRouterConfig)
```

### Constructor Parameters

**`OpenRouterConfig` interface** (defined in `src/types.ts`):

```typescript
interface OpenRouterConfig {
  apiKey: string;           // OpenRouter API key from environment
  baseUrl?: string;         // API endpoint (default: 'https://openrouter.ai/api/v1')
  modelName?: string;       // Model identifier (default: 'google/gemma-3-27b-it:free')
  timeout?: number;         // Request timeout in ms (default: 30000)
  maxRetries?: number;      // Retry attempts for transient errors (default: 2)
  httpReferer?: string;     // HTTP-Referer header for OpenRouter analytics (optional)
  appTitle?: string;        // X-Title header for OpenRouter analytics (optional)
}
```

### Constructor Responsibilities

1. Validate that `apiKey` is provided and non-empty
2. Set default values for optional parameters
3. Initialize internal state (retry counter, abort controller factory)
4. Throw descriptive error if configuration is invalid

### Example Initialization

```typescript
const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: import.meta.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  modelName: 'google/gemma-3-27b-it:free',
  timeout: 30000,
  maxRetries: 2,
  httpReferer: import.meta.env.PUBLIC_SITE_URL,
  appTitle: import.meta.env.PUBLIC_APP_NAME || '10x-cards'
});
```

---

## 3. Public Methods and Fields

### 3.1 `get modelName(): string`

**Purpose**: Getter property that returns the model name used by this service instance. Required by `AIService`
interface.

**Return Type**: `string`

**Usage**: Allows `GenerationService` to access model name for database persistence without tight coupling.

### 3.2 `generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]>`

**Purpose**: Main method that implements the `AIService` interface. Generates flashcard proposals from source text.

**Input Validation:**

- NO validation in service layer - trust that input was validated by Zod schema in API endpoint
- Service is dependency-agnostic and assumes valid input

**Process Flow:**

1. Construct request payload (messages, response_format, model parameters)
2. Execute HTTP request with timeout and retry logic
3. Parse and validate response using Zod schema
4. Transform API response to `FlashcardProposalDTO[]`
5. Return typed flashcard proposals

**Return Type**: `Promise<FlashcardProposalDTO[]>`

**Error Handling**: Throws custom error classes (see Section 5)

---

## 4. Private Methods and Fields

### 4.1 Private Fields

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly _modelName: string;
private readonly timeout: number;
private readonly maxRetries: number;
private readonly httpReferer?: string;
private readonly appTitle?: string;
```

### 4.2 `private buildRequestPayload(sourceText: string): OpenRouterRequest`

**Purpose**: Constructs the OpenRouter API request payload with proper structure.

**Returns** (`OpenRouterRequest` interface defined in `src/types.ts`):

```typescript
interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  response_format: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  };
  temperature: number;
  max_tokens: number;
  top_p: number;
}
```

**System Message Example:**

```typescript
{
  role: 'system',
  content: `You are an expert educational content creator specializing in creating high-quality flashcards for spaced repetition learning. Your goal is to extract key concepts from the provided text and transform them into clear, concise question-answer pairs that facilitate effective learning.

Guidelines:
- Focus each flashcard on a single concept or fact
- Write clear, specific questions that aren't ambiguous
- Provide complete, accurate answers
- Avoid simple yes/no questions when possible
- Cover different cognitive levels: definitions, applications, relationships, examples
- Ensure questions are self-contained (don't reference "the text" or "above")
- Generate between 4 and 8 flashcards based on content richness`
}
```

**User Message Example:**

```typescript
{
  role: 'user',
  content: `Based on the following text, generate flashcards following the guidelines provided.

Text:
${sourceText}`
}
```

**Response Format Schema:**

```typescript
response_format: {
  type: 'json_schema',
  json_schema: {
    name: 'flashcard_proposals',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          description: 'Array of generated flashcard proposals',
          items: {
            type: 'object',
            properties: {
              front: {
                type: 'string',
                description: 'The question or prompt for the flashcard'
              },
              back: {
                type: 'string',
                description: 'The answer or explanation for the flashcard'
              }
            },
            required: ['front', 'back'],
            additionalProperties: false
          },
          minItems: 4,
          maxItems: 8
        }
      },
      required: ['flashcards'],
      additionalProperties: false
    }
  }
}
```

**Model Parameters:**

```typescript
temperature: 0.4,      // Lower temperature for more consistent, focused outputs
max_tokens: 2000,      // Sufficient for 8 flashcards with detailed content
top_p: 1.0,            // Use full probability distribution
```

### 4.3 `private async executeRequest(payload: OpenRouterRequest, retryCount: number = 0): Promise<OpenRouterResponse>`

**Purpose**: Executes HTTP request with timeout and retry logic.

**Implementation Details:**

1. Create `AbortController` for timeout management
2. Set timeout using `setTimeout` to call `controller.abort()`
3. Execute fetch with headers:
   ```typescript
   {
     'Authorization': `Bearer ${this.apiKey}`,
     'Content-Type': 'application/json',
     'HTTP-Referer': this.httpReferer || '',  // From PUBLIC_SITE_URL env var
     'X-Title': this.appTitle || '10x-cards'  // From PUBLIC_APP_NAME env var
   }
   ```
4. Handle response based on status code
5. Parse `Retry-After` header for rate limiting (if present)
6. Implement retry logic for transient failures (429, 500+)
7. Parse JSON response
8. Distinguish between timeout and network errors using `error.name`

**Retry Strategy:**

- Retry on status codes: 429 (rate limit), 500, 502, 503, 504
- Exponential backoff: wait `Math.pow(2, retryCount) * 1000` ms before retry
- If `Retry-After` header present, use that value (capped at MAX_RETRY_WAIT)
- **MAX_RETRY_WAIT**: 10000ms (10 seconds) - prevents indefinite waiting
- If retry wait time exceeds MAX_RETRY_WAIT, throw error immediately without retry
- Max retries from config (default: 2)

**Retry-After Handling:**

```typescript
const MAX_RETRY_WAIT = 10000; // 10 seconds maximum

const retryAfterHeader = response.headers.get('Retry-After');
let waitTime = Math.pow(2, retryCount) * 1000; // Default exponential backoff

if (retryAfterHeader) {
  const retryAfterSeconds = parseInt(retryAfterHeader, 10);
  waitTime = retryAfterSeconds * 1000;
}

// Cap wait time to prevent indefinite blocking
if (waitTime > MAX_RETRY_WAIT) {
  throw new RateLimitError(
    `Rate limit exceeded. Retry after ${Math.ceil(waitTime/1000)}s exceeds maximum wait time.`,
    Math.ceil(waitTime/1000)
  );
}

console.warn(`[OpenRouter] Retry attempt ${retryCount + 1}/${this.maxRetries} after ${waitTime}ms`);
await this.wait(waitTime);
// Continue with retry...
```

**Error Mapping:**

- 401 → `AuthenticationError`
- 403 → `AuthorizationError`
- 429 → `RateLimitError` (parse `Retry-After` header, implement retry)
- 400, 422 → `InvalidRequestError`
- 500+ → `ServerError` (with retry)
- AbortError (timeout) → `TimeoutError`
- Other network errors → `NetworkError`

**Timeout vs Network Error Detection:**

```typescript
try {
  const response = await fetch(url, { signal: controller.signal, ...options });
  // ...
} catch (error) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      throw new TimeoutError('Request timeout exceeded');
    }
    throw new NetworkError(`Network error: ${error.message}`);
  }
  throw new NetworkError('Unknown network error');
}
```

### 4.4 `private parseAndValidateResponse(apiResponse: OpenRouterResponse): FlashcardProposalDTO[]`

**Purpose**: Validates API response against Zod schema and transforms to DTOs.

**Zod Schemas** (defined in `src/lib/schemas/openrouter.schema.ts`):

```typescript
// Import from schemas file, don't define inline
import {
  openRouterResponseSchema,
  flashcardsResponseSchema
} from '@/lib/schemas/openrouter.schema';
```

**Schema Definitions** (in `src/lib/schemas/openrouter.schema.ts`):

```typescript
import { z } from 'zod';

export const flashcardProposalSchema = z.object({
  front: z.string().min(1, 'Front cannot be empty'),
  back: z.string().min(1, 'Back cannot be empty'),
});

export const openRouterResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ).min(1, 'Response must contain at least one choice'),
});

export const flashcardsResponseSchema = z.object({
  flashcards: z.array(flashcardProposalSchema).min(1).max(8),
});
```

**Validation Steps:**

1. Validate overall OpenRouter response structure using `openRouterResponseSchema`
2. Extract `content` from first choice
3. Parse content as JSON
4. Validate parsed JSON against `flashcardsResponseSchema`
5. Return validated `FlashcardProposalDTO[]`

**Error Handling:**

- Throw `InvalidResponseError` if validation fails
- Include validation error details in error message for debugging

### 4.5 `private async wait(ms: number): Promise<void>`

**Purpose**: Helper for implementing exponential backoff in retry logic.

```typescript
private async wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 5. Error Handling

### 5.1 Custom Error Classes

Define custom error classes in `src/lib/errors/openrouter.errors.ts`:

```typescript
export class OpenRouterError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export class AuthenticationError extends OpenRouterError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends OpenRouterError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends OpenRouterError {
  constructor(message: string = 'Rate limit exceeded', public readonly retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class InvalidRequestError extends OpenRouterError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidRequestError';
  }
}

export class ServerError extends OpenRouterError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = 'ServerError';
  }
}

export class TimeoutError extends OpenRouterError {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends OpenRouterError {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class InvalidResponseError extends OpenRouterError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidResponseError';
  }
}
```

### 5.2 Error Handling Strategy

**In API Endpoints** (`src/pages/api/generations/index.ts`):

```typescript
try {
  const proposals = await aiService.generateFlashcardProposals(sourceText);
  // ...
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Log error for monitoring, return generic message to user
    console.error('[OpenRouter] Authentication failed:', error);
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Service configuration error' } }),
      { status: 500 }
    );
  }
  if (error instanceof RateLimitError) {
    console.warn('[OpenRouter] Rate limit exceeded:', error);
    return new Response(
      JSON.stringify({ error: { code: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' } }),
      { status: 429 }
    );
  }
  if (error instanceof TimeoutError) {
    console.warn('[OpenRouter] Request timeout:', error);
    return new Response(
      JSON.stringify({ error: { code: 'TIMEOUT', message: 'Request timeout. Please try again.' } }),
      { status: 504 }
    );
  }
  // Generic error handling
  console.error('[OpenRouter] Unexpected error:', error);
  return new Response(
    JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate flashcards. Please try again.' } }),
    { status: 500 }
  );
}
```

### 5.3 Logging Strategy

**Format**: Console logging with `[OpenRouter]` prefix

**Development Environment:**

- Use `console.log` for informational messages
- Use `console.warn` for recoverable issues (rate limits, retries)
- Use `console.error` for errors

**What to Log:**

- Request metadata (timestamp, model name, text length) - NO API keys or full text
- Response metadata (status code, response time, flashcard count)
- Error details with error name and message (NO stack traces in production)
- Retry attempts and outcomes

**What NOT to Log:**

- API keys or authentication tokens
- Full user input text (may contain sensitive information)
- Full API responses (may be large)
- Stack traces in production logs

**Example Logging:**

```typescript
// Request start
console.log(`[OpenRouter] Request started - Model: ${this._modelName}, TextLength: ${sourceText.length}`);

// Retry attempt
console.warn(`[OpenRouter] Retry attempt ${retryCount + 1}/${this.maxRetries} after ${waitTime}ms`);

// Success response
console.log(`[OpenRouter] Response received - Status: ${response.status}, Flashcards: ${flashcards.length}`);

// Error
console.error(`[OpenRouter] Error occurred - Type: ${error.name}, Message: ${error.message}`);
```

---

## 6. Security Considerations

### 6.1 API Key Management

**Environment Variables:**

- Store API key in `.env` file: `OPENROUTER_API_KEY=your_key_here`
- Add `.env` to `.gitignore` to prevent committing secrets
- Use different keys for development and production environments

**Validation:**

- Validate API key presence on service initialization
- Fail fast with descriptive error if key is missing

### 6.2 Input Sanitization

**Text Length Validation:**

- Enforce 1,000-10,000 character limit in Zod schema at API endpoint level
- NO validation in service layer (follows project's validation-in-controller pattern)

**Content Filtering:**

- Consider adding basic content filtering to prevent abuse (optional for MVP)

### 6.3 Rate Limiting

**Client-Side:**

- Implement UI-level debouncing to prevent accidental multiple submissions
- Show loading state during generation

**Server-Side:**

- Consider implementing rate limiting per user (future enhancement)

**OpenRouter Limits:**

- Configure spending limits in OpenRouter dashboard
- Monitor usage through OpenRouter analytics

### 6.4 Error Message Security

**DO:**

- Return generic error messages to users
- Log detailed errors server-side for debugging

**DON'T:**

- Expose API keys or internal system details in error messages
- Return raw API error messages to frontend

---

## 7. Environment Variables

Complete list of required and optional environment variables:

```bash
# Required in production
OPENROUTER_API_KEY=sk-or-v1-xxxxx  # OpenRouter API key

# Optional - Service selection
USE_MOCK_AI=false  # Set to 'true' to force MockAIService (default: false)

# Optional - OpenRouter configuration
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # Default if not set

# Optional - Analytics headers
PUBLIC_SITE_URL=https://your-domain.com  # Used for HTTP-Referer header
PUBLIC_APP_NAME=10x-cards  # Used for X-Title header (default: '10x-cards')
```

**Service Selection Logic:**

```
IF USE_MOCK_AI == 'true' THEN
  Use MockAIService
ELSE IF OPENROUTER_API_KEY is missing or empty THEN
  Fallback to MockAIService + console.warn
ELSE
  Use OpenRouterService
END IF
```

**Internal Constants (hardcoded in OpenRouterService):**

```typescript
const MAX_RETRY_WAIT = 10000; // 10 seconds - prevents indefinite request blocking
```

This constant caps the maximum wait time for retries, preventing scenarios where OpenRouter returns
a very long Retry-After header (e.g., 1 hour) that would block the user's request indefinitely.

---

## 8. Step-by-Step Implementation Plan

### Step 1: Create Type Definitions

**File:** `src/types.ts` (append to existing file)

1. Add `OpenRouterConfig` interface
2. Add `OpenRouterRequest` interface
3. Add `OpenRouterResponse` interface

### Step 2: Create Zod Schemas

**File:** `src/lib/schemas/openrouter.schema.ts` (new file)

1. Create `flashcardProposalSchema`
2. Create `openRouterResponseSchema`
3. Create `flashcardsResponseSchema`
4. Export all schemas

### Step 3: Create Error Classes

**File:** `src/lib/errors/openrouter.errors.ts` (new file)

1. Create base `OpenRouterError` class
2. Define all specialized error classes (8 total)
3. Export all error classes

### Step 4: Update AIService Interface

**File:** `src/lib/services/ai.service.ts`

1. Add `get modelName(): string` to `AIService` interface
2. Implement getter in `MockAIService` (return `'mock-ai'`)

### Step 5: Create OpenRouterService Class

**File:** `src/lib/services/openrouter.service.ts` (new file)

1. Import dependencies (types, errors, Zod schemas)
2. Define class implementing `AIService` interface
3. Implement constructor with validation
4. Implement `get modelName()` getter
5. Implement `generateFlashcardProposals` method (main entry point)

### Step 6: Implement buildRequestPayload

**In:** `src/lib/services/openrouter.service.ts`

1. Create system message with flashcard generation guidelines
2. Create user message template with sourceText interpolation
3. Define response_format JSON schema
4. Set model parameters (temperature, max_tokens, top_p)
5. Return complete `OpenRouterRequest` object

### Step 7: Implement executeRequest with Retry Logic

**In:** `src/lib/services/openrouter.service.ts`

1. Create `AbortController` for timeout
2. Set timeout using `setTimeout`
3. Make fetch request with proper headers
4. Handle HTTP status codes with error mapping
5. Parse `Retry-After` header for rate limiting with MAX_RETRY_WAIT cap (10s)
6. Implement exponential backoff for retries
7. Distinguish timeout vs network errors
8. Return parsed JSON response

**Important**: Implement MAX_RETRY_WAIT constant (10000ms) to prevent waiting indefinitely when OpenRouter returns long Retry-After values.

### Step 8: Implement parseAndValidateResponse

**In:** `src/lib/services/openrouter.service.ts`

1. Import Zod schemas from `@/lib/schemas/openrouter.schema`
2. Validate response structure with `openRouterResponseSchema`
3. Extract content from first choice
4. Parse content as JSON
5. Validate flashcards array with `flashcardsResponseSchema`
6. Transform to `FlashcardProposalDTO[]`
7. Handle validation errors with `InvalidResponseError`

### Step 9: Create Factory Function

**File:** `src/lib/services/ai.service.ts`

Add factory function with graceful fallback:

```typescript
export function createAIService(): AIService {
  const useMock = import.meta.env.USE_MOCK_AI === 'true';

  if (useMock) {
    console.log('[AI Service] Using MockAIService (USE_MOCK_AI=true)');
    return new MockAIService();
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('[AI Service] OPENROUTER_API_KEY not found - falling back to MockAIService');
    return new MockAIService();
  }

  console.log('[AI Service] Using OpenRouterService');
  return new OpenRouterService({
    apiKey,
    baseUrl: import.meta.env.OPENROUTER_BASE_URL,
    modelName: 'google/gemma-3-27b-it:free',
    timeout: 30000,
    maxRetries: 2,
    httpReferer: import.meta.env.PUBLIC_SITE_URL,
    appTitle: import.meta.env.PUBLIC_APP_NAME,
  });
}
```

### Step 10: Refactor GenerationService Constructor

**File:** `src/lib/services/generation.service.ts`

**Change constructor signature** to remove aiService dependency:

Before:
```typescript
export class GenerationService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly aiService: AIService
  ) {}
```

After:
```typescript
export class GenerationService {
  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}
```

**Update generateFlashcards method signature** to accept aiService as parameter:

Before:
```typescript
async generateFlashcards(sourceText: string, userId: string): Promise<GenerationResponseDTO> {
  const proposals: FlashcardProposalDTO[] = await this.aiService.generateFlashcardProposals(sourceText);
  // ...
  model_used: "mock-gpt-4", // MVP: hardcoded mock model name
```

After:
```typescript
async generateFlashcards(
  sourceText: string,
  userId: string,
  aiService: AIService
): Promise<GenerationResponseDTO> {
  const proposals: FlashcardProposalDTO[] = await aiService.generateFlashcardProposals(sourceText);
  // ...
  model_used: aiService.modelName,
```

### Step 11: Update API Endpoint to Use Factory and New Signature

**File:** `src/pages/api/generations/index.ts`

Before:
```typescript
// Get dependencies
const supabase = locals.supabase;
const aiService = new MockAIService();
const generationService = new GenerationService(supabase, aiService);

// Generate flashcards
const result = await generationService.generateFlashcards(
  validationResult.data.source_text,
  locals.user!.id
);
```

After:
```typescript
// Get dependencies
const supabase = locals.supabase;
const generationService = new GenerationService(supabase);
const aiService = createAIService();

// Generate flashcards
const result = await generationService.generateFlashcards(
  validationResult.data.source_text,
  locals.user!.id,
  aiService
);
```

**File:** `src/pages/api/generations/[id]/accept.ts`

Before:
```typescript
// Get dependencies
const supabase = locals.supabase;
const aiService = new MockAIService();
const generationService = new GenerationService(supabase, aiService);
```

After:
```typescript
// Get dependencies
const supabase = locals.supabase;
const generationService = new GenerationService(supabase);
// No aiService needed - acceptFlashcards doesn't use it
```

### Step 12: Testing Strategy

No automated tests required for MVP but make sure that basic functionality is covered in
API functionality test scenarios in `.http/scenarios/func`

Test cases to cover:

- Successful generation with OpenRouterService

---

## Appendix: Complete Code Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── ai.service.ts                # Interface + MockAIService + createAIService factory
│   │   ├── openrouter.service.ts        # OpenRouterService implementation (NEW)
│   │   ├── generation.service.ts        # Updated: constructor & method signature (method param injection)
│   │   └── flashcard.service.ts         # Unchanged
│   ├── schemas/
│   │   ├── openrouter.schema.ts         # Zod schemas for OpenRouter (NEW)
│   │   ├── generation.schema.ts         # Existing
│   │   ├── flashcard.schema.ts          # Existing
│   │   └── auth.schema.ts               # Existing
│   └── errors/
│       └── openrouter.errors.ts         # Custom error classes (NEW)
├── pages/
│   └── api/
│       ├── generations/
│       │   ├── index.ts                 # Updated: use createAIService() + new method signature
│       │   └── [id]/
│       │       └── accept.ts            # Updated: remove unnecessary aiService creation
│       └── flashcards/
│           ├── index.ts                 # Unchanged
│           └── [id].ts                  # Unchanged
└── types.ts                             # Updated with OpenRouter types
```

**Files Changed:** 5 (ai.service.ts, generation.service.ts, generations/index.ts, generations/[id]/accept.ts, types.ts)
**Files Created:** 3 (openrouter.service.ts, openrouter.schema.ts, openrouter.errors.ts)
**Files Unchanged:** Rest of codebase

---

## Summary

This implementation guide provides a complete blueprint for creating a production-ready `OpenRouterService`. The service
is designed with:

- **Type safety** through TypeScript and Zod validation
- **Robust error handling** with specialized error classes
- **Security** through proper API key management
- **Reliability** via retry logic with capped wait times (MAX_RETRY_WAIT: 10s) to prevent indefinite blocking
- **Smart retry strategy** with Retry-After header support and exponential backoff
- **Flexibility** to switch models and tune parameters
- **Testability** through dependency injection and factory pattern
- **Graceful degradation** with automatic fallback to MockAIService
- **Clean architecture** using method parameter injection to eliminate unnecessary dependencies
- **Separation of concerns** following project conventions (types in types.ts, schemas in lib/schemas)

**Key architectural decisions:**
- `GenerationService` uses method parameter injection for `aiService` (only `generateFlashcards` needs it)
- Accept endpoint doesn't create unused `aiService` instance (eliminating constructor over-injection)
- Retry-After header capped at 10 seconds to prevent user-facing request timeouts

Follow the step-by-step plan to implement the service systematically.
