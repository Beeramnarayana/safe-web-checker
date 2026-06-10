/**
 * Logger - Structured Logging System
 * Implements centralized logging with correlation IDs for request tracing
 *
 * Levels: debug, info, warn, error
 * Environment-aware: more verbose in development, less in production
 *
 * Usage:
 *   logger.info("User logged in", { userId: 123, email: "user@example.com" })
 *   logger.error("Database connection failed", { error: err.message }, correlationId)
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  correlationId?: string
  stack?: string
}

/**
 * Logger class with structured logging
 *
 * In production, easily pluggable into Winston, Pino, or other loggers
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production"
  private minLogLevel = this.isDevelopment ? "debug" : "info"

  /**
   * Check if log should be recorded based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }
    return levels[level] >= levels[this.minLogLevel as LogLevel]
  }

  /**
   * Format context for clean output
   */
  private formatContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) return ""
    try {
      return JSON.stringify(context)
    } catch {
      return String(context)
    }
  }

  /**
   * Core logging method
   */
  private writeLog(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    correlationId?: string,
    stack?: string
  ): void {
    if (!this.shouldLog(level)) return

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      correlationId,
      stack,
    }

    // Format output
    const contextStr = this.formatContext(context)
    const correlationStr = correlationId ? ` [${correlationId}]` : ""
    const fullMessage = `[${logEntry.timestamp}] ${level.toUpperCase()}${correlationStr}: ${message}${
      contextStr ? ` ${contextStr}` : ""
    }`

    // Route to appropriate console method
    if (level === "error") {
      console.error(fullMessage)
      if (stack) console.error(stack)
    } else if (level === "warn") {
      console.warn(fullMessage)
    } else {
      console.log(fullMessage)
    }

    // TODO: In production, send to centralized logging service (Datadog, CloudWatch, ELK, etc.)
  }

  /**
   * Debug level - verbose information for development
   */
  debug(
    message: string,
    context?: Record<string, unknown>,
    correlationId?: string
  ): void {
    this.writeLog("debug", message, context, correlationId)
  }

  /**
   * Info level - general information about app operation
   */
  info(
    message: string,
    context?: Record<string, unknown>,
    correlationId?: string
  ): void {
    this.writeLog("info", message, context, correlationId)
  }

  /**
   * Warn level - something unexpected but app continues operating
   */
  warn(
    message: string,
    context?: Record<string, unknown>,
    correlationId?: string
  ): void {
    this.writeLog("warn", message, context, correlationId)
  }

  /**
   * Error level - something went wrong
   */
  error(
    message: string,
    context?: Record<string, unknown>,
    correlationId?: string,
    stack?: string
  ): void {
    this.writeLog("error", message, context, correlationId, stack)
  }

  /**
   * Log security events (authentication, authorization, suspicious activity)
   */
  security(
    event: string,
    details: Record<string, unknown>,
    correlationId?: string
  ): void {
    this.info(`SECURITY: ${event}`, details, correlationId)
  }

  /**
   * Log API requests for audit trail
   */
  requestLog(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Record<string, unknown>,
    correlationId?: string
  ): void {
    this.info(`${method} ${path} ${statusCode} (${duration}ms)`, context, correlationId)
  }

  /**
   * Log threat analysis results for security telemetry
   */
  threatAnalysis(
    type: "url" | "text" | "media",
    result: Record<string, unknown>,
    correlationId?: string
  ): void {
    this.info(`Threat analysis completed: ${type}`, result, correlationId)
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

