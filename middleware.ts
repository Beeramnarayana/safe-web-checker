import { type NextRequest, NextResponse } from "next/server"
import { logger, generateCorrelationId } from "@/lib/logger"

/**
 * Rate Limiting Store (In-memory for development, Redis in production)
 * Tracks requests per IP address.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/** General-purpose API rate limit: 30 requests per minute per IP */
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 30

/** Stricter limit for expensive analysis endpoints: 10 per minute */
const ANALYSIS_RATE_LIMIT_MAX = 10

const ANALYSIS_PATHS = ["/api/analyze-url", "/api/analyze-text", "/api/analyze-media"]

/**
 * Extract the real client IP.
 *
 * Security note: X-Forwarded-For can be spoofed unless you sit behind a
 * trusted proxy (e.g., Cloudflare / AWS ALB). For production, configure
 * `TRUSTED_PROXY_COUNT` env var to skip that many hops from the right.
 * Default: trust only request.ip (set by the Next.js edge runtime / Vercel).
 */
function getClientIp(request: NextRequest): string {
  const trustedProxyCount = parseInt(process.env.TRUSTED_PROXY_COUNT ?? "0", 10)

  if (trustedProxyCount > 0) {
    const forwardedFor = request.headers.get("x-forwarded-for")
    if (forwardedFor) {
      const ips = forwardedFor.split(",").map((ip) => ip.trim())
      // Take the Nth from the right (skipping trusted proxy IPs)
      const realIdx = ips.length - trustedProxyCount
      if (realIdx >= 0 && ips[realIdx]) return ips[realIdx]
    }
  }

  return request.ip ?? "127.0.0.1"
}

/**
 * Check and update the rate-limit counter for a given key.
 * Returns { allowed: boolean, remaining: number, retryAfter: number }
 */
function checkRateLimit(
  key: string,
  maxRequests: number
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 }
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, retryAfter: 0 }
}

/**
 * Attach OWASP-recommended security headers to every response.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  )
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
  return response
}

/**
 * Add CORS headers for API routes.
 * Tighten `ALLOWED_ORIGIN` env var in production to your actual frontend domain.
 */
function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*"
  const requestOrigin = request.headers.get("origin")

  // Only reflect the origin if it matches the configured allowed origin
  const origin =
    allowedOrigin === "*"
      ? "*"
      : requestOrigin === allowedOrigin
      ? allowedOrigin
      : "null"

  response.headers.set("Access-Control-Allow-Origin", origin)
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Correlation-ID")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

export async function middleware(request: NextRequest) {
  const requestPath = request.nextUrl.pathname

  // Handle CORS preflight before doing anything else
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 })
    addCorsHeaders(preflight, request)
    return preflight
  }

  const clientIp = getClientIp(request)
  const correlationId = generateCorrelationId()

  logger.debug(`${request.method} ${requestPath}`, { clientIp }, correlationId)

  // Inject correlation ID so downstream route handlers can use it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("X-Correlation-ID", correlationId)

  const isStatic =
    requestPath.startsWith("/_next") ||
    requestPath.startsWith("/public") ||
    requestPath === "/api/health"

  if (!isStatic) {
    const isAnalysisPath = ANALYSIS_PATHS.includes(requestPath)
    const maxRequests = isAnalysisPath ? ANALYSIS_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS
    const limitKey = `${clientIp}:${isAnalysisPath ? "analysis" : "general"}`

    const { allowed, remaining, retryAfter } = checkRateLimit(limitKey, maxRequests)

    if (!allowed) {
      logger.warn("Rate limit exceeded", { clientIp, requestPath }, correlationId)
      const rateLimitResponse = NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          correlationId,
        },
        { status: 429 }
      )
      rateLimitResponse.headers.set("X-Correlation-ID", correlationId)
      rateLimitResponse.headers.set("Retry-After", String(retryAfter))
      rateLimitResponse.headers.set("X-RateLimit-Limit", String(maxRequests))
      rateLimitResponse.headers.set("X-RateLimit-Remaining", "0")
      return rateLimitResponse
    }
  }

  // FIX: Removed the redundant if/else — both branches were identical
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  addSecurityHeaders(response)
  addCorsHeaders(response, request)
  response.headers.set("X-Correlation-ID", correlationId)

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}

/**
 * Rate Limiting Store (In-memory for development, Redis in production)
 * Tracks requests per IP address
 *
 * Format: { ip: { lastReset: timestamp, count: number } }
 */
const rateLimitStore = new Map<
  string,
  {
    count: number
    resetTime: number
  }
>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute per IP

/**
 * Extract client IP address from request
 * Handles X-Forwarded-For header (proxy scenarios)
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // Take first IP if there are multiple
    return forwardedFor.split(",")[0].trim()
  }
  return request.ip || "127.0.0.1"
}

/**
 * Check rate limit for IP address
 * Returns true if request should be allowed, false if rate limited
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetTime) {
    // Create new rate limit entry
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return true
  }

  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  // Increment counter
  entry.count++
  return true
}

/**
 * Security Headers Middleware
 * Implements OWASP recommended security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - prevent XSS, injection attacks
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-analytics.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
  )

  // HTTP Strict Transport Security - force HTTPS
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  )

  // X-Content-Type-Options - prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // X-Frame-Options - prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")

  // X-XSS-Protection - additional XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Referrer-Policy - control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions-Policy (formerly Feature-Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  )

  return response
}

/**
 * Main Middleware Function
 * Applied to all requests in /app directory
 */
export async function middleware(request: NextRequest) {
  const clientIp = getClientIp(request)
  const correlationId = generateCorrelationId()
  const requestMethod = request.method
  const requestPath = request.nextUrl.pathname

  // Add correlation ID to request headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("X-Correlation-ID", correlationId)

  // Log incoming request
  logger.debug(`Incoming request: ${requestMethod} ${requestPath}`, {
    clientIp,
    userAgent: request.headers.get("user-agent"),
  }, correlationId)

  // Check rate limiting (except for health checks and static assets)
  const isHealthCheck = requestPath === "/api/health"
  const isStatic = requestPath.startsWith("/_next") || requestPath.startsWith("/public")

  if (!isHealthCheck && !isStatic) {
    if (!checkRateLimit(clientIp)) {
      logger.warn(`Rate limit exceeded for IP: ${clientIp}`, {}, correlationId)
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again in a minute.",
          correlationId,
        },
        {
          status: 429,
          headers: {
            "X-Correlation-ID": correlationId,
            "Retry-After": "60",
          },
        }
      )
    }
  }

  // Create response (pass through or create new one for middleware-only requests)
  let response: NextResponse

  // For API routes that need security headers
  if (requestPath.startsWith("/api/")) {
    response = NextResponse.next({ request: { headers: requestHeaders } })
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Add security headers to all responses
  response = addSecurityHeaders(response)

  // Add correlation ID to response
  response.headers.set("X-Correlation-ID", correlationId)

  return response
}

/**
 * Configure which routes this middleware applies to
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}

