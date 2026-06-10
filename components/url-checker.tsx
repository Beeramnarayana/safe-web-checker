"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type SafetyStatus = "safe" | "suspicious" | "dangerous" | null

const STATUS_CONFIG = {
  safe: {
    variant: "success" as const,
    icon: Shield,
    title: "Safe URL",
    indicatorClass: "bg-green-500",
  },
  suspicious: {
    variant: "warning" as const,
    icon: AlertTriangle,
    title: "Suspicious URL",
    indicatorClass: "bg-yellow-500",
  },
  dangerous: {
    variant: "destructive" as const,
    icon: AlertCircle,
    title: "Dangerous URL",
    indicatorClass: "bg-red-500",
  },
}

export function UrlChecker() {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>(null)
  const [safetyScore, setSafetyScore] = useState(0)
  const [analysisDetails, setAnalysisDetails] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const analyzeUrl = async () => {
    if (!url) return

    setIsAnalyzing(true)
    setSafetyStatus(null)
    setAnalysisDetails([])
    setErrorMessage(null)

    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.message ?? `Analysis failed (HTTP ${response.status})`)
      }

      const data = json?.data
      if (!data || typeof data.safetyScore !== "number") {
        throw new Error("Unexpected response format from server")
      }

      const score: number = data.safetyScore
      setSafetyScore(score)
      setSafetyStatus(score >= 80 ? "safe" : score >= 40 ? "suspicious" : "dangerous")
      setAnalysisDetails(Array.isArray(data.details) ? data.details : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    analyzeUrl()
  }

  const statusCfg = safetyStatus ? STATUS_CONFIG[safetyStatus] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>URL Safety Analysis</CardTitle>
        <CardDescription>Enter a URL to check if it&apos;s safe to visit</CardDescription>
      </CardHeader>
      <CardContent>
        {/* FIX: Wrapped in <form> so Enter key submits the analysis */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex w-full items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="url-input">URL to analyze</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isAnalyzing}
                aria-describedby="url-hint"
                autoComplete="off"
              />
              <p id="url-hint" className="text-xs text-muted-foreground">
                Only public HTTP/HTTPS URLs are accepted.
              </p>
            </div>
            <Button type="submit" disabled={!url.trim() || isAnalyzing} aria-label="Analyze URL">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing…</span>
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
        </form>

        {isAnalyzing && (
          <div className="mt-4" aria-live="polite" aria-label="Analysis in progress">
            <p className="text-sm text-muted-foreground mb-2">Analyzing URL safety…</p>
            <Progress value={undefined} className="h-2 animate-pulse" aria-label="Loading" />
          </div>
        )}

        {errorMessage && !isAnalyzing && (
          <Alert variant="destructive" className="mt-4" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="ml-2">Analysis Failed</AlertTitle>
            <AlertDescription className="ml-6 mt-1">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {safetyStatus && statusCfg && !isAnalyzing && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-sm">Safety Score</h3>
              <span className="text-sm font-semibold tabular-nums">{Math.round(safetyScore)}%</span>
            </div>
            <Progress
              value={safetyScore}
              className="h-2"
              indicatorClassName={statusCfg.indicatorClass}
              aria-label={`Safety score: ${Math.round(safetyScore)}%`}
            />

            <Alert variant={statusCfg.variant} className="mt-4">
              <statusCfg.icon className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="ml-2">{statusCfg.title}</AlertTitle>
              {analysisDetails.length > 0 && (
                <AlertDescription className="ml-6 mt-2">
                  <ul className="list-disc space-y-1">
                    {analysisDetails.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </AlertDescription>
              )}
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Analysis powered by AI and multiple security databases
      </CardFooter>
    </Card>
  )
}
