# Authentication Guide for New API Endpoints

Quick reference for implementing authentication in new API endpoints.

## Protected Endpoints (Default Behavior)

**All `/api/*` endpoints are automatically protected by middleware** - no additional auth code needed in your endpoint.

### What You Get Automatically

- ✅ User authentication check before endpoint execution
- ✅ Automatic 401 response for unauthenticated requests
- ✅ `locals.user` populated with user data
- ✅ `locals.supabase` configured with user session

### Access User Information

```typescript
export const POST: APIRoute = async ({ locals }) => {
  // locals.user is guaranteed to exist (middleware blocks unauthenticated requests)
  const userId = locals.user!.id;
  const userEmail = locals.user!.email;

  // Use locals.supabase for database operations
  const { data, error } = await locals.supabase
    .from("your_table")
    .insert({ user_id: userId, ...otherData });

  // ... rest of your endpoint logic
};
```

### Example: Protected Endpoint

```typescript
// src/pages/api/flashcards/index.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // User authenticated by middleware - locals.user is guaranteed to exist

  const body = await request.json();

  // Use authenticated user ID
  const result = await someService.create(body, locals.user!.id);

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
```

**Key Points:**

- No manual auth check needed
- Use `locals.user!.id` with non-null assertion (safe - middleware guarantees it exists)

---

## Public Endpoints (Opt-In)

If your endpoint should be accessible without authentication (e.g., login, register), add it to the middleware
whitelist.

### Step 1: Add to PUBLIC_PATHS in Middleware

```typescript
// src/middleware/index.ts

const PUBLIC_PATHS = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/your-new-public-endpoint", // Add here
];
```

### Step 2: Implement Endpoint Normally

```typescript
// src/pages/api/your-new-public-endpoint.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // locals.user will be undefined for unauthenticated requests
  // locals.supabase is still available for operations

  const body = await request.json();

  // Public operation (e.g., registration, public data fetch)
  const { data, error } = await locals.supabase.auth.signUp({
    email: body.email,
    password: body.password,
  });

  // ... handle response
};
```

**Key Points:**

- Add path to `PUBLIC_PATHS` array in middleware
- `locals.user` may be `undefined` - check before using
- `locals.supabase` is always available

---

## Common Patterns

### Pattern 1: Optional Authentication

Endpoint works differently for authenticated vs. unauthenticated users:

```typescript
export const GET: APIRoute = async ({ locals }) => {
  if (locals.user) {
    // Return personalized data for authenticated user
    return getUserSpecificData(locals.user.id);
  } else {
    // Return public data
    return getPublicData();
  }
};
```

**Note:** Add to `PUBLIC_PATHS` if you want to allow unauthenticated access.

### Pattern 2: Admin Operations (Service Role Key)

Only use admin client when you need elevated privileges (e.g., deleting users):

```typescript
import { createSupabaseAdminInstance } from "../../../db/supabase.client";

export const DELETE: APIRoute = async ({ locals, cookies, request }) => {
  if (!locals.user) {
    return unauthorizedResponse();
  }

  // Create admin client for privileged operations
  const supabaseAdmin = createSupabaseAdminInstance({
    cookies,
    headers: request.headers,
  });

  // Perform admin operation
  const { error } = await supabaseAdmin.auth.admin.deleteUser(locals.user.id);

  // ... handle response
};
```

**⚠️ Use admin client only when necessary** - most operations should use `locals.supabase`.

---

## Troubleshooting

### Error: `locals.user is undefined` in Protected Endpoint

**Cause:** Endpoint path is in `PUBLIC_PATHS` but shouldn't be.

**Solution:** Remove from `PUBLIC_PATHS` in middleware.

### Error: `401 Unauthorized` for Public Endpoint

**Cause:** Endpoint path missing from `PUBLIC_PATHS`.

**Solution:** Add path to `PUBLIC_PATHS` array in `src/middleware/index.ts`.

### Error: TypeScript complains about `locals.user!.id`

**Cause:** TypeScript doesn't know middleware guarantees `locals.user` exists.

**Solution:** Use non-null assertion (`!`) or add comment:

```typescript
// User authenticated by middleware - locals.user is guaranteed to exist
const userId = locals.user!.id;
```

---

## Security Checklist

Before deploying endpoint to production:

- [ ] Verified endpoint uses `locals.user.id` instead of accepting user ID from request body
- [ ] Checked if endpoint should be in `PUBLIC_PATHS` (default: protected)
- [ ] Used admin client only if elevated privileges required
- [ ] Validated all input with Zod schema
- [ ] Returned appropriate error responses (400, 401, 500)
- [ ] Used `satisfies ErrorResponseDTO` for type-safe errors

---

## Quick Reference

| Scenario               | Action                                          | User Access                      |
|------------------------|-------------------------------------------------|----------------------------------|
| New protected endpoint | Nothing - works by default                      | `locals.user!.id`                |
| New public endpoint    | Add to `PUBLIC_PATHS`                           | `locals.user` may be undefined   |
| Optional auth          | Add to `PUBLIC_PATHS`, check `if (locals.user)` | Check before use                 |
| Admin operation        | Use `createSupabaseAdminInstance()`             | `locals.user!.id` + admin client |

---

## Example Files to Reference

- **Protected endpoint:** `src/pages/api/generations/index.ts`
- **Public endpoint:** `src/pages/api/auth/register.ts`
- **Admin operation:** `src/pages/api/auth/account.ts` (DELETE)
- **Middleware:** `src/middleware/index.ts`