import type { APIRoute } from 'astro';
import { createSupabaseAdminInstance } from '../../../db/supabase.client';
import type { DeleteAccountResponseDTO, ErrorResponseDTO } from '../../../types';

export const prerender = false;

export const DELETE: APIRoute = async ({ locals, cookies, request }) => {
  // 1. Check auth
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userId = locals.user.id;

  // 2. Create admin client (required for deleteUser)
  const supabaseAdmin = createSupabaseAdminInstance({
    cookies,
    headers: request.headers,
  });

  // 3. Delete user (CASCADE handles related data)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Account deletion error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Account deletion failed',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 4. Sign out to clear cookies
  await locals.supabase.auth.signOut();

  // 5. Success
  const response: DeleteAccountResponseDTO = {
    message: 'Account deleted successfully',
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
