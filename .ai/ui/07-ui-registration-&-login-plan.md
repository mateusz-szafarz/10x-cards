# Implementation Plan: Authentication Views (Login, Registration) and Flashcards Scaffolding

## 1. Overview

This plan covers the implementation of authentication views (login and registration) and the scaffolding for the "My Flashcards" view (`/flashcards`). These views are foundational for the 10x-cards application, enabling users to create accounts, authenticate, and access their personalized flashcard dashboard.

**Key Features:**
- User registration with email and password
- User login with session management via httpOnly cookies
- Redirect to login page after successful registration (email confirmation required in production)
- Route protection for authenticated pages
- Responsive design (mobile-first approach)
- Basic accessibility (semantic HTML, label associations, aria-invalid)

**UI Language:** English (all user-facing text in English)

**User Stories Covered:**
- US-001: Registration
- US-002: Login
- US-009: Secure access and authorization

## 2. View Routing

| Route | Description | Layout | Auth Required |
|-------|-------------|--------|---------------|
| `/login` | Login page | BaseLayout (no nav) | No (redirect to /flashcards if logged in) |
| `/register` | Registration page | BaseLayout (no nav) | No (redirect to /flashcards if logged in) |
| `/flashcards` | My Flashcards page | AppLayout (with nav) | Yes |
| `/generate` | Generate Flashcards page | AppLayout (with nav) | Yes |
| `/` | Home/Landing | N/A | Redirect based on auth status |

**Redirect Logic (handled by middleware):**
- Logged-in user accessing `/login` or `/register` → redirect to `/flashcards`
- Non-logged-in user accessing `/flashcards` → redirect to `/login`
- `/` route → redirect to `/flashcards` (logged in) or `/login` (not logged in)

**Note on Dev vs Production behavior:**
- **Production (email confirmation ON):** After registration, user lands on `/login` and must confirm email before logging in.
- **Development (email confirmation OFF):** After registration, user is redirected to `/login`, but middleware detects active session (email implicitly confirmed) and immediately redirects to `/flashcards`.

## 3. Component Structure

### 3.1 Component Tree Overview

```
src/
├── layouts/
│   ├── BaseLayout.astro          # HTML wrapper without navigation (auth pages)
│   └── AppLayout.astro           # HTML wrapper with navigation (protected pages)
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx         # Interactive login form
│   │   └── RegisterForm.tsx      # Interactive registration form
│   │
│   └── layout/
│       └── Navbar.tsx            # Top navigation bar with user dropdown
│
├── pages/
│   ├── index.astro               # Redirect logic only
│   ├── login.astro               # Login page
│   ├── register.astro            # Registration page
│   ├── flashcards.astro          # My Flashcards page (scaffolding)
│   └── generate.astro            # Generate Flashcards page (scaffolding)
│
└── middleware/
    └── index.ts                  # Extended with page route protection
```

### 3.2 Component Hierarchy

```
/login
└── BaseLayout.astro
    └── <main> (centered flex container)
        └── LoginForm.tsx [client:load]
            └── Card
                ├── CardHeader
                │   ├── Logo/Title
                │   └── CardDescription
                └── CardContent
                    └── <form>
                        ├── FormField (email)
                        │   ├── Label
                        │   ├── Input
                        │   └── ErrorMessage (conditional)
                        ├── FormField (password)
                        │   ├── Label
                        │   ├── Input
                        │   └── ErrorMessage (conditional)
                        ├── Alert (form-level errors, conditional)
                        ├── Button (submit)
                        └── <p> (link to /register)

/register
└── BaseLayout.astro
    ├── Toaster (from sonner, for success toast)
    └── <main> (centered flex container)
        └── RegisterForm.tsx [client:load]
            └── Card
                ├── CardHeader
                │   ├── Logo/Title
                │   └── CardDescription
                └── CardContent
                    └── <form>
                        ├── FormField (email)
                        │   ├── Label
                        │   ├── Input
                        │   └── ErrorMessage (conditional)
                        ├── FormField (password)
                        │   ├── Label
                        │   ├── Input
                        │   └── ErrorMessage (conditional)
                        ├── Alert (form-level errors, conditional)
                        ├── Button (submit)
                        └── <p> (link to /login)

/flashcards
└── AppLayout.astro
    ├── Navbar.tsx [client:load]
    │   ├── Logo (link to /flashcards)
    │   ├── NavLinks
    │   │   ├── "Generate" → /generate
    │   │   └── "My Flashcards" → /flashcards (active)
    │   └── UserDropdown
    │       └── DropdownMenu
    │           ├── User email display
    │           └── "Log out" button
    │   └── MobileMenu (Sheet)
    │       └── Same links as NavLinks
    └── <main>
        └── Page content placeholder (scaffolding)
```

## 4. Component Details

### 4.1 BaseLayout.astro

**Description:** Base HTML layout for authentication pages. Provides minimal structure without navigation, centering the content vertically and horizontally.

**Note:** Refactor from existing `src/layouts/Layout.astro` - reuse HTML head structure, add centering styles.

**Main Elements:**
- `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`
- `<main>` container with flex centering
- Slot for page content

**Props Interface:**
```typescript
interface Props {
  title?: string;
}
```

**Styling:**
- Full viewport height (`min-h-screen`)
- Flexbox centering (`flex items-center justify-center`)
- Background color from theme (`bg-background`)
- Padding for mobile (`p-4`)

---

### 4.2 AppLayout.astro

**Description:** Layout for authenticated pages with top navigation bar. Extends BaseLayout structure with Navbar component.

**Main Elements:**
- HTML wrapper (same structure as BaseLayout)
- `<header>` with Navbar component
- `<main>` container for page content with proper padding

**Props Interface:**
```typescript
interface Props {
  title?: string;
  user: {
    id: string;
    email: string;
  };
  currentPath: string;
}
```

**Styling:**
- Full viewport height (`min-h-screen`)
- Flex column layout (`flex flex-col`)
- Main content area with max-width container and responsive padding

---

### 4.3 LoginForm.tsx

**Description:** Interactive React component for user login. Handles form state, validation, API communication, and error display.

**Main Elements:**
- `<Card>` - container for the form
- `<CardHeader>` - logo text "10x Cards", title ("Log in"), description
- `<CardContent>` - form fields and actions
- `<form>` - wraps all inputs
- Email field: `<Label>`, `<Input type="email">`, error message `<p>`
- Password field: `<Label>`, `<Input type="password">`, error message `<p>`
- `<Alert>` - form-level error messages (API errors)
- `<Button>` - submit button with loading state
- Link to registration page

**Handled Interactions:**

| Interaction | Handler | Outcome |
|-------------|---------|---------|
| Email input change | `handleEmailChange` | Update email state |
| Email input blur | `handleEmailBlur` | Validate email format |
| Password input change | `handlePasswordChange` | Update password state |
| Password input blur | `handlePasswordBlur` | Validate password (required) |
| Form submit | `handleSubmit` | Validate all, call API, handle response |
| Register link click | Native navigation | Navigate to `/register` |

**Validation (matching API expectations):**
- Email: Required, valid email format (Zod `.email()`)
- Password: Required, min 1 character

**Types Used:**
- `LoginCommand` (from `src/types.ts`)
- `LoginResponseDTO` (from `src/types.ts`)
- `ErrorResponseDTO` (from `src/types.ts`)
- `LoginFormState` (local ViewModel)
- `LoginFormErrors` (local ViewModel)

**Props Interface:**
```typescript
// No props - component is self-contained
interface LoginFormProps {}
```

---

### 4.4 RegisterForm.tsx

**Description:** Interactive React component for user registration. Similar structure to LoginForm but with different validation rules and API endpoint.

**Main Elements:**
- Same structure as LoginForm
- Logo text: "10x Cards"
- Title: "Create an account"
- Description: "Enter your email below to create your account"
- Link to login page instead of register
- Success toast (using Sonner) before redirect: "Account created successfully. Please check your email to confirm."

**Handled Interactions:**

| Interaction | Handler | Outcome |
|-------------|---------|---------|
| Email input change | `handleEmailChange` | Update email state |
| Email input blur | `handleEmailBlur` | Validate email format |
| Password input change | `handlePasswordChange` | Update password state |
| Password input blur | `handlePasswordBlur` | Validate password (min 8 chars) |
| Form submit | `handleSubmit` | Validate all, call API, handle response |
| Login link click | Native navigation | Navigate to `/login` |

**Validation (matching API expectations):**
- Email: Required, valid email format
- Password: Required, minimum 8 characters

**Types Used:**
- `RegisterCommand` (from `src/types.ts`)
- `RegisterResponseDTO` (from `src/types.ts`)
- `ErrorResponseDTO` (from `src/types.ts`)
- `RegisterFormState` (local ViewModel)
- `RegisterFormErrors` (local ViewModel)

**Props Interface:**
```typescript
// No props - component is self-contained
interface RegisterFormProps {}
```

---

### 4.5 Navbar.tsx

**Description:** Top navigation bar for authenticated pages. Displays logo, navigation links, and user dropdown menu.

**Main Elements:**
- `<header>` - semantic container with `sticky top-0 z-50 h-16`
- Logo/brand text "10x Cards" linking to `/flashcards` (`font-bold text-xl`)
- Navigation links container (desktop, hidden on mobile < 640px)
- `<a>` links: "Generate" (`/generate`), "My Flashcards" (`/flashcards`)
- User dropdown (DropdownMenu from Shadcn) with email display and "Log out" button
- Mobile menu (Sheet from Shadcn) - hamburger button triggering side drawer with same nav links

**Handled Interactions:**

| Interaction | Handler | Outcome |
|-------------|---------|---------|
| Logo click | Native navigation | Navigate to `/flashcards` |
| Nav link click | Native navigation | Navigate to respective page |
| User dropdown toggle | `toggleDropdown` | Open/close dropdown menu |
| Logout click | `handleLogout` | POST /api/auth/logout, redirect to /login |

**Validation:** N/A

**Types Used:**
- `AuthUserDTO` (from `src/types.ts`)

**Props Interface:**
```typescript
interface NavbarProps {
  user: {
    email: string;
  };
  currentPath: string;
}
```

**Styling:**
- Sticky header: `sticky top-0 z-50`
- Fixed height: `h-16` (64px)
- Background: `bg-background border-b`
- Responsive: Desktop nav hidden below `sm:` (640px), Sheet menu shown on mobile
- Active link styling (underline or different color)
- Container with max-width for content alignment

---

### 4.6 Astro Pages

#### login.astro

**Description:** Astro page that renders the login form using BaseLayout.

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import LoginForm from "../components/auth/LoginForm";
---

<BaseLayout title="Log in - 10x Cards">
  <LoginForm client:load />
</BaseLayout>
```

#### register.astro

**Description:** Astro page that renders the registration form using BaseLayout.

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import RegisterForm from "../components/auth/RegisterForm";
---

<BaseLayout title="Create account - 10x Cards">
  <RegisterForm client:load />
</BaseLayout>
```

#### flashcards.astro

**Description:** Astro page for the My Flashcards view (scaffolding only).

```astro
---
import AppLayout from "../layouts/AppLayout.astro";

const user = Astro.locals.user;
---

<AppLayout title="My Flashcards - 10x Cards" user={user} currentPath="/flashcards">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">My Flashcards</h1>
    <p class="text-muted-foreground mt-2">This page is under construction.</p>
  </div>
</AppLayout>
```

#### generate.astro (scaffolding)

**Description:** Astro page for the Generate view (scaffolding only).

```astro
---
import AppLayout from "../layouts/AppLayout.astro";

const user = Astro.locals.user;
---

<AppLayout title="Generate Flashcards - 10x Cards" user={user} currentPath="/generate">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">Generate Flashcards</h1>
    <p class="text-muted-foreground mt-2">This page is under construction.</p>
  </div>
</AppLayout>
```

#### index.astro (updated)

**Description:** Home page with redirect logic only.

```astro
---
const user = Astro.locals.user;

if (user) {
  return Astro.redirect("/flashcards");
}

return Astro.redirect("/login");
---
```

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// Command for user registration - POST /api/auth/register
interface RegisterCommand {
  email: string;
  password: string;
}

// Command for user login - POST /api/auth/login
interface LoginCommand {
  email: string;
  password: string;
}

// User info returned after authentication
interface AuthUserDTO {
  id: string;
  email: string;
}

// Response from POST /api/auth/register
interface RegisterResponseDTO {
  user: AuthUserDTO;
}

// Response from POST /api/auth/login
interface LoginResponseDTO {
  user: AuthUserDTO;
}

// Response from POST /api/auth/logout
interface LogoutResponseDTO {
  message: string;
}

// Standard API error response
interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
  };
}
```

### 5.2 New ViewModel Types (to be defined in component files)

```typescript
// LoginForm state management
interface LoginFormState {
  email: string;
  password: string;
}

// LoginForm error state
interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string; // General form error (from API)
}

// RegisterForm state management
interface RegisterFormState {
  email: string;
  password: string;
}

// RegisterForm error state
interface RegisterFormErrors {
  email?: string;
  password?: string;
  form?: string; // General form error (from API)
}
```

### 5.3 Validation Schemas (already exists in `src/lib/schemas/auth.schema.ts`)

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

## 6. State Management

### 6.1 Form State (LoginForm, RegisterForm)

State is managed locally within each form component using React's `useState` hook. No external state management library is needed for these views.

**State Variables:**

```typescript
// Form data
const [formData, setFormData] = useState<LoginFormState>({
  email: "",
  password: "",
});

// Validation errors (field-level and form-level)
const [errors, setErrors] = useState<LoginFormErrors>({});

// Loading state during API call
const [isSubmitting, setIsSubmitting] = useState(false);
```

**State Flow:**

1. User types → `onChange` handler updates `formData`
2. User leaves field → `onBlur` handler validates field, updates `errors`
3. User submits → validate all fields → if valid, set `isSubmitting: true`, call API
4. API response → update `errors.form` if error, or redirect if success
5. After API call → set `isSubmitting: false`

### 6.2 Navbar State

Minimal state for dropdown visibility:

```typescript
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
```

### 6.3 No Custom Hooks Required

For these simple authentication forms, standard `useState` is sufficient. Custom hooks would be considered if:
- Form logic needs to be shared between multiple components
- Complex validation patterns emerge
- State needs to persist across components

## 7. API Integration

### 7.1 Login Flow

**Endpoint:** `POST /api/auth/login`

**Request:**
```typescript
// Content-Type: application/json
// Body: LoginCommand
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```typescript
// LoginResponseDTO
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com"
  }
}
// + Session cookies set automatically by Supabase
```

**Error Responses:**
- 400: `{ error: { code: "VALIDATION_ERROR", message: "..." } }`
- 401: `{ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }`
- 403: `{ error: { code: "EMAIL_NOT_CONFIRMED", message: "Please confirm your email before logging in" } }` (production only)

**Frontend Implementation:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Client-side validation
  const validation = loginSchema.safeParse(formData);
  if (!validation.success) {
    // Set field errors from Zod
    return;
  }

  setIsSubmitting(true);
  setErrors({});

  try {
    // 2. API call
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
      credentials: "include", // Required for cookies
    });

    const data = await response.json();

    if (!response.ok) {
      // 3. Handle error response
      const errorData = data as ErrorResponseDTO;
      setErrors({ form: mapErrorMessage(errorData.error.code) });
      return;
    }

    // 4. Success - redirect (full page reload to pick up cookies)
    window.location.href = "/flashcards";

  } catch (error) {
    // 5. Network error
    setErrors({ form: "Unable to connect to server. Please check your connection." });
  } finally {
    setIsSubmitting(false);
  }
};
```

### 7.2 Registration Flow

**Endpoint:** `POST /api/auth/register`

**Request:**
```typescript
// Content-Type: application/json
// Body: RegisterCommand
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (201):**
```typescript
// RegisterResponseDTO
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com"
  }
}
// Note: In production, email confirmation will be required before first login
```

**Error Responses:**
- 400: `{ error: { code: "VALIDATION_ERROR", message: "..." } }`
- 409: `{ error: { code: "USER_EXISTS", message: "User with this email already exists" } }`
- 500: `{ error: { code: "INTERNAL_ERROR", message: "Registration failed" } }`

**Frontend Implementation:** Same pattern as login, with different endpoint and validation schema. Key difference: on success, redirect to `/login` instead of `/flashcards`:

```typescript
// In RegisterForm handleSubmit:
if (!response.ok) {
  const errorData = data as ErrorResponseDTO;
  setErrors({ form: mapErrorMessage(errorData.error.code) });
  return;
}

// Success - redirect to login page
// PROD: User must confirm email before logging in
// DEV: Middleware will auto-redirect to /flashcards (session already active)
window.location.href = "/login";
```

**Important:** The `supabase.auth.signUp()` call sets session cookies regardless of email confirmation setting. The difference is:
- **Email confirmation ON (prod):** `email_confirmed_at` is `null` → user cannot authenticate until email is confirmed
- **Email confirmation OFF (dev):** `email_confirmed_at` is set automatically → session is fully active immediately

### 7.3 Logout Flow

**Endpoint:** `POST /api/auth/logout`

**Request:** No body required

**Success Response (200):**
```typescript
// LogoutResponseDTO
{
  "message": "Logged out successfully"
}
// + Session cookies cleared
```

**Frontend Implementation:**
```typescript
const handleLogout = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } finally {
    // Always redirect, even if API fails
    window.location.href = "/login";
  }
};
```

## 8. User Interactions

### 8.1 Login Page Interactions

| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Navigates to `/login` | Page loads with empty form |
| 2 | Types in email field | Input value updates, validation waits |
| 3 | Leaves email field (blur) | Validates email format, shows error if invalid |
| 4 | Types in password field | Input value updates |
| 5 | Leaves password field (blur) | Validates password is not empty |
| 6 | Clicks "Log in" button | Form validates all fields |
| 6a | - Validation fails | Error messages shown under respective fields |
| 6b | - Validation passes | Button shows loading state, API called |
| 7 | API responds with success | User redirected to `/flashcards` |
| 8 | API responds with error | Error alert shown, button re-enabled |
| 9 | Clicks "Create an account" link | Navigates to `/register` |

### 8.2 Registration Page Interactions

| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Navigates to `/register` | Page loads with empty form |
| 2 | Types in email field | Input value updates |
| 3 | Leaves email field (blur) | Validates email format |
| 4 | Types in password field | Input value updates |
| 5 | Leaves password field (blur) | Validates password length (min 8) |
| 6 | Clicks "Create account" button | Form validates all fields |
| 6a | - Validation fails | Error messages shown |
| 6b | - Validation passes | Button shows loading state, API called |
| 7 | API responds with success | Success toast shown, then redirect to `/login` |
| 7a | - Production (email conf. ON) | User sees login page, must confirm email first |
| 7b | - Development (email conf. OFF) | Middleware auto-redirects to `/flashcards` |
| 8 | API responds with error | Error alert shown (e.g., "User exists") |
| 9 | Clicks "Log in" link | Navigates to `/login` |

### 8.3 Flashcards Page Interactions (Navbar only for scaffolding)

| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Clicks logo | Navigates to `/flashcards` |
| 2 | Clicks "Generate" link | Navigates to `/generate` |
| 3 | Clicks "My Flashcards" link | Stays on `/flashcards` (active state) |
| 4 | Clicks user dropdown trigger | Dropdown menu opens |
| 5 | Clicks outside dropdown | Dropdown closes |
| 6 | Clicks "Log out" | API called, redirected to `/login` |
| 7 | (Mobile) Clicks hamburger menu | Sheet opens with nav links |
| 8 | (Mobile) Clicks nav link in Sheet | Sheet closes, navigates to page |

## 9. Validation Conditions

### 9.1 Client-Side Validation

| Field | Form | Condition | Error Message |
|-------|------|-----------|---------------|
| Email | Both | Required | "Email is required" |
| Email | Both | Valid format | "Invalid email format" |
| Password | Login | Required | "Password is required" |
| Password | Register | Min 8 characters | "Password must be at least 8 characters" |

**Note:** Error messages match Zod schema messages from `src/lib/schemas/auth.schema.ts`.

### 9.2 Validation Timing

1. **On blur (field level):**
   - Validate individual field when user leaves it
   - Show error immediately under the field
   - Do not clear other field errors

2. **On submit (form level):**
   - Validate all fields before API call
   - If any validation fails, do not call API
   - Focus first field with error

3. **On API response:**
   - Clear all client-side errors
   - Show server error in form-level alert

### 9.3 Validation Schema Usage

Reuse existing Zod schemas from `src/lib/schemas/auth.schema.ts`:

```typescript
import { loginSchema, registerSchema } from "@/lib/schemas/auth.schema";

// Validate single field
const validateEmail = (email: string): string | undefined => {
  const result = loginSchema.shape.email.safeParse(email);
  return result.success ? undefined : result.error.errors[0]?.message;
};

// Validate entire form
const validateForm = (data: LoginFormState): LoginFormErrors => {
  const result = loginSchema.safeParse(data);
  if (result.success) return {};

  const errors: LoginFormErrors = {};
  result.error.errors.forEach((err) => {
    const field = err.path[0] as keyof LoginFormErrors;
    errors[field] = err.message;
  });
  return errors;
};
```

## 10. Error Handling

### 10.1 Error Message Mapping

| API Error Code | User-Facing Message |
|----------------|---------------------|
| `VALIDATION_ERROR` | Display API message or "Please check your input" |
| `INVALID_CREDENTIALS` | "Invalid email or password" |
| `EMAIL_NOT_CONFIRMED` | "Please confirm your email before logging in" |
| `USER_EXISTS` | "An account with this email already exists" |
| `INTERNAL_ERROR` | "Something went wrong. Please try again later." |
| `UNAUTHORIZED` | "Your session has expired. Please log in again." |
| Network error | "Unable to connect to server. Please check your connection." |
| Timeout | "Request timed out. Please try again." |

### 10.2 Error Display Strategy

1. **Field-level errors:** Displayed as small red text directly below the input field
2. **Form-level errors:** Displayed in an Alert component above the submit button
3. **Error styling:** Use destructive variant from Shadcn (`text-destructive`)

### 10.3 Error Helper Function

```typescript
const mapApiErrorToMessage = (code: string): string => {
  const errorMessages: Record<string, string> = {
    VALIDATION_ERROR: "Please check your input",
    INVALID_CREDENTIALS: "Invalid email or password",
    EMAIL_NOT_CONFIRMED: "Please confirm your email before logging in",
    USER_EXISTS: "An account with this email already exists",
    INTERNAL_ERROR: "Something went wrong. Please try again later.",
    UNAUTHORIZED: "Your session has expired. Please log in again.",
  };

  return errorMessages[code] ?? "An unexpected error occurred.";
};
```

### 10.4 Security Considerations

- **Do not reveal email existence** on login: Always show "Invalid email or password" regardless of whether email exists
- **Generic registration error:** API already handles this correctly with USER_EXISTS code
- **No password hints:** Do not provide feedback about password requirements in login (only in registration)

## 11. Implementation Steps

### Phase 1: Setup and Infrastructure

#### Step 1.1: Install Required Shadcn Components
```bash
npx shadcn@latest add card input label alert dropdown-menu sheet sonner
```

**Note:** `button` is already installed.

#### Step 1.2: Update Middleware for Page Route Protection

Extend `src/middleware/index.ts` to handle page redirects and fix email nullability:

```typescript
// Add protected page paths
const PROTECTED_PAGE_PATHS = ["/flashcards", "/generate"];
const AUTH_PAGE_PATHS = ["/login", "/register"];

// In onRequest handler:

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

// Protected pages - redirect to login if not authenticated
if (!locals.user && PROTECTED_PAGE_PATHS.some(p => url.pathname.startsWith(p))) {
  return context.redirect("/login");
}

// Auth pages - redirect to flashcards if already authenticated
if (locals.user && AUTH_PAGE_PATHS.includes(url.pathname)) {
  return context.redirect("/flashcards");
}
```

#### Step 1.3: Refactor Layout.astro → BaseLayout.astro
- Rename existing `src/layouts/Layout.astro` to `src/layouts/BaseLayout.astro`
- Keep HTML head structure (already imports global.css)
- Add centered flex container for auth pages
- Update any existing imports if needed

#### Step 1.4: Create AppLayout.astro
- Create `src/layouts/AppLayout.astro`
- Include Navbar slot/component
- Main content area with max-width container
- Pass user and currentPath props

### Phase 2: Authentication Forms

#### Step 2.1: Create LoginForm Component
- Create `src/components/auth/LoginForm.tsx`
- Implement form state with useState
- Add validation using Zod schemas
- Implement onBlur validation for fields
- Implement onSubmit handler with API call
- Add loading state to submit button
- Style with Tailwind and Shadcn components

#### Step 2.2: Create RegisterForm Component
- Create `src/components/auth/RegisterForm.tsx`
- Similar structure to LoginForm
- Different validation rules (password min 8 chars)
- Different API endpoint

#### Step 2.3: Create Login Page
- Create `src/pages/login.astro`
- Use BaseLayout
- Render LoginForm with `client:load` directive

#### Step 2.4: Create Register Page
- Create `src/pages/register.astro`
- Use BaseLayout
- Render RegisterForm with `client:load` directive

### Phase 3: Navigation and Protected Pages

#### Step 3.1: Create Navbar Component
- Create `src/components/layout/Navbar.tsx`
- Logo text "10x Cards" with link to /flashcards
- Navigation links (Generate, My Flashcards)
- User dropdown (DropdownMenu) with email display and logout button
- Active state styling for current page
- Mobile menu using Sheet component (hamburger → side drawer)
- Sticky positioning with `sticky top-0 z-50 h-16`

#### Step 3.2: Create Flashcards Page Scaffolding
- Create `src/pages/flashcards.astro`
- Use AppLayout with Navbar
- Simple placeholder content
- Access user from Astro.locals

#### Step 3.3: Create Generate Page Scaffolding
- Create `src/pages/generate.astro`
- Use AppLayout with Navbar
- Simple placeholder content (same pattern as flashcards)

#### Step 3.4: Update Home Page
- Update `src/pages/index.astro`
- Add redirect logic based on auth status

### Phase 4: Polish and Basic Accessibility

#### Step 4.1: Basic Accessibility (implemented during component creation)
- Semantic HTML elements (`<form>`, `<label>`, `<button>`)
- Label-input associations via `htmlFor`/`id`
- `aria-invalid` on inputs with errors
- `aria-describedby` linking inputs to error messages
- Proper button `type="submit"`

**Note:** Advanced accessibility (aria-live regions, focus management) deferred to post-MVP.

#### Step 4.2: Responsive Design Review
- Test on mobile viewport (< 640px)
- Ensure form is usable on small screens
- Navbar Sheet menu works correctly on mobile

#### Step 4.3: Loading States
- Add loading spinner to submit buttons
- Disable form inputs during submission
- Button shows "Loading..." or spinner icon

### Implementation Checklist

- [ ] Install Shadcn components (card, input, label, alert, dropdown-menu, sheet, sonner)
- [ ] Refactor Layout.astro → BaseLayout.astro
- [ ] Create AppLayout.astro
- [ ] Update middleware with page route protection and email guard
- [ ] Create LoginForm.tsx
- [ ] Create RegisterForm.tsx
- [ ] Create login.astro page
- [ ] Create register.astro page
- [ ] Create Navbar.tsx (with Sheet for mobile)
- [ ] Create flashcards.astro page (scaffolding)
- [ ] Create generate.astro page (scaffolding)
- [ ] Update index.astro with redirect logic
- [ ] Basic accessibility (label associations, aria-invalid)
- [ ] Responsive design testing

### Manual Testing Checklist

- [ ] Test complete login flow (valid credentials → redirected to /flashcards)
- [ ] Test login with invalid credentials (error message displayed)
- [ ] Test complete registration flow (new user → toast → redirect to /login)
- [ ] Test registration with existing email (error message displayed)
- [ ] Test logout flow (click Log out → redirected to /login)
- [ ] Test route protection: unauthenticated user → /flashcards → redirect to /login
- [ ] Test route protection: authenticated user → /login → redirect to /flashcards
- [ ] Test mobile menu (Sheet opens, navigation works)
- [ ] Test responsive design on mobile viewport
