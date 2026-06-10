"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type Severity = "low" | "medium" | "high"

type ContentCategory = {
  name: string
  score: number
  severity: Severity
}

const STATUS_CONFIG = {
  safe: {
    variant: "success" as const,
    icon: Shield,
    title: "Safe Content",
    indicatorClass: "bg-green-500",
  },
  suspicious: {
    variant: "warning" as const,
    icon: AlertTriangle,
    title: "Potentially Problematic Content",
    indicatorClass: "bg-yellow-500",
  },
  dangerous: {
    variant: "destructive" as const,
    icon: AlertCircle,
    title: "Harmful Content Detected",
    indicatorClass: "bg-red-500",
  },
}

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  low: "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
  high: "bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20",
}

const SEVERITY_INDICATOR: Record<Severity, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
}

export function TextChecker() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [overallScore, setOverallScore] = useState<number | null>(null)
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const analyzeText = async () => {
    if (!text.trim()) return

    setIsAnalyzing(true)
    setCategories([])
    setOverallScore(null)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.message ?? `Analysis failed (HTTP ${response.status})`)
      }

      const data = json?.data
      if (!data || typeof data.overallSafetyScore !== "number" || !Array.isArray(data.categories)) {
        throw new Error("Unexpected response format from server")
      }

      setOverallScore(data.overallSafetyScore)
      setCategories(data.categories)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    analyzeText()
  }

  const status =
    overallScore === null
      ? null
      : overallScore >= 80
      ? "safe"
      : overallScore >= 40
      ? "suspicious"
      : "dangerous"

  const statusCfg = status ? STATUS_CONFIG[status] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Content Analysis</CardTitle>
        <CardDescription>Check text for potentially harmful or inappropriate content</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="text-input">Text to analyze</Label>
            <Textarea
              id="text-input"
              placeholder="Enter text to analyze for harmful content…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isAnalyzing}
              className="min-h-[120px]"
              aria-describedby="text-hint"
            />
            <p id="text-hint" className="text-xs text-muted-foreground">
              Max 10,000 characters.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!text.trim() || isAnalyzing}
            className="mt-4 w-full"
            aria-label="Analyze text content"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Analyzing…</span>
              </>
            ) : (
              "Analyze Text"
            )}
          </Button>
        </form>

        {isAnalyzing && (
          <div className="mt-4" aria-live="polite">
            <p className="text-sm text-muted-foreground mb-2">Analyzing text content…</p>
            <Progress value={undefined} className="h-2 animate-pulse" aria-label="Loading" />
          </div>
        )}

        {errorMessage && !isAnalyzing && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="ml-2">Analysis Failed</AlertTitle>
            <AlertDescription className="ml-6 mt-1">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {overallScore !== null && statusCfg && !isAnalyzing && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-sm">Overall Safety Score</h3>
              <span className="text-sm font-semibold tabular-nums">{Math.round(overallScore)}%</span>
            </div>
            <Progress
              value={overallScore}
              className="h-2"
              indicatorClassName={statusCfg.indicatorClass}
              aria-label={`Overall safety score: ${Math.round(overallScore)}%`}
            />

            <Alert variant={statusCfg.variant} className="mt-4">
              <statusCfg.icon className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="ml-2">{statusCfg.title}</AlertTitle>
            </Alert>

            {categories.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-sm mb-3">Content Categories</h3>
                <div className="grid grid-cols-2 gap-3" role="list" aria-label="Content category scores">
                  {categories.map((category) => {
                    const sev = (category.severity ?? "low") as Severity
                    return (
                      <div key={category.name} className="border rounded-lg p-3" role="listitem">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{category.name}</span>
                          <Badge className={SEVERITY_BADGE_CLASSES[sev]} aria-label={`${category.score}% ${sev}`}>
                            {category.score}%
                          </Badge>
                        </div>
                        <Progress
                          value={category.score}
                          className="h-1.5"
                          indicatorClassName={SEVERITY_INDICATOR[sev]}
                          aria-label={`${category.name}: ${category.score}%`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Text analysis powered by AI content moderation models
      </CardFooter>
    </Card>
  )
}
