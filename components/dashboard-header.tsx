import { Shield } from "lucide-react"

export function DashboardHeader() {
  return (
    <div className="flex flex-col space-y-2 text-center sm:text-left">
      <div className="flex items-center justify-center sm:justify-start">
        <Shield className="h-8 w-8 text-primary mr-2" />
        <h1 className="text-3xl font-bold tracking-tight">Safe Web Checker</h1>
      </div>
      <p className="text-muted-foreground">Analyze URLs, text, and media for potential safety concerns using AI</p>
    </div>
  )
}

