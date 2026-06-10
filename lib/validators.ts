/**
 * Validators - Centralized input validation using Zod
 * Ensures all user inputs are validated before processing
 *
 * Constants for validation:
 * - URL: max 2048 chars, must be valid HTTP(S) URL
 * - Text: max 10,000 chars, no file uploads
 * - Media: max 100MB, MIME type restricted
 */

import { z } from "zod"

// URL Validation Schema
export const UrlAnalysisSchema = z.object({
  url: z
    .string()
    .trim()
    .min(5, "URL is too short")
    .max(2048, "URL is too long")
    .url("Invalid URL format")
    .refine(
      (url) => {
        const protocol = url.startsWith("http://") || url.startsWith("https://")
        return protocol
      },
      "Only HTTP and HTTPS URLs are allowed"
    )
    .refine(
      (url) => {
        const parsed = new URL(url)
        // Block localhost and internal IPs
        const hostname = parsed.hostname
        const internalPatterns = [
          /^localhost$/i,
          /^127\./,
          /^192\.168\./,
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[01])\./,
          /^::1$/,
          /^fe80:/,
        ]
        return !internalPatterns.some((pattern) => pattern.test(hostname))
      },
      "URLs pointing to localhost or internal networks are not allowed"
    ),
})

export type UrlAnalysisInput = z.infer<typeof UrlAnalysisSchema>

// Text Analysis Validation Schema
export const TextAnalysisSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text content is required")
    .max(10000, "Text content exceeds 10,000 character limit")
    .refine(
      (text) => text.split("\n").length <= 500,
      "Text content has too many lines (max 500)"
    ),
})

export type TextAnalysisInput = z.infer<typeof TextAnalysisSchema>

// Media File Validation Schema
export const MediaAnalysisSchema = z.object({
  file: z
    .instanceof(File, { message: "File is required" })
    .refine(
      (file) => file.size <= 100 * 1024 * 1024, // 100MB
      "File size exceeds 100MB limit"
    )
    .refine(
      (file) => {
        const allowedMimes = [
          // Images
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp",
          "image/tiff",
          // Videos
          "video/mp4",
          "video/quicktime",
          "video/x-msvideo",
          "video/webm",
          "video/x-matroska",
        ]
        return allowedMimes.includes(file.type)
      },
      "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, BMP, TIFF (images) or MP4, MOV, AVI, WebM, MKV (videos)"
    ),
})

export type MediaAnalysisInput = z.infer<typeof MediaAnalysisSchema>

// User Registration Schema (for Phase 4)
export const UserRegistrationSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine(
      (password) => /[A-Z]/.test(password),
      "Password must contain at least one uppercase letter"
    )
    .refine(
      (password) => /[a-z]/.test(password),
      "Password must contain at least one lowercase letter"
    )
    .refine(
      (password) => /[0-9]/.test(password),
      "Password must contain at least one digit"
    )
    .refine(
      (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      "Password must contain at least one special character (!@#$%^&*)"
    ),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
})

export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>

/**
 * Validation Result Type
 * Used for consistent error responses
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> }

/**
 * Custom validation helper with detailed error extraction
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.errors.forEach((err) => {
        const path = err.path.join(".")
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })
      return { success: false, errors }
    }
    return {
      success: false,
      errors: { unknown: ["An unexpected validation error occurred"] },
    }
  }
}

