import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Public paths - do not require authentication
const PUBLIC_PATHS = ["/api/auth/register", "/api/auth/login"];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request }, next) => {
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

    // Assign user to locals (if authenticated)
    if (user) {
      locals.user = {
        id: user.id,
        email: user.email ?? null,
      };
    }

    // Public paths - proceed without auth check
    if (PUBLIC_PATHS.includes(url.pathname)) {
      return next();
    }

    // Protected API paths - return 401 if not authenticated
    if (!user && url.pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return next();
  }
);
