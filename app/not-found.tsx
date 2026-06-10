import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Search } from "lucide-react"

/**
 * 404 Not Found page for the App Router.
 * Shown when a user navigates to a route that doesn't exist.
 */
export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <Button asChild>
          <Link href="/">
            <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Safe Web Checker
          </Link>
        </Button>
      </div>
    </main>
  )
}

