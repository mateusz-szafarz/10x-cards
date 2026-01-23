Poniżej zamieszczam listę potencjalnych rzeczy do przetestowania w nowo dodanych endpointach.

<assertion_ideas>

#### POST /api/flashcards

- ✅ Valid request creates flashcard with `source='manual'` and `generation_id=null`
- ✅ Missing `front` returns 400 with proper error message
- ✅ Missing `back` returns 400 with proper error message
- ✅ `front` too long (>500 chars) returns 400
- ✅ `back` too long (>2000 chars) returns 400
- ✅ Unauthenticated request returns 401 (middleware blocks)

#### GET /api/flashcards

- ✅ Returns paginated list of user's flashcards
- ✅ `page=2` returns second page
- ✅ `limit=10` returns max 10 items
- ✅ `source=manual` filters only manual flashcards
- ✅ `source=ai_generated` filters only AI flashcards
- ✅ `sort=updated_at&order=asc` sorts correctly
- ✅ Invalid query params return 400 with proper error
- ✅ User only sees their own flashcards (test with 2 users)

#### GET /api/flashcards/:id

- ✅ Valid ID returns flashcard
- ✅ Invalid UUID format returns 400
- ✅ Non-existent ID returns 404
- ✅ Other user's flashcard returns 404 (RLS working)

#### PUT /api/flashcards/:id

- ✅ Valid request updates flashcard and returns updated data
- ✅ Invalid UUID format returns 400
- ✅ Non-existent ID returns 404
- ✅ Validation errors return 400
- ✅ Other user's flashcard returns 404 (RLS working)
- ✅ `updated_at` timestamp is updated automatically

#### DELETE /api/flashcards/:id

- ✅ Valid request deletes flashcard and returns 204
- ✅ Invalid UUID format returns 400
- ✅ Non-existent ID returns 404
- ✅ Other user's flashcard returns 404 (RLS working)
- ✅ Flashcard is permanently deleted from database

#### POST /api/generations/:id/accept

- ✅ Valid request creates all flashcards with `source='ai_generated'`
- ✅ Updates `generation_sessions.accepted_count` correctly
- ✅ Returns created flashcards with IDs
- ✅ Invalid generation ID format returns 400
- ✅ Non-existent generation ID returns 404
- ✅ Already finalized generation returns 409
- ✅ Empty flashcards array returns 400
- ✅ Invalid flashcard data returns 400 with proper message
- ✅ Other user's generation returns 404 (RLS working)
  </assertion_ideas>

Na podstawie tej listy oraz referencji zamieszczonych poniżej zaimplementuj kilka podstawowych scenariuszy testowych
wykorzystujących funkcjonalność IntelliJ HTTP client (koniecznie minimum do smoke testów).

Referencje:

- projekt PRD: @.ai/prd.md
- tech stack: @.ai/tech-stack.md
- przewodnik tworzenia scenariuszy testowych w IntelliJ HTTP client:
  @.claude/on-demand-rules/guide-for-creating-api-test-scenarios.md
- przykład obrazujący proces tworzenia nowej aktywnej sesji: @.http/scenarios/auth/01-registration-happy-path.http

Wygenerowane scenariusze zapisz w katalogu: /home/mateusz/projects/plg/10x-cards/.http/scenarios/func