# Prompt: HTTP Test Scenarios for Auth API

Generate comprehensive test scenarios for the authentication API using IntelliJ IDEA HTTP Client format (.http files).

## Authentication Architecture Overview

### Cookie-Based Session Management

- **Session storage**: httpOnly cookies (XSS protection)
- **Cookie name**: `sb-localhost-auth-token` (development), `sb-{project-ref}-auth-token` (production)
- **Cookie attributes**: HttpOnly, SameSite=Lax, Max-Age=34560000 (400 days)
- **Token refresh**: Automatic via middleware `getUser()` call (handled by @supabase/ssr)

### Session Flow

#### 1. Registration Flow (Auto-Login)

```
POST /api/auth/register
  ↓
Supabase Auth.signUp()
  ↓
Returns: user + session
  ↓
Middleware setAll() → Set-Cookie headers
  ↓
Response: 201 + user object + cookies
  ↓
User is IMMEDIATELY AUTHENTICATED (no separate login needed)
```

#### 2. Login Flow (Returning Users)

```
POST /api/auth/login
  ↓
Supabase Auth.signInWithPassword()
  ↓
Returns: user + session
  ↓
Middleware setAll() → Set-Cookie headers
  ↓
Response: 200 + user object + cookies
  ↓
User authenticated, cookies updated
```

#### 3. Protected Resource Access

```
Any request to /api/* (except public paths)
  ↓
Middleware: cookies.getAll() → parse Cookie header
  ↓
Supabase getUser() → validates token + auto-refresh if needed
  ↓
If valid: locals.user populated → proceed
If invalid/missing: 401 UNAUTHORIZED
```

#### 4. Logout Flow

```
POST /api/auth/logout (requires auth)
  ↓
Supabase Auth.signOut()
  ↓
Cookies cleared
  ↓
Response: 200 + success message
```

## API Endpoints Specification

### Public Endpoints (no auth required)

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Protected Endpoints (auth required)

- `POST /api/auth/logout` - Logout current user
- `DELETE /api/auth/account` - Delete user account (GDPR)
- `POST /api/generations` - Generate flashcards (example protected resource)

### Request/Response Formats

#### POST /api/auth/register

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
  // min 8 characters
}
```

**Success (201):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:**

- 400 VALIDATION_ERROR: invalid email format, password too short
- 409 USER_EXISTS: email already registered

#### POST /api/auth/login

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success (200):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:**

- 400 VALIDATION_ERROR: missing fields, invalid JSON
- 401 INVALID_CREDENTIALS: wrong email or password

#### POST /api/auth/logout

**Request:** Empty body
**Success (200):**

```json
{
  "message": "Logged out successfully"
}
```

**Errors:**

- 401 UNAUTHORIZED: not authenticated

#### DELETE /api/auth/account

**Request:** Empty body
**Success (200):**

```json
{
  "message": "Account deleted successfully"
}
```

**Errors:**

- 401 UNAUTHORIZED: not authenticated

## Test Scenarios to Generate

Create separate .http files for each scenario in `.http/scenarios/` directory:

### 1. `01-registration-happy-path.http`

**Purpose**: Test successful user registration flow
**Steps:**

1. Register new user with unique email
2. Verify 201 status and user object in response
3. Verify cookies are set (check Set-Cookie headers)
4. Use cookies to access protected endpoint `/api/generations` (proves auto-login works)

**Key assertions:**

- Registration returns 201
- Response contains user.id and user.email
- Cookies are automatically set
- Protected endpoint accessible without separate login

### 2. `02-registration-validation-errors.http`

**Purpose**: Test registration validation
**Steps:**

1. Invalid email format → 400 VALIDATION_ERROR
2. Password too short (< 8 chars) → 400 VALIDATION_ERROR
3. Missing password field → 400 VALIDATION_ERROR
4. Invalid JSON body → 400 VALIDATION_ERROR
5. Register with existing email → 409 USER_EXISTS

**Key assertions:**

- Proper status codes (400 vs 409)
- Error responses follow standard format: `{"error": {"code": "...", "message": "..."}}`

### 3. `03-login-happy-path.http`

**Purpose**: Test login for returning users
**Steps:**

1. Register new user (setup)
2. Logout to clear session
2. Login with same credentials
3. Verify 200 status and user object
4. Verify cookies are set/refreshed
5. Use cookies to access protected endpoint

**Key assertions:**

- Login returns 200 with user object
- Cookies are updated
- Protected endpoint accessible after login

### 4. `04-login-error-cases.http`

**Purpose**: Test login error handling
**Steps:**

1. Login with non-existent email → 401 INVALID_CREDENTIALS
2. Login with wrong password → 401 INVALID_CREDENTIALS (probably it will require registering and loging out first)
3. Login with missing password → 400 VALIDATION_ERROR
4. Login with invalid JSON → 400 VALIDATION_ERROR

**Key assertions:**

- Generic error message for invalid credentials (security best practice)
- Validation errors return 400

### 5. `05-protected-endpoints-auth.http`

**Purpose**: Test middleware authorization
**Steps:**

1. Access protected endpoint WITHOUT cookies → 401 UNAUTHORIZED
2. Register user (get cookies)
3. Access same endpoint WITH cookies → 201 (success)
4. Logout
5. Try to access endpoint again → 401 UNAUTHORIZED

**Key assertions:**

- Middleware blocks unauthorized requests
- Cookies enable access
- Logout clears session

### 6. `06-logout-flow.http`

**Purpose**: Test logout functionality
**Steps:**

1. Register user (get cookies)
2. Verify access to protected endpoint works
3. Logout
4. Verify cookies are cleared
5. Try to access protected endpoint → 401

**Key assertions:**

- Logout requires authentication
- Logout clears cookies
- Cannot access protected resources after logout

### 7. `07-account-deletion.http`

**Purpose**: Test GDPR-compliant account deletion
**Steps:**

1. Register new user (get cookies)
2. Access some protected endpoint to prove that user exists and is authenticated
3. Delete account
4. Verify 200 response
5. Try to login with deleted credentials → 401

**Key assertions:**

- Account deletion requires authentication
- Account is removed from auth.users
- Cannot login after deletion

## IntelliJ HTTP Client Specifics

### Syntax documentation

You can find IntelliJ HTTP Client syntax documentation
here: https://www.jetbrains.com/help/idea/exploring-http-syntax.html

**My requirements:**

- For marking header of each request use `# @name Some Descriptive Name` (`@name` based syntax) to give a clear
  indication of what the request does (do not use three hashes syntax for that).
- For separating requests use `###` (combined with some comment or not). All requests must be separated by exactly three
  hashes. This way it will be possible to add some additional comments between requests if needed (for example to mark
  separate sections of the test scenario).

**Valid example for reference:**

```http
### ========================================
### SCENARIUSZ: Kompletny przepływ zakupowy
### Od rejestracji nowego użytkownika do otrzymania potwierdzenia zamówienia
### ========================================
###
### Ten plik testuje krytyczną ścieżkę biznesową w aplikacji e-commerce.
### Wszystkie requesty są uruchamiane sekwencyjnie (Run All Requests in File).
### Każdy request zapisuje dane potrzebne kolejnym krokom.
###
### Założenia początkowe:
### - API jest dostępne pod {{host}}
### - Email użytkownika testowego nie istnieje w systemie
### - Produkt testowy (ID: {{testProductId}}) istnieje i ma wystarczający stan magazynowy
###
### Oczekiwany rezultat:
### - Nowy użytkownik został utworzony i zalogowany
### - Zamówienie zostało złożone i opłacone
### - Wszystkie asercje przeszły pomyślnie
### ========================================

# Generujemy unikalny email dla tego uruchomienia testu
@testRunTimestamp = {{$timestamp}}
@testUserEmail = test-user-{{testRunTimestamp}}@example.com

### ========================================
### FAZA 1: REJESTRACJA I AUTORYZACJA
### ========================================

# @name KROK 1.1: Zarejestruj nowego użytkownika
# Tworzymy konto dla nowego klienta
POST {{host}}/api/auth/register
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "SecurePassword123!",
  "firstName": "Jan",
  "lastName": "Testowy",
  "acceptTerms": true
}

> {%
  client.test("Rejestracja zakończona sukcesem", function() {
    client.assert(response.status === 201, "Oczekiwano statusu 201");
    client.assert(response.body.id !== undefined, "Użytkownik powinien mieć ID");
    client.assert(response.body.email === "{{testUserEmail}}", "Email się nie zgadza");
  });

  // Zapisujemy ID użytkownika do dalszych operacji
  client.global.set("userId", response.body.id);
  console.log("✓ KROK 1.1: Użytkownik zarejestrowany z ID: " + response.body.id);
%}

###

# @name KROK 1.2: Zaloguj nowo utworzonego użytkownika
# Otrzymujemy token JWT potrzebny do dalszych operacji
POST {{host}}/api/auth/login
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "SecurePassword123!"
}

> {%
  client.test("Logowanie zakończone sukcesem", function() {
    client.assert(response.status === 200, "Nie udało się zalogować");
    client.assert(response.body.accessToken !== undefined, "Brak tokena dostępu");
  });

  // Token będzie używany we wszystkich kolejnych requestach
  client.global.set("accessToken", response.body.accessToken);
  client.global.set("refreshToken", response.body.refreshToken);
  console.log("✓ KROK 1.2: Użytkownik zalogowany pomyślnie");
%}
```

### Cookie Handling

IntelliJ HTTP Client automatically stores cookies from responses and includes them in subsequent requests within the
same file. Use this syntax:

```http
### Step 1: Register (cookies saved automatically)
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### Step 2: Access protected endpoint (cookies sent automatically)
POST http://localhost:3000/api/auth/generations
Content-Type: application/json

{
  "source_text": "... at least 1000 characters ..."
}
```

### Environment Variables

Use `http-client.env.json` for configuration:

```json
{
  "development": {
    "baseUrl": "http://localhost:3000",
    "testEmail": "test-{{$timestamp}}@example.com"
  }
}
```

### Dynamic Variables

- `{{$timestamp}}` - Unix timestamp for unique emails
- `{{$randomInt}}` - Random integer
- `{{$uuid}}` - Random UUID

### Response Handling

```http
### Save response data for later use
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "{{testEmail}}",
  "password": "password123"
}

> {%
    client.test("Registration successful", function() {
        client.assert(response.status === 201, "Response status is not 201");
        client.assert(response.body.user.id !== undefined, "User ID missing");
    });
    client.global.set("userId", response.body.user.id);
%}
```

## File Structure

Generate files in this structure:

```
.http/
├── http-client.env.json          # Environment configuration
├── scenarios/
│   ├── 01-registration-happy-path.http
│   ├── 02-registration-validation-errors.http
│   ├── 03-login-happy-path.http
│   ├── 04-login-error-cases.http
│   ├── 05-protected-endpoints-auth.http
│   ├── 06-logout-flow.http
│   ├── 07-account-deletion.http
```

## Additional Requirements

1. **Each scenario must be self-contained**: Register a new unique user within each test file (use `{{$timestamp}}` for
   unique emails)

2. **Include assertions**: Use IntelliJ's response handlers (`> {% ... %}`) to validate:
    - HTTP status codes
    - Response body structure
    - Presence of required fields
    - Cookie headers (Set-Cookie)

3. **Add comments**: Explain what each request tests and expected behavior

4. **Test data**: For `/api/generations`, use valid source_text (1000-10000 characters)

5. **Error format validation**: All errors should match:
   ```json
   {
     "error": {
       "code": "ERROR_CODE",
       "message": "Human readable message"
     }
   }
   ```

## Security Considerations in Tests

- **Never commit real credentials**: Use test data only
- **Cleanup**: Consider adding cleanup requests at the end (delete test accounts)

## Expected Output

Generate complete, runnable .http files with:

- ✅ Clear step-by-step flow
- ✅ Descriptive comments
- ✅ Response assertions
- ✅ Cookie handling
- ✅ Error case coverage
- ✅ Self-contained scenarios (no dependencies between files)
- ✅ Dynamic test data (timestamps for unique emails)
- ✅ Both happy path and error cases

Each file should be immediately executable in IntelliJ IDEA HTTP Client without any manual setup (except starting the
dev server).
