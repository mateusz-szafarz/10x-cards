/**
 * Base error class for all OpenRouter-related errors.
 * Extends the native Error class with an optional HTTP status code.
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Authentication error (401).
 * Thrown when the API key is invalid or missing.
 */
export class AuthenticationError extends OpenRouterError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error (403).
 * Thrown when the API key has insufficient permissions.
 */
export class AuthorizationError extends OpenRouterError {
  constructor(message = "Insufficient permissions") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Rate limit error (429).
 * Thrown when the API rate limit is exceeded.
 * Includes optional retryAfter value in seconds.
 */
export class RateLimitError extends OpenRouterError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter?: number
  ) {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

/**
 * Invalid request error (400).
 * Thrown when the request payload is malformed or invalid.
 */
export class InvalidRequestError extends OpenRouterError {
  constructor(message: string) {
    super(message, 400);
    this.name = "InvalidRequestError";
  }
}

/**
 * Server error (5xx).
 * Thrown when the OpenRouter API returns a server-side error.
 */
export class ServerError extends OpenRouterError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = "ServerError";
  }
}

/**
 * Timeout error.
 * Thrown when the request exceeds the configured timeout.
 */
export class TimeoutError extends OpenRouterError {
  constructor(message = "Request timeout") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Network error.
 * Thrown when a network-level error occurs (connection refused, DNS failure, etc.).
 */
export class NetworkError extends OpenRouterError {
  constructor(message = "Network error occurred") {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Invalid response error.
 * Thrown when the API response doesn't match the expected schema.
 */
export class InvalidResponseError extends OpenRouterError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResponseError";
  }
}
