/**
 * API Response Utilities
 * Ensures consistent response formatting across all API endpoints
 *
 * Patterns:
 * - Success: { success: true, data }
 * - Validation Error: { success: false, error: "VALIDATION_ERROR", validationErrors: {...} }
 * - Other Errors: { success: false, error: "ERROR_CODE", message: "..." }
 */

import { NextResponse } from "next/server"
import type { AppError, ValidationError } from "@/lib/errors"
import { isAppError } from "@/lib/errors"
import { logger } from "@/lib/logger"

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  validationErrors?: Record<string, string[]>
  correlationId?: string
}

/**
 * Success Response
 * 200 OK with data payload
 */
export function successResponse<T>(
  data: T,
  correlationId?: string,
  statusCode = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(correlationId && { correlationId }),
    },
    {
      status: statusCode,
      headers: correlationId ? { "X-Correlation-ID": correlationId } : {},
    }
  )
}

/**
 * Error Response
 * Handles both custom AppErrors and generic errors
 */
export function errorResponse(
  error: unknown,
  correlationId?: string
): NextResponse<ApiResponse> {
  // If it's a custom AppError, use its details
  if (isAppError(error)) {
    const responseData: ApiResponse = {
      success: false,
      error: error.code,
      message: error.message,
      ...(correlationId && { correlationId }),
    }

    // Include validation errors if present
    if ("validationErrors" in error && error.validationErrors) {
      responseData.validationErrors = error.validationErrors
    }

    // Log error with full context (internal only)
    logger.error(
      error.message,
      {
        code: error.code,
        context: error.context,
        type: error.constructor.name,
      },
      correlationId,
      error.stack
    )

    return NextResponse.json(responseData, {
      status: error.statusCode,
      headers: correlationId ? { "X-Correlation-ID": correlationId } : {},
    })
  }

  // For unknown errors, return generic 500 error
  if (error instanceof Error) {
    logger.error(
      "Unexpected error in API route",
      {
        errorName: error.name,
        errorMessage: error.message,
      },
      correlationId,
      error.stack
    )
  } else {
    logger.error(
      "Unknown error type",
      { error: String(error) },
      correlationId
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      ...(correlationId && { correlationId }),
    },
    {
      status: 500,
      headers: correlationId ? { "X-Correlation-ID": correlationId } : {},
    }
  )
}

/**
 * Created Response
 * 201 Created (for POST endpoints that create resources)
 */
export function createdResponse<T>(
  data: T,
  correlationId?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, correlationId, 201)
}

/**
 * No Content Response
 * 204 No Content (for DELETE endpoints)
 */
export function noContentResponse(
  correlationId?: string
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: correlationId ? { "X-Correlation-ID": correlationId } : {},
  })
}

/**
 * Redirect Response
 * 302 Found (temporary redirect)
 */
export function redirectResponse(
  url: string,
  correlationId?: string
): NextResponse {
  return NextResponse.redirect(url, {
    status: 302,
    headers: correlationId ? { "X-Correlation-ID": correlationId } : {},
  })
}

