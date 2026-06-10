"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

/**
 * Global error boundary for the App Router.
 * Catches unhandled exceptions in Server/Client components.
 * The `error` prop is safe to log but never display raw to users.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In production, send to error tracking (Sentry, Datadog, etc.)
    console.error("[Global Error Boundary]", {
      message: error.message,
      digest: error.digest, // Next.js error ID for server-side log lookup
    })
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
          {/* Show error digest in dev only — never in production */}
          {process.env.NODE_ENV === "development" && error.digest && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Return home
          </Button>
        </div>
      </div>
    </main>
  )
}

