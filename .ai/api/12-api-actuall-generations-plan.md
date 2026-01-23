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
- **Response Format**: Structured JSON via `response_format`
- **Error Handling**: Comprehensive with retry logic for transient failures
- **Type Safety**: Runtime validation using Zod schemas

---

## 2. Constructor Description

The constructor initializes the service with configuration and validates required environment variables.

```typescript
constructor(config
:
OpenRouterConfig
)
```

### Constructor Parameters

**`OpenRouterConfig` interface:**

```typescript
interface OpenRouterConfig {
  apiKey: string;           // OpenRouter API key from environment
  baseUrl?: string;         // API endpoint (default: 'https://openrouter.ai/api/v1')
  modelName?: string;       // Model identifier (default: 'qwen/qwen3-next-80b-a3b-instruct:free')
  timeout?: number;         // Request timeout in ms (default: 30000)
  maxRetries?: number;      // Retry attempts for transient errors (default: 2)
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
  modelName: 'qwen/qwen3-next-80b-a3b-instruct:free',
  timeout: 30000,
  maxRetries: 2
});
```

---

## 3. Public Methods and Fields

### 3.1 `generateFlashcardProposals(sourceText: string): Promise<FlashcardProposalDTO[]>`

**Purpose**: Main method that implements the `AIService` interface. Generates flashcard proposals from source text.

**Input Validation:**

- Check `sourceText` length is between 1,000 and 10,000 characters
- Throw `InputValidationError` if validation fails

**Process Flow:**

1. Validate input text length
2. Construct request payload (messages, response_format, model parameters)
3. Execute HTTP request with timeout and retry logic
4. Parse and validate response using Zod schema
5. Transform API response to `FlashcardProposalDTO[]`
6. Return typed flashcard proposals

**Return Type**: `Promise<FlashcardProposalDTO[]>`

**Error Handling**: Throws custom error classes (see Section 5)

---

## 4. Private Methods and Fields

### 4.1 Private Fields

```typescript
private readonly
apiKey: string;
private readonly
baseUrl: string;
private readonly
modelName: string;
private readonly
timeout: number;
private readonly
maxRetries: number;
```

### 4.2 `private buildRequestPayload(sourceText: string): OpenRouterRequest`

**Purpose**: Constructs the OpenRouter API request payload with proper structure.

**Returns:**

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
    content
:
  `You are an expert educational content creator specializing in creating high-quality flashcards for spaced repetition learning. Your goal is to extract key concepts from the provided text and transform them into clear, concise question-answer pairs that facilitate effective learning.

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
    content
:
  `Based on the following text, generate flashcards following the guidelines provided.

Text:
${sourceText}`
}
```

**Response Format Schema:**

```typescript
response_format: {
  type: 'json_schema',
    json_schema
:
  {
    name: 'flashcard_proposals',
      strict
  :
    true,
      schema
  :
    {
      type: 'object',
        properties
    :
      {
        flashcards: {
          type: 'array',
            description
        :
          'Array of generated flashcard proposals',
            items
        :
          {
            type: 'object',
              properties
          :
            {
              front: {
                type: 'string',
                  description
              :
                'The question or prompt for the flashcard'
              }
            ,
              back: {
                type: 'string',
                  description
              :
                'The answer or explanation for the flashcard'
              }
            }
          ,
            required: ['front', 'back'],
              additionalProperties
          :
            false
          }
        ,
          minItems: 4,
            maxItems
        :
          8
        }
      }
    ,
      required: ['flashcards'],
        additionalProperties
    :
      false
    }
  }
}
```

**Model Parameters:**

```typescript
temperature: 0.4,      // Lower temperature for more consistent, focused outputs
  max_tokens
:
2000,      // Sufficient for 8 flashcards with detailed content
  top_p
:
1.0,           // Use full probability distribution
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
     'HTTP-Referer': 'https://your-app-domain.com',  // Optional: for OpenRouter analytics
     'X-Title': '10x-cards'  // Optional: for OpenRouter analytics
   }
   ```
4. Handle response based on status code
5. Implement retry logic for transient failures (429, 500+)
6. Parse JSON response

**Retry Strategy:**

- Retry on status codes: 429 (rate limit), 500, 502, 503, 504
- Exponential backoff: wait `Math.pow(2, retryCount) * 1000` ms before retry
- Max retries from config (default: 2)

**Error Mapping:**

- 401 → `AuthenticationError`
- 403 → `AuthorizationError`
- 429 → `RateLimitError` (with retry)
- 400, 422 → `InvalidRequestError`
- 500+ → `ServerError` (with retry)
- Timeout → `TimeoutError`
- Network errors → `NetworkError`

### 4.4 `private parseAndValidateResponse(apiResponse: OpenRouterResponse): FlashcardProposalDTO[]`

**Purpose**: Validates API response against Zod schema and transforms to DTOs.

**Zod Schema:**

```typescript
const FlashcardProposalDTOSchema = z.object({
  front: z.string().min(1, 'Front cannot be empty'),
  back: z.string().min(1, 'Back cannot be empty'),
});

const OpenRouterResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ).min(1, 'Response must contain at least one choice'),
});

const FlashcardsResponseSchema = z.object({
  flashcards: z.array(FlashcardProposalDTOSchema).min(1).max(8),
});
```

**Validation Steps:**

1. Validate overall OpenRouter response structure
2. Extract `content` from first choice
3. Parse content as JSON
4. Validate parsed JSON against `FlashcardsResponseSchema`
5. Return validated `FlashcardProposalDTO[]`

**Error Handling:**

- Throw `InvalidResponseError` if validation fails
- Include validation error details in error message for debugging

### 4.5 `private async wait(ms: number): Promise<void>`

**Purpose**: Helper for implementing exponential backoff in retry logic.

```typescript
private async
wait(ms
:
number
):
Promise < void > {
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

export class InputValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
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

**In API Endpoints** (`src/pages/api/flashcards/generate.ts`):

```typescript
try {
  const proposals = await openRouterService.generateFlashcardProposals(sourceText);
  return new Response(JSON.stringify(proposals), { status: 200 });
} catch (error) {
  if (error instanceof InputValidationError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  if (error instanceof AuthenticationError) {
    // Log error for monitoring, return generic message to user
    console.error('OpenRouter authentication failed:', error);
    return new Response(JSON.stringify({ error: 'Service configuration error' }), { status: 500 });
  }
  if (error instanceof RateLimitError) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429 });
  }
  if (error instanceof TimeoutError) {
    return new Response(JSON.stringify({ error: 'Request timeout. Please try again.' }), { status: 504 });
  }
  // Generic error handling
  console.error('Unexpected error:', error);
  return new Response(JSON.stringify({ error: 'Failed to generate flashcards. Please try again.' }), { status: 500 });
}
```

### 5.3 Logging Recommendations

**What to Log:**

- Request metadata (timestamp, model name, text length) - NO API keys or full text
- Response metadata (status code, response time, flashcard count)
- Error details with stack traces
- Retry attempts and outcomes

**What NOT to Log:**

- API keys
- Full user input text (may contain sensitive information)
- Full API responses (may be large)

**Example Logging:**

```typescript
console.log(`[OpenRouter] Request started - Model: ${modelName}, TextLength: ${sourceText.length}`);
console.log(`[OpenRouter] Response received - Status: ${response.status}, Duration: ${duration}ms, Flashcards: ${flashcards.length}`);
console.error(`[OpenRouter] Error occurred - Type: ${error.name}, Message: ${error.message}`);
```

---

## 6. Security Considerations

### 6.1 API Key Management

**Environment Variables:**

- Store API key in `.env` file: `OPENROUTER_API_KEY=your_key_here`
- Add `.env` to `.gitignore` to prevent committing secrets
- Use different keys for development and production environments

**Supabase Secrets (Production):**

- Consider storing API key in Supabase Edge Function secrets
- Access via `Deno.env.get('OPENROUTER_API_KEY')` in edge functions

**Validation:**

- Validate API key presence on service initialization
- Fail fast with descriptive error if key is missing

### 6.2 Input Sanitization

**Text Length Validation:**

- Enforce 1,000-10,000 character limit as per PRD (US-003)
- Reject requests outside this range before making API calls

**Content Filtering:**

- Consider adding basic content filtering to prevent abuse (e.g., excessive profanity, spam)
- This is optional for MVP but recommended for production

### 6.3 Rate Limiting

**Client-Side:**

- Implement UI-level debouncing to prevent accidental multiple submissions
- Show loading state during generation

**Server-Side:**

- Consider implementing rate limiting per user (e.g., max 10 requests per hour)
- Use Supabase or in-memory store to track request counts

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

## 7. Step-by-Step Implementation Plan

### Step 1: Create Type Definitions

**File:** `src/lib/services/openrouter.types.ts`

1. Define `OpenRouterConfig` interface
2. Define `OpenRouterRequest` interface
3. Define `OpenRouterResponse` interface
4. Create Zod schemas for runtime validation

### Step 2: Create Error Classes

**File:** `src/lib/errors/openrouter.errors.ts`

1. Create base `OpenRouterError` class
2. Define all specialized error classes (8 total)
3. Export all error classes

### Step 3: Create OpenRouterService Class

**File:** `src/lib/services/openrouter.service.ts`

1. Import dependencies (types, errors, Zod)
2. Define class implementing `AIService` interface
3. Implement constructor with validation
4. Implement `generateFlashcardProposals` method (main entry point)

### Step 4: Implement buildRequestPayload

**In:** `src/lib/services/openrouter.service.ts`

1. Create system message with flashcard generation guidelines
2. Create user message template with sourceText interpolation
3. Define response_format JSON schema
4. Set model parameters (temperature, max_tokens, top_p)
5. Return complete `OpenRouterRequest` object

### Step 5: Implement executeRequest with Retry Logic

**In:** `src/lib/services/openrouter.service.ts`

1. Create `AbortController` for timeout
2. Set timeout using `setTimeout`
3. Make fetch request with proper headers
4. Handle HTTP status codes with error mapping
5. Implement exponential backoff for retries
6. Return parsed JSON response

### Step 6: Implement parseAndValidateResponse

**In:** `src/lib/services/openrouter.service.ts`

1. Validate response structure with Zod
2. Extract content from first choice
3. Parse content as JSON
4. Validate flashcards array
5. Transform to `FlashcardProposalDTO[]`
6. Handle validation errors with `InvalidResponseError`

### Step 7: Environment Configuration

**For Astro:** Ensure `import.meta.env.OPENROUTER_API_KEY` is accessible

### Step 8: Update Service Instantiation

**File:** `src/lib/services/ai.service.ts` or create factory

1. Export `OpenRouterService` alongside `MockAIService`
2. Create factory function to switch between implementations:

```typescript
export function createAIService(): AIService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey || import.meta.env.DEV) {
    console.warn('Using MockAIService - set OPENROUTER_API_KEY for production');
    return new MockAIService();
  }

  return new OpenRouterService({
    apiKey,
    modelName: 'qwen/qwen3-next-80b-a3b-instruct:free',
    timeout: 30000,
    maxRetries: 2,
  });
}
```

### Step 9: Integration with API Endpoint

**File:** @src/pages/api/generations/index.ts

1. Import `createAIService` factory
2. Instantiate service
3. Extract `sourceText` from request body
4. Call `generateFlashcardProposals(sourceText)`
5. Implement error handling (see Section 5.2)
6. Return JSON response

### Step 10: Testing Strategy

No automated tests required for MVP but make sure that basic functionality is covered in
APT functionality test scenarios in @.http/scenarios/func

### Step 11: Model Selection and Optimization

**Initial Recommendation: `qwen/qwen3-next-80b-a3b-instruct:free`**


---

## Appendix: Complete Code Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── ai.service.ts                # Interface + MockAIService + factory
│   │   ├── openrouter.service.ts        # OpenRouterService implementation
│   │   └── openrouter.types.ts          # TypeScript interfaces & Zod schemas
│   └── errors/
│       └── openrouter.errors.ts         # Custom error classes
├── pages/
│   └── api/
│       └── flashcards/
│           └── generate.ts              # API endpoint using service
└── types.ts                             # Shared types (FlashcardProposalDTO)
```

---

## Summary

This implementation guide provides a complete blueprint for creating a production-ready `OpenRouterService`. The service
is designed with:

- **Type safety** through TypeScript and Zod validation
- **Robust error handling** with specialized error classes
- **Security** through proper API key management
- **Reliability** via retry logic and timeout handling
- **Flexibility** to switch models and tune parameters
- **Testability** through dependency injection and mocking

Follow the step-by-step plan to implement the service systematically.
