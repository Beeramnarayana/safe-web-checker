import { Shield } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading UI skeleton shown by Next.js App Router during page transitions.
 * Must be a Server Component (no "use client").
 */
export default function LoadingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-primary mr-2 animate-pulse" aria-hidden="true" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content skeleton */}
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  )
}

