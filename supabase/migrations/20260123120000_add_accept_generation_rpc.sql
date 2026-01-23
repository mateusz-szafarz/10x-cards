-- Migration: Add accept_generation RPC function
-- Purpose: Ensure atomic operation when accepting AI-generated flashcards
-- Features:
--   - Validates generation session exists and belongs to user
--   - Ensures session not already finalized
--   - Inserts flashcards in bulk
--   - Updates accepted_count in generation_sessions
--   - Returns created flashcards with IDs

create or replace function accept_generation(
  p_generation_id uuid,
  p_user_id uuid,
  p_flashcards jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_session record;
  v_accepted_count integer;
  v_result jsonb;
  v_flashcards jsonb;
begin
  -- Step 1: Verify generation session exists and belongs to user
  select id, user_id, accepted_count
  into v_session
  from generation_sessions
  where id = p_generation_id
    and user_id = p_user_id;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'NOT_FOUND',
        'message', 'Generation session not found'
      )
    );
  end if;

  -- Step 2: Verify session not already finalized
  if v_session.accepted_count is not null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'ALREADY_FINALIZED',
        'message', 'Generation session has already been finalized'
      )
    );
  end if;

  -- Step 3: Calculate accepted count
  v_accepted_count := jsonb_array_length(p_flashcards);

  -- Step 4: Insert flashcards in bulk
  with inserted_flashcards as (
    insert into flashcards (user_id, front, back, source, generation_id)
    select
      p_user_id,
      (flashcard->>'front')::text,
      (flashcard->>'back')::text,
      'ai_generated'::flashcard_source,
      p_generation_id
    from jsonb_array_elements(p_flashcards) as flashcard
    returning id, front, back, source, generation_id, created_at, updated_at
  )
  select jsonb_agg(
    jsonb_build_object(
      'id', id,
      'front', front,
      'back', back,
      'source', source,
      'generation_id', generation_id,
      'created_at', created_at,
      'updated_at', updated_at
    )
  )
  into v_flashcards
  from inserted_flashcards;

  -- Step 5: Update generation_sessions.accepted_count
  update generation_sessions
  set accepted_count = v_accepted_count
  where id = p_generation_id;

  -- Step 6: Return success response
  return jsonb_build_object(
    'flashcards', v_flashcards,
    'accepted_count', v_accepted_count
  );

exception
  when others then
    -- Catch any unexpected errors
    return jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'INTERNAL_ERROR',
        'message', SQLERRM
      )
    );
end;
$$;

-- Add comment for documentation
comment on function accept_generation(uuid, uuid, jsonb) is
  'Accepts AI-generated flashcard proposals and saves them atomically. Returns error object on failure.';
