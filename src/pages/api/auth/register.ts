import type { APIRoute } from 'astro';
import { registerSchema } from '../../../lib/schemas/auth.schema';
import type { RegisterResponseDTO, ErrorResponseDTO } from '../../../types';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Parse JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid JSON in request body',
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 2. Validate input
  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message || 'Validation failed',
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { email, password } = validation.data;

  // 3. Register with Supabase Auth
  const { data, error } = await locals.supabase.auth.signUp({
    email,
    password,
  });

  // 4. Handle errors
  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
        } satisfies ErrorResponseDTO),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!data.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 5. Success - cookies set automatically by Supabase
  const response: RegisterResponseDTO = {
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
    },
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
