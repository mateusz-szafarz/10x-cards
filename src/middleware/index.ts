import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerInstance } from '../db/supabase.client';

// Public paths - do not require authentication
const PUBLIC_PATHS = ['/api/auth/register', '/api/auth/login', '/api/auth/logout'];

// Protected page paths - require authentication
const PROTECTED_PAGE_PATHS = ['/flashcards', '/generate'];

// Auth page paths - redirect to /flashcards if already authenticated
const AUTH_PAGE_PATHS = ['/login', '/register'];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request }, next) => {
  // Create per-request Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Assign user to locals (if authenticated) - with email guard
  if (user) {
    // Guard: email should always exist for email/password auth
    // If missing, treat as unauthenticated
    if (!user.email) {
      locals.user = undefined;
    } else {
      locals.user = {
        id: user.id,
        email: user.email, // Now guaranteed to be string
      };
    }
  }

  // Public paths - proceed without auth check
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Protected API paths - return 401 if not authenticated
  if (!locals.user && url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Protected pages - redirect to login if not authenticated
  if (!locals.user && PROTECTED_PAGE_PATHS.some((p) => url.pathname.startsWith(p))) {
    return Response.redirect(new URL('/login', url.origin));
  }

  // Auth pages - redirect to flashcards if already authenticated
  if (locals.user && AUTH_PAGE_PATHS.includes(url.pathname)) {
    return Response.redirect(new URL('/flashcards', url.origin));
  }

  return next();
});
