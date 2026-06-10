# Safe Web Checker - Phase 1 Developer Quick Reference

## File Locations & Imports

### Core Security Files
```typescript
// Input validation
import { UrlAnalysisSchema, TextAnalysisSchema, MediaAnalysisSchema, validateInput } from "@/lib/validators"

// Error handling
import { AppError, ValidationError, RateLimitError, ExternalServiceError } from "@/lib/errors"

// Logging
import { logger, generateCorrelationId } from "@/lib/logger"

// API responses
import { successResponse, errorResponse, createdResponse, noContentResponse } from "@/lib/api-response"
```

---

## COMMON PATTERNS

### Pattern 1: Creating an API Endpoint

```typescript
import { type NextRequest } from "next/server"
import { YourSchema, validateInput } from "@/lib/validators"
import { ValidationError } from "@/lib/errors"
import { successResponse, errorResponse } from "@/lib/api-response"
import { logger, generateCorrelationId } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()

  try {
    // 1. Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      logger.warn("Invalid JSON", { endpoint: "/api/your-endpoint" }, correlationId)
      throw new ValidationError("Invalid JSON format")
    }

    // 2. Validate input
    const validation = validateInput(YourSchema, body)
    if (!validation.success) {
      logger.warn("Validation failed", { errors: validation.errors }, correlationId)
      throw new ValidationError("Input validation failed", validation.errors)
    }

    const { field1, field2 } = validation.data

    // 3. Process (your business logic here)
    logger.info("Processing request", { field1 }, correlationId)
    const result = await yourBusinessLogic(field1, field2)

    // 4. Return success response
    return successResponse(result, correlationId)
  } catch (error) {
    // 5. Error handling (catches all error types automatically)
    return errorResponse(error, correlationId)
  }
}
```

### Pattern 2: Calling an External API (Phase 2 Prep)

```typescript
import { ExternalServiceError } from "@/lib/errors"
import { logger } from "@/lib/logger"

export async function fetchFromVirusTotal(url: string, correlationId?: string) {
  try {
    const response = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": process.env.VIRUSTOTAL_API_KEY!,
      },
      body: JSON.stringify({ url }),
      timeout: 5000, // 5 second timeout
    })

    if (!response.ok) {
      logger.warn("VirusTotal API error", {
        status: response.status,
        url: url.substring(0, 100),
      }, correlationId)
      
      throw new ExternalServiceError("VirusTotal", response.status)
    }

    const data = await response.json()
    logger.info("VirusTotal response", { resultCount: data.results?.length }, correlationId)
    return data
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error
    
    logger.error("VirusTotal request failed", {
      error: error instanceof Error ? error.message : String(error),
    }, correlationId)
    
    throw new ExternalServiceError("VirusTotal", 503, error as Error)
  }
}
```

---

## INPUT VALIDATION EXAMPLES

### Creating a New Validator

```typescript
// lib/validators.ts
export const ProductAnalysisSchema = z.object({
  productUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2048, "URL too long"),
  
  description: z
    .string()
    .min(10, "Description too short")
    .max(1000, "Description too long"),
  
  priceInCents: z
    .number()
    .min(0, "Price must be positive")
    .max(999999999, "Price too high"),
})

export type ProductAnalysisInput = z.infer<typeof ProductAnalysisSchema>
```

### Using a Validator

```typescript
import { ProductAnalysisSchema, validateInput } from "@/lib/validators"
import { ValidationError } from "@/lib/errors"

// In your API endpoint:
const validation = validateInput(ProductAnalysisSchema, body)
if (!validation.success) {
  throw new ValidationError("Product validation failed", validation.errors)
}

const { productUrl, description, priceInCents } = validation.data
// Now these are 100% type-safe and validated!
```

---

## ERROR HANDLING EXAMPLES

### Handling Built-in Errors

```typescript
import { ValidationError, RateLimitError, ExternalServiceError, FileUploadError } from "@/lib/errors"

// Validation error
throw new ValidationError("Invalid input", { 
  email: ["Invalid email format"] 
})

// Rate limit error
if (requestCount > LIMIT) {
  throw new RateLimitError(60) // 60 seconds retry-after
}

// External service error
throw new ExternalServiceError("VirusTotal", 503)

// File upload error
throw new FileUploadError("File type not supported")
```

### Creating Custom Errors

```typescript
import { AppError } from "@/lib/errors"

export class DatabaseConnectionError extends AppError {
  constructor(message: string = "Database connection failed") {
    super(503, message, "DATABASE_ERROR")
    this.name = "DatabaseConnectionError"
  }
}

// Usage:
throw new DatabaseConnectionError()
```

---

## LOGGING EXAMPLES

### Info Logging

```typescript
logger.info("Scan completed", {
  scanId: "scan-123",
  duration: "250ms",
  threatLevel: "medium",
})
```

### Security Logging

```typescript
logger.security("Unusual access pattern", {
  userId: "user-456",
  requestsPerMinute: 45,
  threshold: 10,
})
```

### Request Logging (for metrics)

```typescript
logger.requestLog("POST", "/api/analyze-url", 200, 150, {
  threatLevel: "low",
  sources: 3,
})
```

### Threat Analysis Logging

```typescript
logger.threatAnalysis("url", {
  url: "https://example.com",
  riskScore: 45,
  sources: ["virustotal", "google_safe_browsing"],
})
```

---

## MIDDLEWARE & SECURITY HEADERS

### Rate Limiting Behavior

```
Request 1-10:  200 OK
Request 11:    429 Too Many Requests
               Retry-After: 60
               X-Correlation-ID: ...
```

### Security Headers on All Responses

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

---

## API RESPONSE FORMATS

### Success Response

```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "safetyScore": 85,
    "status": "safe",
    "details": ["No malicious patterns detected"]
  },
  "correlationId": "1686326101234-ab3cd4ef5"
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid URL format",
  "validationErrors": {
    "url": [
      "URLs pointing to localhost or internal networks are not allowed"
    ]
  },
  "correlationId": "1686326101234-ab3cd4ef5"
}
```

### Generic Error Response

```json
{
  "success": false,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "correlationId": "1686326101234-ab3cd4ef5"
}
```

### Created Response (201)

```json
{
  "success": true,
  "data": { "id": "new-resource-123", ... },
  "correlationId": "1686326101234-ab3cd4ef5"
}
```

---

## TESTING YOUR ENDPOINTS

### Test URL Upload Endpoint

```bash
# Valid URL
curl -X POST http://localhost:3000/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  -v

# Invalid: internal IP
curl -X POST http://localhost:3000/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url": "http://192.168.1.1"}' \
  -v

# Invalid: not a URL
curl -X POST http://localhost:3000/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url": "not-a-url"}' \
  -v
```

### Test Text Analysis Endpoint

```bash
# Valid text
curl -X POST http://localhost:3000/api/analyze-text \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test message"}' \
  -v

# Too long (will fail)
perl -e 'print "x" x 10001' | \
curl -X POST http://localhost:3000/api/analyze-text \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$(cat)\"}" \
  -v
```

### Test Rate Limiting

```bash
# Send 11 requests rapidly
for i in {1..11}; do
  echo "Request $i:"
  curl http://localhost:3000/api/health -w "Status: %{http_code}\n\n"
done
```

### Test Security Headers

```bash
# Check headers are present
curl -I http://localhost:3000/api/health

# Should see:
# Content-Security-Policy: ...
# Strict-Transport-Security: ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

### Check Correlation ID

```bash
curl -X POST http://localhost:3000/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  -v 2>&1 | grep X-Correlation-ID
```

---

## ENVIRONMENT VARIABLES

### Development

```bash
# .env.local (never commit)
NODE_ENV=development
LOG_LEVEL=debug
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Staging / Production

```bash
# via secure secret manager (not .env files!)
NODE_ENV=production
LOG_LEVEL=info
NEXT_PUBLIC_API_URL=https://api.example.com
VIRUSTOTAL_API_KEY=xxxxx (Phase 2)
GOOGLE_SAFE_BROWSING_API_KEY=xxxxx (Phase 2)
DATABASE_URL=postgresql://user:pass@db:5432/db (Phase 4)
REDIS_URL=redis://cache:6379 (Phase 2)
```

---

## COMMON TASKS

### Adding a New Input Validator

1. Open `lib/validators.ts`
2. Add new Zod schema
3. Export type
4. Use in API endpoint

```typescript
// lib/validators.ts
export const NewFeatureSchema = z.object({
  // your fields
})
export type NewFeatureInput = z.infer<typeof NewFeatureSchema>

// app/api/new-feature/route.ts
const validation = validateInput(NewFeatureSchema, body)
```

### Adding a New Error Type

1. Open `lib/errors.ts`
2. Create class extending `AppError`
3. Set appropriate HTTP status code

```typescript
export class YourError extends AppError {
  constructor(message: string) {
    super(400, message, "YOUR_ERROR_CODE")
  }
}
```

### Adding Logging to an Endpoint

1. Generate correlation ID
2. Log incoming request
3. Log business events
4. Log errors (automatically on throw)

```typescript
const correlationId = generateCorrelationId()
logger.info("Processing your-endpoint", { param: value }, correlationId)
// ... business logic
logger.threatAnalysis("your-type", { result }, correlationId)
```

---

## DEBUGGING TIPS

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

### Find Logs by Correlation ID

```bash
# In server console
grep "1686326101234-ab3cd4ef5" <log_output>

# Future: ELK stack search
# GET /logs?correlationId=1686326101234-ab3cd4ef5
```

### Check Rate Limit Status

```bash
# After any request, look for:
# "Retry-After: 60" header = rate limited
```

### Validate Security Headers

Visit https://securityheaders.com/?q=your-domain

Expected grades: A+ (all tests pass)

---

## PHASE 2 PREVIEW

When Phase 2 is implemented, these functions will be available:

```typescript
// Will replace simulateAnalysis() calls
import {
  analyzeUrlWithVirusTotal,
  analyzeUrlWithGoogleSafeBrowsing,
  analyzeUrlWithURLScan,
  getIPReputation,
  getDomainReputation,
} from "@/app/api/integrations"

// Will compute unified risk score
import { calculateRiskScore } from "@/lib/scoring"

// Will cache results
import { getCachedResult, setCachedResult } from "@/lib/cache"

// Will queue long tasks
import { addAnalysisJob } from "@/lib/job-queue"
```

---

## SUPPORT & RESOURCES

- **Zod Validation:** https://zod.dev/
- **Next.js Docs:** https://nextjs.org/docs
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Security Headers:** https://securityheaders.com/
- **OWASP:** https://owasp.org/
- **MDN Web Docs:** https://developer.mozilla.org/

---

**Quick Reference Last Updated:** June 9, 2026  
**Status:** Phase 1 Complete  
**For detailed info:** See `PHASE_1_SECURITY_HARDENING.md` and `SECURITY_ARCHITECTURE.md`


