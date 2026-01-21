import type { APIRoute } from "astro";
import { loginSchema } from "../../../lib/schemas/auth.schema";
import type { LoginResponseDTO, ErrorResponseDTO } from "../../../types";

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
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Validate
  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { email, password } = validation.data;

  // 3. Sign in
  const { data, error } = await locals.supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 4. Handle errors
  if (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Success
  const response: LoginResponseDTO = {
    user: {
      id: data.user.id,
      email: data.user.email!,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
