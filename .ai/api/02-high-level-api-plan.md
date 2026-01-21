# REST API Plan

## 1. Resources

| Resource          | Database Table             | Description                                      |
|-------------------|----------------------------|--------------------------------------------------|
| Users             | auth.users (Supabase Auth) | User accounts managed by Supabase Auth           |
| Flashcards        | flashcards                 | User flashcards (both AI-generated and manual)   |
| Generations       | generation_sessions        | AI generation session metadata                   |
| Generation Errors | generation_error_logs      | Failed AI generation attempts (internal logging) |

## 2. Endpoints

### 2.1 Authentication

Authentication is handled by Supabase Auth SDK. The following endpoints wrap Supabase Auth functionality for server-side
operations.

---

#### POST /api/auth/register

Creates a new user account and automatically logs the user in.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Session Behavior:**

- `supabase.auth.signUp()` **automatically creates a session** when user is registered
- Session tokens (access_token and refresh_token) are **immediately set as httpOnly cookies** by Supabase Auth
- User is **logged in immediately** after successful registration - no separate login required
- Subsequent requests will have user context available in middleware via `locals.user`

**MVP Scope - Email Verification:**

- **Email confirmation is DISABLED for MVP** (Supabase default setting)
- Users can immediately access all features after registration
- No verification email is sent
- `email_confirmed_at` is set to current timestamp automatically
- **Future enhancement:** Consider enabling email confirmation for production to prevent spam accounts

**Error Responses:**

| Status | Code             | Message                                |
|--------|------------------|----------------------------------------|
| 400    | VALIDATION_ERROR | Invalid email format                   |
| 400    | VALIDATION_ERROR | Password must be at least 8 characters |
| 409    | USER_EXISTS      | User with this email already exists    |
| 500    | INTERNAL_ERROR   | Registration failed                    |

---

#### POST /api/auth/login

Authenticates a user and creates a session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Authentication Mechanism:**

- Session tokens (access_token and refresh_token) are **automatically set as httpOnly cookies** by Supabase Auth
- Cookies are named `sb-<project-ref>-auth-token` and contain both access and refresh tokens
- Cookie options: `secure: true`, `httpOnly: true`, `sameSite: 'lax'`
- Client does **not** receive tokens in the response body for security reasons

**Error Responses:**

| Status | Code                | Message                         |
|--------|---------------------|---------------------------------|
| 400    | VALIDATION_ERROR    | Email and password are required |
| 401    | INVALID_CREDENTIALS | Invalid email or password       |
| 500    | INTERNAL_ERROR      | Login failed                    |

---

#### POST /api/auth/logout

Terminates the current user session.

**Authentication:**

- User is automatically identified from session cookies (no Authorization header needed)
- Middleware extracts user context from httpOnly cookies before reaching the endpoint

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**Session Cleanup:**

- Supabase Auth automatically clears session cookies
- Both access and refresh tokens are invalidated

**Error Responses:**

| Status | Code           | Message           |
|--------|----------------|-------------------|
| 401    | UNAUTHORIZED   | Not authenticated |
| 500    | INTERNAL_ERROR | Logout failed     |

---

#### DELETE /api/auth/account

Deletes the user account and all associated data (GDPR compliance).

**Authentication:**

- User is automatically identified from session cookies (no Authorization header needed)
- Middleware extracts user context from httpOnly cookies before reaching the endpoint

**Response (200 OK):**

```json
{
  "message": "Account deleted successfully"
}
```

**Data Deletion:**

- Deletes user from `auth.users` table
- Database CASCADE constraints automatically delete all associated data:
    - All flashcards (`flashcards.user_id` → CASCADE DELETE)
    - All generation sessions (`generation_sessions.user_id` → CASCADE DELETE)
    - All generation error logs (`generation_error_logs.user_id` → CASCADE DELETE)

**Error Responses:**

| Status | Code           | Message                 |
|--------|----------------|-------------------------|
| 401    | UNAUTHORIZED   | Not authenticated       |
| 500    | INTERNAL_ERROR | Account deletion failed |

---

### 2.2 Flashcards

All flashcard endpoints require authentication.

---

#### GET /api/flashcards

Retrieves a paginated list of user's flashcards.

**Authentication:**

- User is automatically identified from session cookies
- Only returns flashcards belonging to the authenticated user (explicit filter + RLS as safety net)

**Query Parameters:**

| Parameter | Type    | Required | Default    | Description                                  |
|-----------|---------|----------|------------|----------------------------------------------|
| page      | integer | No       | 1          | Page number (1-indexed)                      |
| limit     | integer | No       | 20         | Items per page (1-100)                       |
| source    | string  | No       | -          | Filter by source: 'ai_generated' or 'manual' |
| sort      | string  | No       | created_at | Sort field: 'created_at' or 'updated_at'     |
| order     | string  | No       | desc       | Sort order: 'asc' or 'desc'                  |

**Response (200 OK):**

```json
{
  "flashcards": [
    {
      "id": "uuid",
      "front": "What is the capital of France?",
      "back": "Paris",
      "source": "ai_generated",
      "generation_id": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**

| Status | Code             | Message                       |
|--------|------------------|-------------------------------|
| 400    | VALIDATION_ERROR | Invalid pagination parameters |
| 401    | UNAUTHORIZED     | Not authenticated             |
| 500    | INTERNAL_ERROR   | Failed to fetch flashcards    |

---

#### GET /api/flashcards/:id

Retrieves a single flashcard by ID.

**Authentication:**

- User is automatically identified from session cookies
- Can only retrieve flashcards belonging to the authenticated user (explicit filter + RLS as safety net)

**Path Parameters:**

| Parameter | Type | Description  |
|-----------|------|--------------|
| id        | UUID | Flashcard ID |

**Response (200 OK):**

```json
{
  "id": "uuid",
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "ai_generated",
  "generation_id": "uuid",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**

| Status | Code             | Message                     |
|--------|------------------|-----------------------------|
| 400    | VALIDATION_ERROR | Invalid flashcard ID format |
| 401    | UNAUTHORIZED     | Not authenticated           |
| 404    | NOT_FOUND        | Flashcard not found         |
| 500    | INTERNAL_ERROR   | Failed to fetch flashcard   |

---

#### POST /api/flashcards

Creates a new flashcard manually.

**Authentication:**

- User is automatically identified from session cookies
- Flashcard is automatically associated with the authenticated user

**Request Body:**

```json
{
  "front": "What is the capital of France?",
  "back": "Paris"
}
```

**Validation:**

- `front`: required, 1-500 characters
- `back`: required, 1-2000 characters

**Response (201 Created):**

```json
{
  "id": "uuid",
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "generation_id": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**

| Status | Code             | Message                                    |
|--------|------------------|--------------------------------------------|
| 400    | VALIDATION_ERROR | Front is required                          |
| 400    | VALIDATION_ERROR | Front must be between 1 and 500 characters |
| 400    | VALIDATION_ERROR | Back is required                           |
| 400    | VALIDATION_ERROR | Back must be between 1 and 2000 characters |
| 401    | UNAUTHORIZED     | Not authenticated                          |
| 500    | INTERNAL_ERROR   | Failed to create flashcard                 |

---

#### PUT /api/flashcards/:id

Updates an existing flashcard.

**Authentication:**

- User is automatically identified from session cookies
- Can only update flashcards belonging to the authenticated user (explicit filter + RLS as safety net)

**Path Parameters:**

| Parameter | Type | Description  |
|-----------|------|--------------|
| id        | UUID | Flashcard ID |

**Request Body:**

```json
{
  "front": "What is the capital of France?",
  "back": "Paris is the capital of France"
}
```

**Validation:**

- `front`: required, 1-500 characters
- `back`: required, 1-2000 characters

**Response (200 OK):**

```json
{
  "id": "uuid",
  "front": "What is the capital of France?",
  "back": "Paris is the capital of France",
  "source": "ai_generated",
  "generation_id": "uuid",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

**Error Responses:**

| Status | Code             | Message                                    |
|--------|------------------|--------------------------------------------|
| 400    | VALIDATION_ERROR | Front must be between 1 and 500 characters |
| 400    | VALIDATION_ERROR | Back must be between 1 and 2000 characters |
| 401    | UNAUTHORIZED     | Not authenticated                          |
| 404    | NOT_FOUND        | Flashcard not found                        |
| 500    | INTERNAL_ERROR   | Failed to update flashcard                 |

---

#### DELETE /api/flashcards/:id

Deletes a flashcard permanently.

**Authentication:**

- User is automatically identified from session cookies
- Can only delete flashcards belonging to the authenticated user (explicit filter + RLS as safety net)

**Path Parameters:**

| Parameter | Type | Description  |
|-----------|------|--------------|
| id        | UUID | Flashcard ID |

**Response (204 No Content)**

**Error Responses:**

| Status | Code             | Message                     |
|--------|------------------|-----------------------------|
| 400    | VALIDATION_ERROR | Invalid flashcard ID format |
| 401    | UNAUTHORIZED     | Not authenticated           |
| 404    | NOT_FOUND        | Flashcard not found         |
| 500    | INTERNAL_ERROR   | Failed to delete flashcard  |

---

### 2.3 AI Generation

Endpoints for AI-powered flashcard generation.

---

#### POST /api/generations

Initiates an AI generation session. Sends source text to LLM and returns flashcard proposals.

**Authentication:**

- User is automatically identified from session cookies
- Generation session is automatically associated with the authenticated user

**Request Body:**

```json
{
  "source_text": "Long text content between 1000-10000 characters..."
}
```

**Validation:**

- `source_text`: required, 1000-10000 characters

**Response (201 Created):**

```json
{
  "generation_id": "uuid",
  "flashcards_proposals": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy"
    },
    {
      "front": "What are the reactants of photosynthesis?",
      "back": "Carbon dioxide, water, and light energy"
    }
  ],
  "generated_count": 5
}
```

**Error Responses:**

| Status | Code                   | Message                                               |
|--------|------------------------|-------------------------------------------------------|
| 400    | VALIDATION_ERROR       | Source text is required                               |
| 400    | VALIDATION_ERROR       | Source text must be between 1000 and 10000 characters |
| 401    | UNAUTHORIZED           | Not authenticated                                     |
| 500    | AI_SERVICE_ERROR       | Failed to generate flashcards                         |
| 503    | AI_SERVICE_UNAVAILABLE | AI service is temporarily unavailable                 |

**Notes:**

- On success, creates a `generation_sessions` record with `accepted_count = NULL`
- On failure, creates a `generation_error_logs` record
- The `flashcards_proposals` are NOT saved to database yet - they are returned for user review

---

#### POST /api/generations/:id/accept

Accepts selected flashcard proposals and saves them to the database.

**Authentication:**

- User is automatically identified from session cookies
- Can only finalize generation sessions belonging to the authenticated user (explicit filter + RLS as safety net)

**Path Parameters:**

| Parameter | Type | Description           |
|-----------|------|-----------------------|
| id        | UUID | Generation session ID |

**Request Body:**

```json
{
  "flashcards": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy"
    },
    {
      "front": "What are the products of photosynthesis?",
      "back": "Glucose and oxygen (edited by user)"
    }
  ]
}
```

**Validation:**

- `flashcards`: required, non-empty array
- Each flashcard:
    - `front`: required, 1-500 characters
    - `back`: required, 1-2000 characters

**Response (201 Created):**

```json
{
  "flashcards": [
    {
      "id": "uuid-1",
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "source": "ai_generated",
      "generation_id": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "front": "What are the products of photosynthesis?",
      "back": "Glucose and oxygen (edited by user)",
      "source": "ai_generated",
      "generation_id": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "accepted_count": 2
}
```

**Error Responses:**

| Status | Code              | Message                                       |
|--------|-------------------|-----------------------------------------------|
| 400    | VALIDATION_ERROR  | Flashcards array is required                  |
| 400    | VALIDATION_ERROR  | Flashcards array cannot be empty              |
| 400    | VALIDATION_ERROR  | Front must be between 1 and 500 characters    |
| 400    | VALIDATION_ERROR  | Back must be between 1 and 2000 characters    |
| 401    | UNAUTHORIZED      | Not authenticated                             |
| 404    | NOT_FOUND         | Generation session not found                  |
| 409    | ALREADY_FINALIZED | Generation session has already been finalized |
| 500    | INTERNAL_ERROR    | Failed to save flashcards                     |

**Notes:**

- Updates `generation_sessions.accepted_count` with the number of accepted flashcards
- All created flashcards have `source = 'ai_generated'` and reference the generation session

---

#### GET /api/generations

Retrieves the user's generation history.

**Authentication:**

- User is automatically identified from session cookies
- Only returns generation sessions belonging to the authenticated user (explicit filter + RLS as safety net)

**Query Parameters:**

| Parameter | Type    | Required | Default | Description             |
|-----------|---------|----------|---------|-------------------------|
| page      | integer | No       | 1       | Page number (1-indexed) |
| limit     | integer | No       | 20      | Items per page (1-100)  |

**Response (200 OK):**

```json
{
  "generations": [
    {
      "id": "uuid",
      "source_text_preview": "First 200 characters of the source text...",
      "model_used": "gpt-4",
      "generated_count": 10,
      "accepted_count": 7,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

**Error Responses:**

| Status | Code             | Message                       |
|--------|------------------|-------------------------------|
| 400    | VALIDATION_ERROR | Invalid pagination parameters |
| 401    | UNAUTHORIZED     | Not authenticated             |
| 500    | INTERNAL_ERROR   | Failed to fetch generations   |

---

#### GET /api/generations/:id

Retrieves a single generation session with full details.

**Authentication:**

- User is automatically identified from session cookies
- Can only retrieve generation sessions belonging to the authenticated user (explicit filter + RLS as safety net)

**Path Parameters:**

| Parameter | Type | Description           |
|-----------|------|-----------------------|
| id        | UUID | Generation session ID |

**Response (200 OK):**

```json
{
  "id": "uuid",
  "source_text": "Full source text...",
  "model_used": "gpt-4",
  "generated_count": 10,
  "accepted_count": 7,
  "created_at": "2024-01-15T10:30:00Z",
  "flashcards": [
    {
      "id": "uuid",
      "front": "Question text",
      "back": "Answer text",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Code             | Message                            |
|--------|------------------|------------------------------------|
| 400    | VALIDATION_ERROR | Invalid generation ID format       |
| 401    | UNAUTHORIZED     | Not authenticated                  |
| 404    | NOT_FOUND        | Generation session not found       |
| 500    | INTERNAL_ERROR   | Failed to fetch generation session |

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** with **cookie-based session management** for server-side rendered (SSR) applications.

**Implementation Pattern: Supabase SSR (@supabase/ssr)**

This approach is optimized for Astro (or Next.js, SvelteKit, etc.) where authentication happens on the server:

1. **Client Setup:**
   ```typescript
   // src/db/supabase.client.ts
   import { createServerClient, parseCookieHeader } from '@supabase/ssr';

   const createSupabaseInstance = (apiKey: string, context: SupabaseContext) => {
     return createServerClient(SUPABASE_URL, apiKey, {
       cookieOptions: {
         path: '/',
         secure: true,      // HTTPS only
         httpOnly: true,    // JavaScript cannot access
         sameSite: 'lax',   // CSRF protection
       },
       cookies: {
         getAll() {
           return parseCookieHeader(context.headers.get('Cookie') ?? '');
         },
         setAll(cookiesToSet) {
           cookiesToSet.forEach(({ name, value, options }) =>
             context.cookies.set(name, value, options)
           );
         },
       },
     });
   };
   ```

2. **Session Flow:**
    - **Registration:** User calls `/api/auth/register` with email/password
        - `supabase.auth.signUp()` creates user account **AND** session
        - Cookies are set automatically - user is logged in immediately
    - **Login:** User calls `/api/auth/login` with email/password
        - `supabase.auth.signInWithPassword()` validates credentials and creates session
        - Cookies are set automatically
    - **Cookie Creation:** Supabase Auth automatically sets httpOnly cookies:
        - Cookie name: `sb-<project-ref>-auth-token`
        - Contains: Both access_token and refresh_token (encrypted)
    - **Subsequent Requests:** Browser automatically sends cookies with every request
    - **Middleware Extraction:** Server reads cookies and extracts user context using `supabase.auth.getUser()`

3. **Middleware Implementation:**
   ```typescript
   // src/middleware/index.ts
   const supabase = createSupabaseServerInstance({
     cookies,
     headers: request.headers,
   });

   const { data: { user } } = await supabase.auth.getUser();

   if (user) {
     locals.user = {
       email: user.email ?? null,
       id: user.id,
     };
   }
   ```

4. **Token Refresh:**
    - Handled automatically by Supabase client on the server
    - When access token expires, refresh token is used transparently
    - New cookies are set automatically via `setAll()` callback

5. **Why Cookie-Based vs Bearer Tokens?**
    - **Security:** httpOnly cookies cannot be stolen via XSS attacks
    - **SSR-Friendly:** Middleware has direct access to cookies without parsing headers
    - **Automatic Refresh:** Token refresh happens transparently on the server
    - **Browser Convenience:** No client-side token management needed

### 3.2 Authorization

**Row Level Security (RLS) - Defense in Depth:**

- All tables have RLS enabled in the database
- Policies ensure users can only access their own data
- RLS is enforced at the database level as a **security safety net**
- Example policy: `(auth.uid() = user_id)` ensures users only see their own rows
- **Important:** RLS should NOT be relied upon as the sole filtering mechanism

**Middleware-Level Checks:**

- Middleware extracts user context from session cookies on every request
- User object is stored in `locals.user` for API endpoints to access
- Unauthenticated requests:
    - API routes (starting with `/api/`) → Return 401 JSON response
    - Page routes → Redirect to `/auth/login`

**API-Level Authorization:**

- Protected endpoints access user ID from `locals.user.id`
- Supabase client is initialized with user session from cookies
- **Always use explicit filters in queries** (e.g., `.eq('user_id', userId)`)
- RLS provides defense in depth but should not replace explicit filtering

**Why Explicit Filtering + RLS (Supabase Best Practice):**

- **Performance:** Explicit filters allow query optimizer to work efficiently; RLS alone forces the database to process
  all rows before filtering
- **Clarity:** Code explicitly shows data access intent
- **Debugging:** Easier to troubleshoot when filters are visible in code
- **Defense in Depth:** RLS acts as a safety net if explicit filter is accidentally omitted

**Authorization Flow Example:*

```typescript
// API endpoint: /api/flashcards
export const GET: APIRoute = async ({ locals }) => {
  // locals.user is populated by middleware from cookies
  const userId = locals.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    });
  }

  // Explicit filter + RLS as safety net (Supabase best practice)
  const { data } = await locals.supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId);  // Always filter explicitly for performance

  return new Response(JSON.stringify({ flashcards: data }));
};
```

### 3.3 Security Measures

1. **HTTPS Only:**
    - All API communication must use HTTPS
    - `secure: true` cookie flag ensures cookies only sent over HTTPS

2. **Cookie Security:**
    - `httpOnly: true` - Cookies inaccessible to JavaScript (XSS protection)
    - `sameSite: 'lax'` - CSRF protection for most requests
    - `secure: true` - Cookies only transmitted over HTTPS
    - Automatic token encryption by Supabase Auth

3. **Input Validation:**
    - All inputs validated server-side before database operations
    - Use Zod schemas for type-safe validation
    - Sanitize user inputs to prevent injection attacks

4. **Rate Limiting:**
    - Authentication endpoints (prevent brute force attacks):
        - `/api/auth/login` - 3 seconds between attempts
        - `/api/auth/register` - 60 seconds between attempts
    - AI generation endpoints (prevent abuse and control costs):
        - `/api/generations` - Consider token bucket or fixed window rate limiting

5. **CORS Configuration (only needed if frontend and API are on different domains):**
    - Restrict to allowed origins only
    - For cookie-based auth, ensure `credentials: 'include'` on client-side fetch requests
    - Configure proper `Access-Control-Allow-Origin` headers (cannot use `*` with credentials)
    - Note: Not needed for same-origin requests (e.g., Astro SSR where frontend and API share the same domain)

6. **Database Security:**
    - Row Level Security (RLS) enabled on all tables as a safety net
    - All queries MUST use explicit user_id filters for performance (RLS alone causes full table scans)
    - Defense in depth: RLS blocks unauthorized access even if explicit filter is accidentally omitted

7. **Email Verification (Future Enhancement):**
    - **MVP:** Email confirmation is DISABLED for faster development/testing
    - **Production consideration:** Enable email confirmation to:
        - Prevent spam account creation
        - Ensure valid email addresses for password reset
        - Comply with email marketing regulations (if applicable)
    - Implementation would require:
        - Supabase email templates configuration
        - Email service provider integration (e.g., Resend, SendGrid)
        - Modified RLS policies to restrict unconfirmed users (optional)

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Endpoint

#### Authentication Endpoints

| Endpoint                | Field    | Validation Rules               |
|-------------------------|----------|--------------------------------|
| POST /api/auth/register | email    | Required, valid email format   |
| POST /api/auth/register | password | Required, minimum 8 characters |
| POST /api/auth/login    | email    | Required                       |
| POST /api/auth/login    | password | Required                       |

#### Flashcard Endpoints

| Endpoint                | Field  | Validation Rules                           |
|-------------------------|--------|--------------------------------------------|
| POST /api/flashcards    | front  | Required, 1-500 characters                 |
| POST /api/flashcards    | back   | Required, 1-2000 characters                |
| PUT /api/flashcards/:id | front  | Required, 1-500 characters                 |
| PUT /api/flashcards/:id | back   | Required, 1-2000 characters                |
| GET /api/flashcards     | page   | Optional, positive integer, default 1      |
| GET /api/flashcards     | limit  | Optional, 1-100, default 20                |
| GET /api/flashcards     | source | Optional, enum: 'ai_generated', 'manual'   |
| GET /api/flashcards     | sort   | Optional, enum: 'created_at', 'updated_at' |
| GET /api/flashcards     | order  | Optional, enum: 'asc', 'desc'              |

#### Generation Endpoints

| Endpoint                         | Field              | Validation Rules                      |
|----------------------------------|--------------------|---------------------------------------|
| POST /api/generations            | source_text        | Required, 1000-10000 characters       |
| POST /api/generations/:id/accept | flashcards         | Required, non-empty array             |
| POST /api/generations/:id/accept | flashcards[].front | Required, 1-500 characters            |
| POST /api/generations/:id/accept | flashcards[].back  | Required, 1-2000 characters           |
| GET /api/generations             | page               | Optional, positive integer, default 1 |
| GET /api/generations             | limit              | Optional, 1-100, default 20           |

### 4.2 Business Logic Implementation

#### AI Flashcard Generation Flow

```
1. User submits source_text (1000-10000 chars)
                ↓
2. API validates input
                ↓
3. Call Openrouter.ai API with source_text
                ↓
    ┌───────────┴───────────┐
    ↓ Success               ↓ Failure
4a. Create generation_     4b. Create generation_error_log
    session record              ↓
    (accepted_count=NULL)   Return error response
    ↓
5. Return proposals to client (with generation_id)
    ↓
6. User reviews and modifies proposals (client-side)
    ↓
7. User submits accepted flashcards to POST /api/generations/:id/accept
    ↓
8. Create flashcards with source='ai_generated'
    ↓
9. Update session.accepted_count
    ↓
10. Return created flashcards
```

**Key point:** `generation_sessions` is only created after a **successful** AI call (stores metadata for successful
generations). `generation_error_logs` is created only on **failure** (stores logs for failed attempts).

#### Manual Flashcard Creation

```
1. User submits front and back text
                ↓
2. API validates input (char limits)
                ↓
3. Create flashcard with source='manual', generation_id=NULL
                ↓
4. Return created flashcard
```

#### Flashcard Source Attribution

- **source='manual':** Flashcard created via POST /api/flashcards
- **source='ai_generated':** Flashcard created via POST /api/generations/:id/accept
- **generation_id:** Links AI-generated flashcards to their generation session (NULL for manual)

#### Generation Session Finalization

A generation session is considered "finalized" when `accepted_count` is set (not NULL). Once finalized:

- The `accepted_count` cannot be modified
- Additional flashcards cannot be added to the session

#### Statistics Calculation

For metrics reporting (PRD requirement - 75% acceptance rate target):

```sql
-- Acceptance rate per session
SELECT accepted_count::float / NULLIF(generated_count, 0) * 100 as acceptance_rate
FROM generation_sessions
WHERE accepted_count IS NOT NULL;

-- Overall acceptance rate
SELECT SUM(accepted_count) ::float / NULLIF(SUM(generated_count), 0) * 100 as overall_acceptance_rate
FROM generation_sessions
WHERE accepted_count IS NOT NULL;

-- Flashcard source distribution
SELECT source,
       COUNT(*) as count,
  COUNT(*)::float / SUM(COUNT(*)) OVER () * 100 as percentage
FROM flashcards
GROUP BY source;
```

### 4.3 Error Handling Strategy

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Error Code Categories:**

- `VALIDATION_ERROR` - Input validation failures
- `UNAUTHORIZED` - Authentication required
- `NOT_FOUND` - Resource not found
- `ALREADY_FINALIZED` - Business logic constraint violation
- `AI_SERVICE_ERROR` - AI generation failure
- `AI_SERVICE_UNAVAILABLE` - AI service temporarily unavailable
- `INTERNAL_ERROR` - Unexpected server error

### 4.4 Pagination Strategy

All list endpoints use offset-based pagination:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

**Implementation Notes:**

- Default page size: 20
- Maximum page size: 100
- Total count is included for client-side pagination UI
- Uses existing database indexes for efficient queries