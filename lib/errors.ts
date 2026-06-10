/**
 * Error Handling - Structured Error Classes and Utilities
 * Follows OWASP guidelines: never expose internal stack traces to clients
 * Always return generic security messages for production errors
 */

/**
 * Custom Application Error Base Class
 * All errors inherit from this for consistent handling
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = "AppError"
    this.context = context
  }

  context?: Record<string, unknown>

  /**
   * Convert to API response (safe for client consumption)
   */
  toResponse() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    }
  }
}

/**
 * Validation Error - 400 Bad Request
 * Used when user input fails validation
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public validationErrors?: Record<string, string[]>
  ) {
    super(400, message, "VALIDATION_ERROR", { validationErrors })
    this.name = "ValidationError"
  }

  toResponse() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      validationErrors: this.validationErrors || {},
    }
  }
}

/**
 * Authentication Error - 401 Unauthorized
 * Used when authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(401, message, "AUTHENTICATION_FAILED")
    this.name = "AuthenticationError"
  }
}

/**
 * Authorization Error - 403 Forbidden
 * Used when user lacks required permissions
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(403, message, "AUTHORIZATION_FAILED")
    this.name = "AuthorizationError"
  }
}

/**
 * Not Found Error - 404
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

/**
 * Rate Limit Error - 429 Too Many Requests
 * Used when user has exceeded rate limits
 */
export class RateLimitError extends AppError {
  constructor(
    public retryAfter: number = 60
  ) {
    super(429, "Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED")
    this.name = "RateLimitError"
  }

  toResponse() {
    return {
      ...super.toResponse(),
      retryAfter: this.retryAfter,
    }
  }
}

/**
 * External Service Error - 503 Service Unavailable
 * Used when third-party APIs (VirusTotal, Google Safe Browsing, etc.) fail
 * Clients see generic message; server logs detailed info
 */
export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    statusCode: number = 503,
    originalError?: Error
  ) {
    super(
      statusCode,
      "Threat intelligence service temporarily unavailable",
      "EXTERNAL_SERVICE_ERROR",
      {
        serviceName,
        originalMessage: originalError?.message,
      }
    )
    this.name = "ExternalServiceError"
  }
}

/**
 * File Upload Error - 400 Bad Request
 * Used for file validation failures
 */
export class FileUploadError extends AppError {
  constructor(message: string) {
    super(400, message, "FILE_UPLOAD_ERROR")
    this.name = "FileUploadError"
  }
}

/**
 * Configuration Error - 500 Internal Server Error
 * Used when server configuration is missing/invalid (env vars, etc)
 * Only used internally; clients get generic 500 error
 */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(500, message, "CONFIGURATION_ERROR")
    this.name = "ConfigurationError"
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Safe error formatter for logging
 * Includes sensitive data (only for server logs, never sent to client)
 */
export function formatErrorForLog(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (error instanceof AppError) {
    return {
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      context: { ...error.context, ...context },
      timestamp: new Date().toISOString(),
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    }
  }

  return {
    message: String(error),
    context,
    timestamp: new Date().toISOString(),
  }
}

