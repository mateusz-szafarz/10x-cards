# Guide: Creating API Test Scenarios with IntelliJ HTTP Client

This guide provides general instructions for LLMs on how to generate comprehensive, runnable API test scenarios using
IntelliJ IDEA HTTP Client format (.http files).

## Core Principles

### 1. Self-Contained Scenarios

**CRITICAL**: Each test scenario MUST be completely self-contained within a single .http file.

- ✅ All setup steps (e.g., creating test users, preparing test data) included in the same file
- ✅ No dependencies on external files or manually created resources
- ✅ Can be executed independently using "Run All Requests in File"
- ✅ Uses unique test data for each execution to avoid conflicts

**Why?** Self-contained scenarios:

- Are immediately executable without manual setup
- Don't fail due to missing external dependencies
- Can run in any order or isolation
- Are easier to debug and maintain

### 2. Variable Management with Pre-Request Scripts

**Always use pre-request scripts (`< {%`) with `client.global.set()` for variable management.**

```javascript
< {%
// Generate unique test data
client.global.set("testEmail", "test-" + Date.now() + "@example.com");
client.global.set("testPassword", "SecurePass123!");
client.global.set("testProductId", "prod-" + Date.now());
%
}
```

**Why this approach?**

- Variables work in request body: `"email": "{{testEmail}}"`
- Variables work in assertions: `client.global.get("testEmail")`
- No interpolation issues in JavaScript blocks
- Full control over value generation using JavaScript

**DO NOT use** the `@variable = value` syntax:

```http
@testEmail = test@example.com  # ❌ WRONG - doesn't work in assertions
```

### 3. Dynamic Test Data

Generate unique test data using JavaScript functions like `Date.now()` to avoid conflicts between test runs:

```javascript
< {%
client.global.set("uniqueId", "test-" + Date.now());
client.global.set("timestamp", Date.now().toString());
%
}
```

## IntelliJ HTTP Client Syntax

### File Structure Pattern

```http
# ========================================
# SCENARIO: [Scenario Name]
# [Brief description of what this scenario tests]
# ========================================
#
# [Optional: Additional context, assumptions, expected outcomes]
# ========================================

# ========================================
# PHASE 1: [Phase Name]
# ========================================

###

# @name STEP 1.1: [Step description]
# [Optional: Additional comments about this specific step]
< {%
  // pre-request script: define variables
  client.global.set("variable", "value");
%}

POST {{baseUrl}}/api/endpoint
Content-Type: application/json

{
  "field": "{{variable}}"
}

> {%
  // Post-request script: Assertions and variable storage
  client.test("Test description", function() {
    client.assert(response.status === 200, "Expected 200 status");
    client.assert(response.body.field !== undefined, "Field should exist");
  });

  // Save data for subsequent requests
  client.global.set("savedId", response.body.id);
  console.log("✓ STEP 1.1: Success message");
%}

###

# @name STEP 1.2: [Next step description]
POST {{baseUrl}}/api/another-endpoint
...
```

### Syntax Rules

1. **Request separator**: `###` MUST appear immediately after each request ends
2. **Request header**: `# @name Description` identifies the request (not `###`)
3. **Comments**: `#` for comments (appear after separator for section markers)
4. **Pre-request scripts**: `< {% ... %}` before request
5. **Post-request scripts**: `> {% ... %}` after request body

### Critical Pattern

```
# @name Request Name
< {% pre-request script %}

HTTP_METHOD /endpoint
Headers...

Request Body

> {% post-request script %}

###
[Optional section comment]
```

## Cookie and Session Handling

### Automatic Cookie Persistence

IntelliJ HTTP Client automatically:

- Stores cookies from `Set-Cookie` headers
- Includes cookies in subsequent requests within the same file
- Persists cookies between file executions in `.idea/httpRequests/http-client.cookies`

### Clean State Management

**IMPORTANT**: For scenarios that require "fresh start" (no existing session):

**Manual cleanup**: Delete cookies from `.idea/httpRequests/http-client.cookies` before running the scenario.

Add this note to scenario comments:

```http
# ========================================
# INITIAL REQUIREMENTS:
# - Clean cookie state: Delete .idea/httpRequests/http-client.cookies before running
# ========================================
```

### Cookie Usage Example

```http
###

# @name Step 1: Login and Get Session
< {%
  client.global.set("testUser", "user-" + Date.now() + "@example.com");
%}

POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "{{testUser}}",
  "password": "password123"
}

> {%
  client.test("Login successful and cookies set", function() {
    client.assert(response.status === 200, "Expected 200");
    client.assert(response.headers.valueOf("Set-Cookie") !== null, "Cookies should be set");
  });
%}

###

# @name Step 2: Access Protected Resource
# Cookies from Step 1 are automatically included
GET {{baseUrl}}/api/protected/resource

> {%
  client.test("Protected resource accessible", function() {
    client.assert(response.status === 200, "Should be authenticated");
  });
%}
```

## Assertions and Validation

### Post-Request Assertion Pattern

```javascript
>
{%
  client.test("Test group name", function() {
    // Status code validation
    client.assert(response.status === 200, "Expected status 200");

    // Response body structure
    client.assert(response.body !== undefined, "Response body should exist");
    client.assert(response.body.id !== undefined, "ID should be present");

    // Data validation using stored variables
    const expectedEmail = client.global.get("testEmail");
    client.assert(response.body.email === expectedEmail, "Email should match");

    // Type checks
    client.assert(typeof response.body.id === "string", "ID should be a string");
    client.assert(Array.isArray(response.body.items), "Items should be an array");
  });

  // Save data for subsequent requests
  client.global.set("userId", response.body.id);

  // Optional: Console logging for debugging
  console.log("✓ Step completed: User ID = " + response.body.id);
%
}
```

### Common Assertion Patterns

```javascript
// Status codes
client.assert(response.status === 201, "Expected 201 CREATED");
client.assert(response.status === 400, "Expected 400 BAD REQUEST");
client.assert(response.status === 401, "Expected 401 UNAUTHORIZED");

// Headers
client.assert(response.headers.valueOf("Content-Type").includes("application/json"));
client.assert(response.headers.valueOf("Set-Cookie") !== null, "Cookies should be set");

// Response body existence
client.assert(response.body !== undefined, "Body should exist");
client.assert(response.body.error !== undefined, "Error object should exist");

// Field validation
client.assert(response.body.id !== undefined, "ID is required");
client.assert(response.body.email === client.global.get("testEmail"), "Email mismatch");

// Type validation
client.assert(typeof response.body.id === "string", "ID should be string");
client.assert(Array.isArray(response.body.items), "Should be array");

// Array length
client.assert(response.body.items.length > 0, "Should have items");

// Error format validation
client.assert(response.body.error.code !== undefined, "Error code required");
client.assert(response.body.error.message !== undefined, "Error message required");
```

## Environment Configuration

### http-client.env.json

Create environment configuration file:

```json
{
  "development": {
    "baseUrl": "http://localhost:3000",
    "apiKey": "dev-api-key"
  },
  "staging": {
    "baseUrl": "https://staging.example.com",
    "apiKey": "staging-api-key"
  },
  "production": {
    "baseUrl": "https://api.example.com",
    "apiKey": "prod-api-key"
  }
}
```

Use in requests: `{{baseUrl}}`, `{{apiKey}}`

## Scenario Design Patterns

### Pattern 1: Happy Path Flow

Test the complete successful flow from start to finish.

```http
# ========================================
# SCENARIO: [Feature] - Happy Path
# Tests the complete successful flow
# ========================================

###

# @name Step 1: Setup
< {% /* generate test data */ %}
POST {{baseUrl}}/api/setup
...

###

# @name Step 2: Main action
POST {{baseUrl}}/api/action
...

###

# @name Step 3: Verification
GET {{baseUrl}}/api/verify
...
```

### Pattern 2: Validation Errors

Test input validation and error responses.

```http
# ========================================
# SCENARIO: [Feature] - Validation Errors
# Tests input validation and error handling
# ========================================

###

# @name Error Case 1: Missing required field
POST {{baseUrl}}/api/endpoint
Content-Type: application/json

{
  "field1": "value"
  // field2 intentionally missing
}

> {%
  client.test("Should reject missing field", function() {
    client.assert(response.status === 400, "Expected 400 BAD REQUEST");
    client.assert(response.body.error.code === "VALIDATION_ERROR");
  });
%}

###

# @name Error Case 2: Invalid format
POST {{baseUrl}}/api/endpoint
Content-Type: application/json

{
  "email": "not-an-email"
}

> {%
  client.test("Should reject invalid email", function() {
    client.assert(response.status === 400, "Expected 400 BAD REQUEST");
  });
%}
```

### Pattern 3: State Transitions

Test workflows that involve state changes.

```http
# ========================================
# SCENARIO: [Feature] - State Transition Flow
# Tests complete state lifecycle
# ========================================

###

# @name Setup: Create resource in initial state
< {%
  client.global.set("resourceId", "res-" + Date.now());
%}
POST {{baseUrl}}/api/resources
...

###

# @name Transition: Move to next state
PUT {{baseUrl}}/api/resources/{{resourceId}}/activate
...

###

# @name Verify: Check final state
GET {{baseUrl}}/api/resources/{{resourceId}}

> {%
  client.test("Resource should be in active state", function() {
    client.assert(response.body.status === "active");
  });
%}
```

### Pattern 4: Authorization and Access Control

Test authentication and authorization requirements.

```http
# ========================================
# SCENARIO: [Feature] - Authorization
# Tests access control for protected resources
# ========================================

###

# @name Unauthorized Access: Try without auth
GET {{baseUrl}}/api/protected/resource

> {%
  client.test("Should reject unauthorized access", function() {
    client.assert(response.status === 401, "Expected 401 UNAUTHORIZED");
  });
%}

###

# @name Setup: Authenticate
< {%
  client.global.set("testUser", "user-" + Date.now());
%}
POST {{baseUrl}}/api/auth/login
...

###

# @name Authorized Access: Try with auth (cookies auto-sent)
GET {{baseUrl}}/api/protected/resource

> {%
  client.test("Should allow authorized access", function() {
    client.assert(response.status === 200, "Expected 200 OK");
  });
%}
```

## File Organization

### Directory Structure

```
.http/
├── http-client.env.json              # Environment configuration
├── scenarios/
│   ├── 01-feature-happy-path.http
│   ├── 02-feature-validation.http
│   ├── 03-feature-edge-cases.http
│   └── 04-feature-integration.http
```

### Naming Conventions

- **Prefix with numbers** for execution order: `01-`, `02-`, `03-`
- **Descriptive names**: `feature-happy-path.http`, `feature-validation-errors.http`
- **Group by feature**: All tests for a feature in `feature-*.http` files

## Best Practices Checklist

### ✅ Every Scenario Should Have:

1. **Header comment block** explaining what the scenario tests
2. **Pre-request scripts** defining all variables with `client.global.set()`
3. **Unique test data** generated with `Date.now()` to avoid conflicts
4. **Self-contained setup** (no external dependencies)
5. **Comprehensive assertions** validating status codes, response structure, and data
6. **Saved variables** from responses for use in subsequent requests
7. **Console logging** for debugging (optional but helpful)
8. **Clear comments** explaining each step's purpose

### ✅ Variable Management:

- Use `client.global.set()` in pre-request scripts
- Use `{{variableName}}` in request bodies
- Use `client.global.get()` in assertions
- Never use `@variable = value` syntax

### ✅ Test Data:

- Generate unique data: `"test-" + Date.now()`
- Use realistic test data where possible
- Avoid hardcoded values that might conflict

### ✅ Assertions:

- Validate HTTP status codes
- Check response body structure
- Verify required fields exist
- Validate data types
- Compare with expected values using stored variables

### ✅ Documentation:

- Explain what each scenario tests
- Note any prerequisites (e.g., clean cookie state)
- Document expected outcomes
- Add comments for complex steps

## Common Troubleshooting

### Issue: Variables don't work in assertions

**Problem**: Using `@variable = value` syntax
**Solution**: Use pre-request scripts with `client.global.set()`

### Issue: Test works first time but fails on re-run

**Problem**: Cookies or data persisting from previous run
**Solution**:

- For cookies: Delete `.idea/httpRequests/http-client.cookies`
- For data: Generate unique test data with `Date.now()`

### Issue: Variable interpolation fails in JavaScript

**Problem**: Using `{{variable}}` inside `> {% %}` blocks
**Solution**: Use `client.global.get("variable")` instead

## Template: Complete Scenario

```http
# ========================================
# SCENARIO: [Feature Name] - [Test Type]
# [Description of what this scenario tests]
# ========================================
#
# Prerequisites:
# - [Any prerequisites, e.g., "Clean cookie state required"]
# - [API server running at {{baseUrl}}]
#
# Expected outcome:
# - [What should happen when all tests pass]
# ========================================

# ========================================
# PHASE 1: SETUP
# ========================================

###

# @name STEP 1.1: [Setup action]
# [Explanation of what this step does]
< {%
  // Generate unique test data
  client.global.set("testId", "test-" + Date.now());
  client.global.set("testData", "data-value");
%}

POST {{baseUrl}}/api/setup
Content-Type: application/json

{
  "id": "{{testId}}",
  "data": "{{testData}}"
}

> {%
  client.test("Setup successful", function() {
    client.assert(response.status === 201, "Expected 201 CREATED");
    client.assert(response.body.id === client.global.get("testId"), "ID should match");
  });

  client.global.set("createdId", response.body.id);
  console.log("✓ STEP 1.1: Setup completed with ID: " + response.body.id);
%}

# ========================================
# PHASE 2: MAIN ACTION
# ========================================

###

# @name STEP 2.1: [Main action]
# [Explanation]
POST {{baseUrl}}/api/action/{{createdId}}
Content-Type: application/json

{
  "action": "process"
}

> {%
  client.test("Action successful", function() {
    client.assert(response.status === 200, "Expected 200 OK");
  });

  console.log("✓ STEP 2.1: Action completed");
%}

# ========================================
# PHASE 3: VERIFICATION
# ========================================

###

# @name STEP 3.1: [Verification]
# [Explanation]
GET {{baseUrl}}/api/verify/{{createdId}}

> {%
  client.test("Verification successful", function() {
    client.assert(response.status === 200, "Expected 200 OK");
    client.assert(response.body.status === "completed", "Should be completed");
  });

  console.log("✓ STEP 3.1: Verification passed");
%}

###
```

## Summary

When generating API test scenarios:

1. **Self-contained**: Each file includes all necessary setup
2. **Dynamic data**: Use functions returning random values like `Date.now()` for uniqueness
3. **Pre-request scripts**: Always use `client.global.set()` for variables
4. **Comprehensive assertions**: Validate thoroughly in post-request scripts
5. **Clear documentation**: Explain purpose and prerequisites
6. **Realistic flows**: Test complete user journeys, not isolated endpoints
7. **Error coverage**: Include both happy paths and error cases
8. **Cookie awareness**: Understand automatic cookie handling and clean state requirements

The goal is to create tests that are immediately executable, require no manual setup, and provide clear feedback about
API behavior.
