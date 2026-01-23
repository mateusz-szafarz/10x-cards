TODO 1: Źle jest używane @no-cookie-jar, powinno być bez # z przodu, dodatkowo założenie jest błędne
bo ta dyrektywa działa w kontekście pojedynczego requestu, a nie całego pliku.
Jako tymczasowy workaround można manualnie usuwać cookies z
/home/mateusz/projects/plg/10x-cards/.idea/httpRequests/http-client.cookies

TODO 2: Na podstawie tego pliku wygeneruj ogólny instruktaż dla LLM na temat generowania scenariuszy testowych z użyciem
IntelliJ HTTP Client.

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

Create separate .http files for each scenario in `.http/scenarios/` directory.

**IMPORTANT**: All scenarios MUST use pre-request scripts with `client.global.set()` for variable management. Use
`Date.now()` for generating unique emails instead of `{{$timestamp}}`.

Example pattern for every first request in a scenario:

```javascript
< {%
client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
client.global.set("testUserPassword", "password123");
%
}
```

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

### CRITICAL: Cookie Persistence and Clean State

**Problem**: IntelliJ HTTP Client persists cookies between runs by default.

- Cookies are stored in `.idea/httpRequests/http-client.cookies`
- Each new run of the same file loads cookies from previous runs
- This breaks tests that assume "clean state" (no existing session)

**Solution**: Use `# @no-cookie-jar` directive at the top of each test file.

```http
# @no-cookie-jar

###

# @name Register New User
# Test scenario starts here with clean cookie state
< {%
  client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
  client.global.set("testUserPassword", "password123");
%}

POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "{{testUserPassword}}"
}
```

**Effect of `# @no-cookie-jar`:**

- ✅ Cookies are stored ONLY for the duration of this file execution
- ✅ Next run starts with empty cookie jar (clean state)
- ✅ Cookies still work WITHIN the same file (register → protected endpoint)
- ✅ Each test scenario is truly self-contained and repeatable

**REQUIREMENT**: ALL test scenario files MUST start with `# @no-cookie-jar` directive.

### Syntax documentation

You can find IntelliJ HTTP Client syntax documentation
here: https://www.jetbrains.com/help/idea/exploring-http-syntax.html

**My requirements:**

**Syntax rules:**

- `###` = request separator (MUST appear immediately after each request ends)
- `# @name Description` = request header (not `###`)
- `#` = comments (can appear after the separator to mark sections, add notes, etc.)

**Structure pattern:**

```
# @name First Request
< {%
  // Pre-request script: Define variables before request execution
  client.global.set("testUserEmail", "test-user-" + Date.now() + "@example.com");
  client.global.set("testUserPassword", "somepassword");
%}

POST /endpoint
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "{{testUserPassword}}"
}

> {%
  // Post-request script: Assertions and variable storage
  client.test("Request successful", function() {
    client.assert(response.status === 200, "Expected 200");
  });
%}

###

# Optional: section comment or note here
# @name Second Request
POST /another-endpoint
...request body...

###
```

**Key principles**:

- Every request MUST be followed immediately by `###` separator
- Any general comments or section markers come AFTER the separator, never before
- Comments related directly to request come right below header indication (`# @name Description`)
- **Use pre-request scripts (`< {%`) to define variables with `client.global.set()`** - this makes variables available
  in both request body (`{{variable}}`) and post-request assertions (`client.global.get("variable")`)
- **DO NOT use `@variable = value` syntax** - it doesn't work with `{{$varialble}}` interpolation in JavaScript blocks

**Valid example for reference:**

```http
# ========================================
# SCENARIO: Complete purchase flow
# From new user registration to order confirmation
# ========================================
#
# This file tests the critical business path in an e-commerce application.
# All requests are executed sequentially (Run All Requests in File).
# Each request saves data needed by subsequent steps.
#
# Initial assumptions:
# - API is available at {{host}}
# - Test user email does not exist in the system
# - Test product (ID: {{testProductId}}) exists and has sufficient stock
#
# Expected result:
# - New user created and logged in
# - Order placed and paid
# - All assertions passed successfully
# ========================================

# ========================================
# PHASE 1: REGISTRATION AND AUTHORIZATION
# ========================================

###

# @name STEP 1.1: Register new user
# Create account for new customer
< {%
  // Pre-request: Generate unique email for this test run
  client.global.set("testUserEmail", "test-user-" + Date.now() + "@example.com");
  client.global.set("testUserPassword", "SecurePassword123!");
%}

POST {{host}}/api/auth/register
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "{{testUserPassword}}",
  "firstName": "John",
  "lastName": "Doe",
  "acceptTerms": true
}

> {%
  client.test("Registration successful", function() {
    client.assert(response.status === 201, "Expected status 201");
    client.assert(response.body.id !== undefined, "User should have an ID");
    client.assert(response.body.email === client.global.get("testUserEmail"), "Email doesn't match");
  });

  // Save user ID for further operations
  client.global.set("userId", response.body.id);
  console.log("✓ STEP 1.1: User registered with ID: " + response.body.id);
%}

###

# @name STEP 1.2: Login newly created user
# Obtain JWT token needed for further operations
POST {{host}}/api/auth/login
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "{{testUserPassword}}"
}

> {%
  client.test("Login successful", function() {
    client.assert(response.status === 200, "Login failed");
    client.assert(response.body.accessToken !== undefined, "Access token missing");
  });

  // Token will be used in all subsequent requests
  client.global.set("accessToken", response.body.accessToken);
  client.global.set("refreshToken", response.body.refreshToken);
  console.log("✓ STEP 1.2: User logged in successfully");
%}
```

### Cookie Handling

IntelliJ HTTP Client automatically stores cookies from responses and includes them in subsequent requests within the
same file. **IMPORTANT**: Always use `# @no-cookie-jar` directive to ensure clean state on each run.

```http
# @no-cookie-jar

###

# @name Register User
# Step 1: Register (cookies saved automatically within this run)
< {%
  // Pre-request: Generate unique email using Date.now()
  client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
  client.global.set("testUserPassword", "password123");
%}

POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "{{testUserEmail}}",
  "password": "{{testUserPassword}}"
}

> {%
    client.test("Registration successful", function() {
        client.assert(response.status === 201, "Expected 201 status");
        client.assert(response.headers.valueOf("Set-Cookie") !== null, "Cookies should be set");
    });
%}

###

# @name Access Protected Resource
# Step 2: Access protected endpoint (cookies sent automatically from Step 1)
POST {{baseUrl}}/api/generations
Content-Type: application/json

{
  "source_text": "This is comprehensive test content for flashcard generation. The text needs to be between 1000 and 10000 characters to pass validation. Learning through flashcards has been proven effective for memory retention. The spaced repetition algorithm optimizes review intervals based on forgetting curves. Active recall strengthens neural pathways more effectively than passive review. Each flashcard should focus on a single concept to avoid confusion. Clear questions and concise answers make cards more effective. Context and examples help cement understanding. Regular review is essential for long-term retention. The testing effect shows that retrieval practice is superior to re-reading. Metacognition awareness of your own learning helps improve study strategies. Breaking complex topics into smaller chunks makes learning more manageable and less overwhelming for learners."
}

> {%
    client.test("Protected endpoint accessible with session", function() {
        client.assert(response.status === 201, "Expected 201 status");
        client.assert(response.body.generation_id !== undefined, "Should return generation_id");
    });
%}
```

**How it works:**

1. `# @no-cookie-jar` at top → clean start on each run
2. Pre-request script sets variables in `client.global` store using `Date.now()` for uniqueness
3. Step 1 registers user → Supabase returns Set-Cookie header
4. IntelliJ saves cookies for THIS run only
5. Step 2 automatically includes cookies from Step 1
6. Variables from Step 1 are still available (via `client.global`) if needed in Step 2
7. Next run of this file → starts fresh (no cookies from previous run, new timestamp)

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

**IMPORTANT**: Use pre-request scripts with `Date.now()` instead of `{{$timestamp}}` for generating unique values.

**Why?** The `{{$timestamp}}` syntax doesn't work correctly in post-request JavaScript assertions. Using
`client.global.set()` with `Date.now()` ensures variables are accessible in both request body and assertions.

**Recommended approach:**

```javascript
< {%
// Generate unique email using JavaScript Date.now()
client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
%
}
```

Then use in request body: `"email": "{{testUserEmail}}"`
And in assertions: `client.assert(response.body.email === client.global.get("testUserEmail"))`

**Built-in IntelliJ variables (avoid in our scenarios):**

- `{{$timestamp}}` - Unix timestamp (works in request body, but NOT in JavaScript blocks)
- `{{$randomInt}}` - Random integer
- `{{$uuid}}` - Random UUID

### Pre-Request Scripts for Variable Management

**Critical Pattern**: Always define variables in pre-request scripts using `client.global.set()`:

```javascript
< {%
client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
client.global.set("testUserPassword", "password123");
%
}
```

**Benefits:**

1. Variables work in request body: `"email": "{{testUserEmail}}"`
2. Variables work in assertions: `client.assert(response.body.email === client.global.get("testUserEmail"))`
3. No interpolation issues with `{{variable}}` syntax in JavaScript blocks
4. Full control over value generation with JavaScript expressions

**DO NOT use this pattern** (old approach):

```
@testUserEmail = test-{{$timestamp}}@example.com  // ❌ WRONG
```

**Problem with old approach**: `{{testUserEmail}}` doesn't interpolate in JavaScript assertions, causing comparison
failures.

### Response Handling

```http
# @name Save response data for later use
< {%
  client.global.set("testEmail", "test-" + Date.now() + "@example.com");
%}

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
        client.assert(response.body.user.email === client.global.get("testEmail"), "Email doesn't match");
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

1. **MANDATORY: Start each file with `# @no-cookie-jar`**: This ensures clean state on each run and prevents cookie
   persistence issues between test executions.

2. **Each scenario must be self-contained**: Register a new unique user within each test file. Use pre-request scripts
   with `Date.now()` for unique emails:
   ```javascript
   < {%
     client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
   %}
   ```

3. **Include assertions**: Use IntelliJ's response handlers (`> {% ... %}`) to validate:
    - HTTP status codes
    - Response body structure
    - Presence of required fields
    - Cookie headers (Set-Cookie)

4. **Add comments**: Explain what each request tests and expected behavior

5. **Test data**: For `/api/generations`, use valid source_text (1000-10000 characters)

6. **Error format validation**: All errors should match:
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

## Troubleshooting Common Issues

### Issue: "Test fails on second run but works on first run"

**Cause**: Cookies persisting from previous run
**Solution**: Ensure `# @no-cookie-jar` is at the top of the file

### Issue: "Protected endpoint returns 401 even after registration"

**Cause**: Cookies not being sent automatically
**Solution**:

- Check that both requests are in the same .http file
- Verify there are `###` separators between requests
- Ensure first request returned Set-Cookie header (check response)

### Issue: "Registration works but I can't access protected endpoints"

**Cause**: Email verification might be enabled in Supabase
**Solution**: Verify in Supabase Dashboard → Authentication → Email Auth → Confirm email is DISABLED

### Issue: "Cannot see Set-Cookie headers in response"

**Cause**: Using curl or external tool instead of IntelliJ
**Solution**: Use IntelliJ HTTP Client built-in runner (Run request icon or Ctrl+Enter)

### Issue: "Variable interpolation fails in post-request assertions"

**Problem**: Using `@variable = test-{{$timestamp}}@example.com` and then checking
`response.body.email === "{{testUserEmail}}"` in JavaScript block fails

**Cause**: The `{{variable}}` syntax doesn't interpolate inside JavaScript blocks (inside `> {% ... %}`)

**Solution**: Use pre-request scripts with `client.global`:

```javascript
// Pre-request:
< {%
client.global.set("testUserEmail", "test-" + Date.now() + "@example.com");
%
}

// Post-request assertion:
>
{%
  client.assert(response.body.email === client.global.get("testUserEmail"));
%
}
```

## Expected Output

Generate complete, runnable .http files with:

- ✅ `# @no-cookie-jar` directive at the top of each file
- ✅ Pre-request scripts (`< {%`) with `client.global.set()` for variable management
- ✅ Clear step-by-step flow
- ✅ Descriptive comments
- ✅ Response assertions using `client.global.get()` for variable comparisons
- ✅ Proper cookie handling (automatic within file, clean between runs)
- ✅ Error case coverage
- ✅ Self-contained scenarios (no dependencies between files)
- ✅ Dynamic test data (`Date.now()` for unique emails)
- ✅ Both happy path and error cases

Each file should be immediately executable in IntelliJ IDEA HTTP Client without any manual setup (except starting the
dev server).
