# Database Schema for 10x-cards

## 1. Tables

### 1.1 Type Definitions

```sql
CREATE TYPE flashcard_source AS ENUM ('ai_generated', 'manual');
```

### 1.2 flashcards

Stores user flashcards (both AI-generated and manually created).

| Column        | Type                     | Constraints                                      |
|---------------|--------------------------|--------------------------------------------------|
| id            | UUID                     | PRIMARY KEY, DEFAULT gen_random_uuid()           |
| user_id       | UUID                     | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| generation_id | UUID                     | REFERENCES generation_sessions(id) ON DELETE SET NULL |
| front         | VARCHAR(500)             | NOT NULL, CHECK (char_length(front) >= 1 AND char_length(front) <= 500) |
| back          | VARCHAR(2000)            | NOT NULL, CHECK (char_length(back) >= 1 AND char_length(back) <= 2000) |
| source        | flashcard_source         | NOT NULL, DEFAULT 'manual'                       |
| created_at    | TIMESTAMPTZ              | NOT NULL, DEFAULT now()                          |
| updated_at    | TIMESTAMPTZ              | NOT NULL, DEFAULT now()                          |

```sql
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES generation_sessions(id) ON DELETE SET NULL,
    front VARCHAR(500) NOT NULL,
    back VARCHAR(2000) NOT NULL,
    source flashcard_source NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT flashcards_front_length CHECK (char_length(front) >= 1 AND char_length(front) <= 500),
    CONSTRAINT flashcards_back_length CHECK (char_length(back) >= 1 AND char_length(back) <= 2000)
);
```

### 1.3 generation_sessions

Stores metadata for successful AI generation sessions.

| Column          | Type           | Constraints                                      |
|-----------------|----------------|--------------------------------------------------|
| id              | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid()           |
| user_id         | UUID           | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| source_text     | TEXT           | NOT NULL, CHECK (char_length between 1000-10000) |
| model_used      | VARCHAR(100)   | NOT NULL                                         |
| generated_count | INTEGER        | NOT NULL, CHECK (>= 0)                           |
| accepted_count  | INTEGER        | CHECK (>= 0), can be NULL until session is finalized |
| created_at      | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                          |

```sql
CREATE TABLE generation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    generated_count INTEGER NOT NULL,
    accepted_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT generation_sessions_source_text_length CHECK (char_length(source_text) >= 1000 AND char_length(source_text) <= 10000),
    CONSTRAINT generation_sessions_generated_count_positive CHECK (generated_count >= 0),
    CONSTRAINT generation_sessions_accepted_count_positive CHECK (accepted_count IS NULL OR accepted_count >= 0)
);
```

### 1.4 generation_error_logs

Stores logs for failed AI generation attempts.

| Column        | Type           | Constraints                                      |
|---------------|----------------|--------------------------------------------------|
| id            | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid()           |
| user_id       | UUID           | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| source_text   | TEXT           | NOT NULL, CHECK (char_length between 1000-10000) |
| error_code    | VARCHAR(50)    | NOT NULL                                         |
| error_message | TEXT           | NOT NULL                                         |
| model_used    | VARCHAR(100)   | NOT NULL                                         |
| created_at    | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                          |

```sql
CREATE TABLE generation_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    error_code VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT generation_error_logs_source_text_length CHECK (char_length(source_text) >= 1000 AND char_length(source_text) <= 10000)
);
```

## 2. Relationships

```
auth.users (Supabase Auth)
    │
    ├── 1:N ── flashcards
    │              └── N:1 ── generation_sessions (nullable, ON DELETE SET NULL)
    │
    ├── 1:N ── generation_sessions
    │
    └── 1:N ── generation_error_logs
```

| Relationship | Type | On Delete Behavior |
|--------------|------|-------------------|
| auth.users → flashcards | 1:N | CASCADE (user deletion removes all flashcards) |
| auth.users → generation_sessions | 1:N | CASCADE (user deletion removes all sessions) |
| auth.users → generation_error_logs | 1:N | CASCADE (user deletion removes all error logs) |
| generation_sessions → flashcards | 1:N | SET NULL (session deletion preserves flashcards) |

## 3. Indexes

```sql
-- Primary index for fetching user's flashcards
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);

-- Composite index for fetching user's generation history ordered by date
CREATE INDEX idx_generation_sessions_user_id_created_at ON generation_sessions(user_id, created_at DESC);

-- Index for error logs lookup by user
CREATE INDEX idx_generation_error_logs_user_id ON generation_error_logs(user_id);
```

## 4. Row Level Security (RLS) Policies

### 4.1 Enable RLS on all tables

```sql
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;
```

### 4.2 Flashcards policies

```sql
-- Users can only view their own flashcards
CREATE POLICY "Users can view own flashcards"
    ON flashcards FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own flashcards
CREATE POLICY "Users can insert own flashcards"
    ON flashcards FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own flashcards
CREATE POLICY "Users can update own flashcards"
    ON flashcards FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own flashcards
CREATE POLICY "Users can delete own flashcards"
    ON flashcards FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
```

### 4.3 Generation sessions policies

```sql
-- Users can only view their own generation sessions
CREATE POLICY "Users can view own generation sessions"
    ON generation_sessions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own generation sessions
CREATE POLICY "Users can insert own generation sessions"
    ON generation_sessions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own generation sessions
CREATE POLICY "Users can update own generation sessions"
    ON generation_sessions FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own generation sessions
CREATE POLICY "Users can delete own generation sessions"
    ON generation_sessions FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
```

### 4.4 Generation error logs policies

```sql
-- Users can only view their own error logs
CREATE POLICY "Users can view own error logs"
    ON generation_error_logs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own error logs
CREATE POLICY "Users can insert own error logs"
    ON generation_error_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own error logs
CREATE POLICY "Users can delete own error logs"
    ON generation_error_logs FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
```

## 5. Triggers

### 5.1 Auto-update updated_at timestamp

```sql
-- Enable moddatetime extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Trigger for flashcards table
CREATE TRIGGER handle_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);
```

## 6. Design Notes

### 6.1 Key Decisions

1. **Flat flashcard structure**: Flashcards are directly associated with users without intermediate collections/decks layer. This simplifies the MVP and can be extended later.

2. **ENUM for flashcard source**: Using PostgreSQL ENUM type (`flashcard_source`) ensures data integrity and makes querying by source efficient.

3. **VARCHAR for model_used**: Using VARCHAR(100) instead of ENUM allows flexibility when adding new AI models via Openrouter without requiring database migrations.

4. **Nullable generation_id**: Allows manual flashcards (source='manual') to exist without a generation session reference. When a generation session is deleted, flashcards are preserved with generation_id set to NULL.

5. **No separate user profile table**: Relies entirely on Supabase's built-in `auth.users` table to minimize redundancy and maintenance.

6. **Hard delete strategy**: All deletions are permanent (no soft delete). This simplifies GDPR compliance by ensuring complete data removal upon user request.

7. **Processed counts only**: Storing only `generated_count` and `accepted_count` instead of raw API responses reduces storage requirements while still enabling success rate analytics.

8. **Spaced repetition deferred**: The schema does not include spaced repetition metadata (next_review_date, ease_factor, etc.) as this is out of scope for MVP.

### 6.2 GDPR Compliance

- CASCADE DELETE on user_id foreign keys ensures all user data is removed when the user account is deleted
- No data retention after deletion (hard delete policy)
- Users can access and delete their own data through the application

### 6.3 Future Considerations

When implementing spaced repetition, consider adding to `flashcards` table:
- `next_review_at TIMESTAMPTZ`
- `ease_factor DECIMAL`
- `interval_days INTEGER`
- `review_count INTEGER`

This would require a separate migration and may benefit from a dedicated `review_metadata` table to keep the core flashcards table lean.