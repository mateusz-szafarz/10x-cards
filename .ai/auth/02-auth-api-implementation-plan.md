# Plan Implementacji Autentykacji API

## 1. Przegląd

Dokument opisuje szczegółowy plan implementacji autentykacji w API aplikacji 10x-cards. Implementacja opiera się na:

- **Supabase Auth** z cookie-based session management
- **@supabase/ssr** dla poprawnej obsługi SSR w Astro
- **Zod** do walidacji danych wejściowych

### Scope

| Endpoint             | Metoda | Opis                           |
|----------------------|--------|--------------------------------|
| `/api/auth/register` | POST   | Rejestracja nowego użytkownika |
| `/api/auth/login`    | POST   | Logowanie użytkownika          |
| `/api/auth/logout`   | POST   | Wylogowanie użytkownika        |
| `/api/auth/account`  | DELETE | Usunięcie konta (GDPR)         |

### Poza scope MVP

- ❌ Captcha
- ❌ Email verification (wyłączone)
- ❌ Rate limiting
- ❌ Password reset flow
- ❌ OAuth providers

---

## 2. Architektura rozwiązania

### 2.1 Przepływ autentykacji

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Middleware │────▶│ API Endpoint│────▶│  Supabase   │
│             │     │             │     │             │     │    Auth     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       │   Request + Cookie│                   │                   │
       │──────────────────▶│                   │                   │
       │                   │  getUser()        │                   │
       │                   │──────────────────▶│                   │
       │                   │  locals.user      │                   │
       │                   │◀──────────────────│                   │
       │                   │                   │  signUp/signIn    │
       │                   │                   │──────────────────▶│
       │                   │                   │  Session cookies  │
       │                   │                   │◀──────────────────│
       │  Response + Set-Cookie               │                   │
       │◀─────────────────────────────────────│                   │
```

### 2.2 Struktura plików do utworzenia/modyfikacji

```
src/
├── db/
│   └── supabase.client.ts          # [MODYFIKACJA] Migracja na @supabase/ssr
├── middleware/
│   └── index.ts                    # [MODYFIKACJA] Dodanie auth validation
├── lib/
│   └── schemas/
│       └── auth.schema.ts          # [NOWY] Schematy Zod dla auth
├── pages/
│   └── api/
│       └── auth/
│           ├── register.ts         # [NOWY] POST /api/auth/register
│           ├── login.ts            # [NOWY] POST /api/auth/login
│           ├── logout.ts           # [NOWY] POST /api/auth/logout
│           └── account.ts          # [NOWY] DELETE /api/auth/account
├── types.ts                        # [MODYFIKACJA] Aktualizacja typów auth
└── env.d.ts                        # [MODYFIKACJA] Rozszerzenie App.Locals
```

---

## 3. Etapy implementacji

### Etap 1: Konfiguracja środowiska

#### 3.1.1 Instalacja zależności

```bash
npm install @supabase/ssr
```

#### 3.1.2 Zmienne środowiskowe (to zrobię manualnie, ale dokumentuję tutaj)

Dodać do `.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Zaktualizować `astro.config.mjs`:

```typescript
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  // ...
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      SUPABASE_KEY: envField.string({ context: 'server', access: 'secret' }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
```

---

### Etap 2: Migracja Supabase Client

#### 3.2.1 Plik: `src/db/supabase.client.ts`

**Przed (obecny stan):**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export { supabaseClient };
```

**Po (docelowy stan):**

```typescript
import type { AstroCookies } from "astro";
import { createServerClient, parseCookieHeader, type CookieOptionsWithName } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import type { Database } from "./database.types";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

type SupabaseContext = {
  headers: Headers;
  cookies: AstroCookies;
};

const createSupabaseInstance = (apiKey: string, context: SupabaseContext) => {
  return createServerClient<Database>(SUPABASE_URL, apiKey, {
    cookieOptions,
    cookies: {
      getAll() {
        const cookieHeader = context.headers.get("Cookie") ?? "";
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options)
        );
      },
    },
  });
};

export const createSupabaseServerInstance = (context: SupabaseContext) => {
  return createSupabaseInstance(SUPABASE_KEY, context);
};

export const createSupabaseAdminInstance = (context: SupabaseContext) => {
  return createSupabaseInstance(SUPABASE_SERVICE_ROLE_KEY, context);
};
```

**Kluczowe zmiany:**

- Migracja z singleton `createClient` na factory function `createServerClient`
- Instancja tworzona per-request (nie singleton)
- Pełna obsługa cookies (getAll/setAll)
- Dwa warianty: server (anon key) i admin (service role key)

---

### Etap 3: Aktualizacja typów

#### 3.3.1 Plik: `src/env.d.ts`

```typescript
/// <reference path="../.astro/types.d.ts" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string | null;
      };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
```

#### 3.3.2 Plik: `src/types.ts` - modyfikacje

**Usunąć:**

```typescript
// USUNĄĆ - tokeny nie są zwracane w response (są w cookies)
export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
```

**Zmodyfikować:**

```typescript
// PRZED
export interface LoginResponseDTO {
  user: AuthUserDTO;
  session: SessionDTO;
}

// PO
export interface LoginResponseDTO {
  user: AuthUserDTO;
}
```

**Dodać:**

```typescript
/**
 * Response from POST /api/auth/logout
 */
export interface LogoutResponseDTO {
  message: string;
}

/**
 * Response from DELETE /api/auth/account
 */
export interface DeleteAccountResponseDTO {
  message: string;
}
```

---

### Etap 4: Schematy walidacji Zod

#### 3.4.1 Plik: `src/lib/schemas/auth.schema.ts`

```typescript
import { z } from "zod";

/**
 * Schema for user registration.
 * POST /api/auth/register
 */
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Schema for user login.
 * POST /api/auth/login
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Type inference
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

### Etap 5: Middleware

#### 3.5.1 Plik: `src/middleware/index.ts`

```typescript
import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Ścieżki publiczne - nie wymagają autentykacji
const PUBLIC_PATHS = [
  "/api/auth/register",
  "/api/auth/login",
  // Dodać publiczne strony gdy będą istnieć
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Tworzenie instancji Supabase per-request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Przypisanie do locals
  locals.supabase = supabase;

  // Pobranie sesji użytkownika
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Przypisanie użytkownika do locals (jeśli zalogowany)
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? null,
    };
  }

  // Ścieżki publiczne - przepuść dalej
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Chronione ścieżki API - zwróć 401
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

  // Chronione strony - redirect do logowania (gdy będą istnieć strony auth)
  // if (!user) {
  //   return redirect("/auth/login");
  // }

  return next();
});
```

---

### Etap 6: Endpointy autentykacji

#### 3.6.1 Plik: `src/pages/api/auth/register.ts`

```typescript
import type { APIRoute } from "astro";
import { registerSchema } from "../../../lib/schemas/auth.schema";
import type { RegisterResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Parse request body
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

  // 2. Validate input
  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Validation failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { email, password } = validation.data;

  // 3. Register user with Supabase Auth
  const { data, error } = await locals.supabase.auth.signUp({
    email,
    password,
  });

  // 4. Handle errors
  if (error) {
    // Check for existing user
    if (error.message.toLowerCase().includes("already registered")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "USER_EXISTS",
            message: "User with this email already exists",
          },
        } satisfies ErrorResponseDTO),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Registration failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Validate user was created
  if (!data.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Registration failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6. Return success response
  // Note: Session cookies are automatically set by Supabase client
  // via setAll() callback defined in createSupabaseInstance
  const response: RegisterResponseDTO = {
    user: {
      id: data.user.id,
      email: data.user.email!,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
```

#### 3.6.2 Plik: `src/pages/api/auth/login.ts`

```typescript
import type { APIRoute } from "astro";
import { loginSchema } from "../../../lib/schemas/auth.schema";
import type { LoginResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Parse request body
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

  // 2. Validate input
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

  // 3. Sign in with Supabase Auth
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

  // 5. Return success response
  // Note: Session cookies are automatically set by Supabase client
  // via setAll() callback defined in createSupabaseInstance
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
```

#### 3.6.3 Plik: `src/pages/api/auth/logout.ts`

```typescript
import type { APIRoute } from "astro";
import type { LogoutResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  // 1. Check if user is authenticated
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        },
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Sign out
  const { error } = await locals.supabase.auth.signOut();

  // 3. Handle errors
  if (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Logout failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Return success response
  const response: LogoutResponseDTO = {
    message: "Logged out successfully",
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

#### 3.6.4 Plik: `src/pages/api/auth/account.ts`

```typescript
import type { APIRoute } from "astro";
import { createSupabaseAdminInstance } from "../../../db/supabase.client";
import type { DeleteAccountResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const DELETE: APIRoute = async ({ locals, cookies, request }) => {
  // 1. Check if user is authenticated
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        },
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = locals.user.id;

  // 2. Create admin client (required to delete user from auth.users)
  const supabaseAdmin = createSupabaseAdminInstance({
    cookies,
    headers: request.headers,
  });

  // 3. Delete user (CASCADE will handle related data)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  // 4. Handle errors
  if (error) {
    console.error("Account deletion error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Account deletion failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Sign out to clear session cookies
  await locals.supabase.auth.signOut();

  // 6. Return success response
  const response: DeleteAccountResponseDTO = {
    message: "Account deleted successfully",
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

---

### Etap 7: Aktualizacja istniejącego endpointu

#### 3.7.1 Plik: `src/pages/api/generations/index.ts`

**Zmiana: Usunięcie hardcoded user ID i użycie sesji**

```typescript
// USUNĄĆ:
const HARDCODED_USER_ID = "484dc1d3-add5-4701-a9a5-d91b12fb6165";

// ZMODYFIKOWAĆ handler:
export const POST: APIRoute = async ({ request, locals }) => {
  // Użytkownik jest już zweryfikowany przez middleware
  // locals.user jest dostępny tylko dla zalogowanych użytkowników
  const userId = locals.user!.id;  // Non-null assertion bo middleware gwarantuje

  // ... reszta kodu bez zmian, ale używając userId zamiast HARDCODED_USER_ID
  const result = await generationService.generateFlashcards(
    validationResult.data.source_text,
    userId  // Zmiana: użycie ID z sesji
  );
  // ...
};
```

---

## 4. Testowanie

### 4.1 Scenariusze testowe (manualne)

| Scenariusz                                   | Oczekiwany rezultat                             |
|----------------------------------------------|-------------------------------------------------|
| Rejestracja z poprawnymi danymi              | 201 Created, user w response, cookies ustawione |
| Rejestracja z istniejącym emailem            | 409 Conflict, USER_EXISTS                       |
| Rejestracja z niepoprawnym emailem           | 400 Bad Request, VALIDATION_ERROR               |
| Rejestracja z hasłem < 8 znaków              | 400 Bad Request, VALIDATION_ERROR               |
| Logowanie z poprawnymi danymi                | 200 OK, user w response, cookies ustawione      |
| Logowanie z błędnymi danymi                  | 401 Unauthorized, INVALID_CREDENTIALS           |
| Wylogowanie (zalogowany)                     | 200 OK, cookies wyczyszczone                    |
| Wylogowanie (niezalogowany)                  | 401 Unauthorized                                |
| Usunięcie konta (zalogowany)                 | 200 OK, konto i dane usunięte                   |
| Usunięcie konta (niezalogowany)              | 401 Unauthorized                                |
| Dostęp do `/api/generations` (zalogowany)    | 201 Created                                     |
| Dostęp do `/api/generations` (niezalogowany) | 401 Unauthorized                                |

### 4.2 Testowanie cookies

```bash
# Rejestracja
curl -X POST http://localhost:4321/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt -v

# Sprawdzenie sesji (endpoint chroniony)
curl -X POST http://localhost:4321/api/generations \
  -H "Content-Type: application/json" \
  -d '{"source_text":"..."}' \
  -b cookies.txt

# Wylogowanie
curl -X POST http://localhost:4321/api/auth/logout \
  -b cookies.txt -c cookies.txt
```

---

## 5. Kolejność implementacji

1. **Instalacja zależności** (`@supabase/ssr`)
2. **Konfiguracja env** (dodanie `SUPABASE_SERVICE_ROLE_KEY`)
3. **Migracja `supabase.client.ts`** na `@supabase/ssr`
4. **Aktualizacja `env.d.ts`** (dodanie `user` do `Locals`)
5. **Aktualizacja `types.ts`** (usunięcie `SessionDTO`, modyfikacja `LoginResponseDTO`)
6. **Utworzenie `auth.schema.ts`** (schematy Zod)
7. **Modyfikacja `middleware/index.ts`** (pełna walidacja auth)
8. **Implementacja endpointów** (register → login → logout → account)
9. **Aktualizacja `generations/index.ts`** (usunięcie hardcoded user ID)
10. **Testowanie manualne**

---

## 6. Uwagi bezpieczeństwa

1. **Cookies httpOnly** - tokeny niedostępne dla JavaScript (XSS protection)
2. **Cookies secure** - tylko HTTPS
3. **sameSite: lax** - podstawowa ochrona CSRF
4. **Service Role Key** - używany tylko server-side do operacji admin
5. **RLS w bazie** - dodatkowa warstwa zabezpieczeń (defense in depth)
6. **Explicit filtering** - zawsze filtrowanie po `user_id` w zapytaniach

---

## 7. Konfiguracja Supabase Dashboard

### 7.1 Wyłączenie email confirmation (MVP)

W Supabase Dashboard:

1. Authentication → Settings → Email
2. Wyłączyć "Enable email confirmations"

### 7.2 Weryfikacja CASCADE constraints

Upewnić się, że tabele mają poprawne foreign keys z `ON DELETE CASCADE`:

- `flashcards.user_id` → `auth.users.id`
- `generation_sessions.user_id` → `auth.users.id`
- `generation_error_logs.user_id` → `auth.users.id`
