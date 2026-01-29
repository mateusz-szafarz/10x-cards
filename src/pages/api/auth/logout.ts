import type { APIRoute } from 'astro';
import type { LogoutResponseDTO, ErrorResponseDTO } from '../../../types';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  // 1. Check auth (middleware already did, but explicit for clarity)
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

  // 2. Sign out
  const { error } = await locals.supabase.auth.signOut();

  if (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. Success
  const response: LogoutResponseDTO = {
    message: 'Logged out successfully',
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
