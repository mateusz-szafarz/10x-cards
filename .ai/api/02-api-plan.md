# REST API Plan

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Users | auth.users (Supabase Auth) | User accounts managed by Supabase Auth |
| Flashcards | flashcards | User flashcards (both AI-generated and manual) |
| Generations | generation_sessions | AI generation session metadata |
| Generation Errors | generation_error_logs | Failed AI generation attempts (internal logging) |

## 2. Endpoints

### 2.1 Authentication

Authentication is handled by Supabase Auth SDK. The following endpoints wrap Supabase Auth functionality for server-side operations.

---

#### POST /api/auth/register

Creates a new user account.

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

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid email format |
| 400 | VALIDATION_ERROR | Password must be at least 8 characters |
| 409 | USER_EXISTS | User with this email already exists |
| 500 | INTERNAL_ERROR | Registration failed |

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
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1234567890
  }
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Email and password are required |
| 401 | INVALID_CREDENTIALS | Invalid email or password |
| 500 | INTERNAL_ERROR | Login failed |

---

#### POST /api/auth/logout

Terminates the current user session.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Not authenticated |
| 500 | INTERNAL_ERROR | Logout failed |

---

#### DELETE /api/auth/account

Deletes the user account and all associated data (GDPR compliance).

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Not authenticated |
| 500 | INTERNAL_ERROR | Account deletion failed |

---

### 2.2 Flashcards

All flashcard endpoints require authentication.

---

#### GET /api/flashcards

Retrieves a paginated list of user's flashcards.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (1-indexed) |
| limit | integer | No | 20 | Items per page (1-100) |
| source | string | No | - | Filter by source: 'ai_generated' or 'manual' |
| sort | string | No | created_at | Sort field: 'created_at' or 'updated_at' |
| order | string | No | desc | Sort order: 'asc' or 'desc' |

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid pagination parameters |
| 401 | UNAUTHORIZED | Not authenticated |
| 500 | INTERNAL_ERROR | Failed to fetch flashcards |

---

#### GET /api/flashcards/:id

Retrieves a single flashcard by ID.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Flashcard ID |

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid flashcard ID format |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND | Flashcard not found |
| 500 | INTERNAL_ERROR | Failed to fetch flashcard |

---

#### POST /api/flashcards

Creates a new flashcard manually.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Front is required |
| 400 | VALIDATION_ERROR | Front must be between 1 and 500 characters |
| 400 | VALIDATION_ERROR | Back is required |
| 400 | VALIDATION_ERROR | Back must be between 1 and 2000 characters |
| 401 | UNAUTHORIZED | Not authenticated |
| 500 | INTERNAL_ERROR | Failed to create flashcard |

---

#### PUT /api/flashcards/:id

Updates an existing flashcard.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Flashcard ID |

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Front must be between 1 and 500 characters |
| 400 | VALIDATION_ERROR | Back must be between 1 and 2000 characters |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND | Flashcard not found |
| 500 | INTERNAL_ERROR | Failed to update flashcard |

---

#### DELETE /api/flashcards/:id

Deletes a flashcard permanently.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Flashcard ID |

**Response (204 No Content)**

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid flashcard ID format |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND | Flashcard not found |
| 500 | INTERNAL_ERROR | Failed to delete flashcard |

---

### 2.3 AI Generation

Endpoints for AI-powered flashcard generation.

---

#### POST /api/generations

Initiates an AI generation session. Sends source text to LLM and returns flashcard proposals.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Source text is required |
| 400 | VALIDATION_ERROR | Source text must be between 1000 and 10000 characters |
| 401 | UNAUTHORIZED | Not authenticated |
| 500 | AI_SERVICE_ERROR | Failed to generate flashcards |
| 503 | AI_SERVICE_UNAVAILABLE | AI service is temporarily unavailable |

**Notes:**
- On success, creates a `generation_sessions` record with `accepted_count = NULL`
- On failure, creates a `generation_error_logs` record
- The `flashcards_proposals` are NOT saved to database yet - they are returned for user review

---

#### POST /api/generations/:id/accept

Accepts selected flashcard proposals and saves them to the database.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Generation session ID |

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Flashcards array is required |
| 400 | VALIDATION_ERROR | Flashcards array cannot be empty |
| 400 | VALIDATION_ERROR | Front must be between 1 and 500 characters |
| 400 | VALIDATION_ERROR | Back must be between 1 and 2000 characters |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND | Generation session not found |
| 409 | ALREADY_FINALIZED | Generation session has already been finalized |
| 500 | INTERNAL_ERROR | Failed to save flashcards |

**Notes:**
- Updates `generation_sessions.accepted_count` with the number of accepted flashcards
- All created flashcards have `source = 'ai_generated'` and reference the generation session

---

#### GET /api/generations

Retrieves the user's generation history.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (1-indexed) |
| limit | integer | No | 20 | Items per page (1-100) |

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid pagination parameters |
| 401 | UNAUTHORIZED | Not authenticated |
| 500 | INTERNAL_ERROR | Failed to fetch generations |

---

#### GET /api/generations/:id

Retrieves a single generation session with full details.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Generation session ID |

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

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid generation ID format |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND | Generation session not found |
| 500 | INTERNAL_ERROR | Failed to fetch generation session |

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** with JWT (JSON Web Tokens) for authentication.

**Implementation Details:**

1. **Token Acquisition:**
   - Users obtain tokens via `/api/auth/login` endpoint
   - Tokens are returned as `access_token` (short-lived) and `refresh_token` (long-lived)

2. **Token Usage:**
   - Include the access token in the `Authorization` header: `Bearer <access_token>`
   - Tokens are validated on each API request

3. **Token Refresh:**
   - Handled client-side using Supabase Auth SDK
   - When access token expires, SDK automatically uses refresh token

4. **Session Management:**
   - Sessions are managed by Supabase Auth
   - Session cookies are set for browser-based authentication

### 3.2 Authorization

**Row Level Security (RLS):**
- All tables have RLS enabled
- Policies ensure users can only access their own data
- RLS is enforced at the database level, providing defense in depth

**API-Level Checks:**
- All protected endpoints verify the user's JWT
- User ID is extracted from the JWT and used in database queries
- Supabase client is initialized with user context for RLS enforcement

### 3.3 Security Measures

1. **HTTPS Only:** All API communication must use HTTPS
2. **Input Validation:** All inputs validated server-side before database operations
3. **Rate Limiting:** Consider implementing rate limiting for:
   - Authentication endpoints (prevent brute force)
   - AI generation endpoints (prevent abuse and control costs)
4. **CORS Configuration:** Restrict to allowed origins only

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Endpoint

#### Authentication Endpoints

| Endpoint | Field | Validation Rules |
|----------|-------|------------------|
| POST /api/auth/register | email | Required, valid email format |
| POST /api/auth/register | password | Required, minimum 8 characters |
| POST /api/auth/login | email | Required |
| POST /api/auth/login | password | Required |

#### Flashcard Endpoints

| Endpoint | Field | Validation Rules |
|----------|-------|------------------|
| POST /api/flashcards | front | Required, 1-500 characters |
| POST /api/flashcards | back | Required, 1-2000 characters |
| PUT /api/flashcards/:id | front | Required, 1-500 characters |
| PUT /api/flashcards/:id | back | Required, 1-2000 characters |
| GET /api/flashcards | page | Optional, positive integer, default 1 |
| GET /api/flashcards | limit | Optional, 1-100, default 20 |
| GET /api/flashcards | source | Optional, enum: 'ai_generated', 'manual' |
| GET /api/flashcards | sort | Optional, enum: 'created_at', 'updated_at' |
| GET /api/flashcards | order | Optional, enum: 'asc', 'desc' |

#### Generation Endpoints

| Endpoint | Field | Validation Rules |
|----------|-------|------------------|
| POST /api/generations | source_text | Required, 1000-10000 characters |
| POST /api/generations/:id/accept | flashcards | Required, non-empty array |
| POST /api/generations/:id/accept | flashcards[].front | Required, 1-500 characters |
| POST /api/generations/:id/accept | flashcards[].back | Required, 1-2000 characters |
| GET /api/generations | page | Optional, positive integer, default 1 |
| GET /api/generations | limit | Optional, 1-100, default 20 |

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

**Key point:** `generation_sessions` is only created after a **successful** AI call (stores metadata for successful generations). `generation_error_logs` is created only on **failure** (stores logs for failed attempts).

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
SELECT
  accepted_count::float / NULLIF(generated_count, 0) * 100 as acceptance_rate
FROM generation_sessions
WHERE accepted_count IS NOT NULL;

-- Overall acceptance rate
SELECT
  SUM(accepted_count)::float / NULLIF(SUM(generated_count), 0) * 100 as overall_acceptance_rate
FROM generation_sessions
WHERE accepted_count IS NOT NULL;

-- Flashcard source distribution
SELECT
  source,
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