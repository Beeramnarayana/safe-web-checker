"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type SafetyStatus = "safe" | "suspicious" | "dangerous" | null

export function UrlChecker() {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>(null)
  const [safetyScore, setSafetyScore] = useState(0)
  const [analysisDetails, setAnalysisDetails] = useState<string[]>([])

  const analyzeUrl = async () => {
    if (!url) return

    setIsAnalyzing(true)
    setSafetyStatus(null)

    try {
      // Simulate API call to analyze URL
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // This would be replaced with actual API call
      // const response = await fetch('/api/analyze-url', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ url })
      // });
      // const data = await response.json();

      // For demo purposes, randomly determine safety
      const randomScore = Math.floor(Math.random() * 100)
      setSafetyScore(randomScore)

      let status: SafetyStatus
      let details: string[] = []

      if (randomScore >= 80) {
        status = "safe"
        details = ["No malicious patterns detected", "Domain has good reputation", "No suspicious redirects"]
      } else if (randomScore >= 40) {
        status = "suspicious"
        details = ["Unusual URL structure", "Recently registered domain", "Limited web presence"]
      } else {
        status = "dangerous"
        details = ["Known phishing patterns", "Malware detected", "Reported by multiple security sources"]
      }

      setSafetyStatus(status)
      setAnalysisDetails(details)
    } catch (error) {
      console.error("Error analyzing URL:", error)
      setAnalysisDetails(["An error occurred during analysis"])
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>URL Safety Analysis</CardTitle>
        <CardDescription>Enter a URL to check if it's safe to visit</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isAnalyzing}
          />
          <Button onClick={analyzeUrl} disabled={!url || isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              "Analyze"
            )}
          </Button>
        </div>

        {isAnalyzing && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Analyzing URL safety...</p>
            <Progress value={45} className="h-2" />
          </div>
        )}

        {safetyStatus && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Safety Score</h3>
              <span className="text-sm font-medium">{safetyScore}%</span>
            </div>
            <Progress
              value={safetyScore}
              className="h-2"
              indicatorClassName={
                safetyStatus === "safe"
                  ? "bg-green-500"
                  : safetyStatus === "suspicious"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }
            />

            <Alert
              className="mt-4"
              variant={safetyStatus === "safe" ? "default" : safetyStatus === "suspicious" ? "warning" : "destructive"}
            >
              {safetyStatus === "safe" && <Shield className="h-4 w-4" />}
              {safetyStatus === "suspicious" && <AlertTriangle className="h-4 w-4" />}
              {safetyStatus === "dangerous" && <AlertCircle className="h-4 w-4" />}
              <AlertTitle className="ml-2">
                {safetyStatus === "safe" && "Safe URL"}
                {safetyStatus === "suspicious" && "Suspicious URL"}
                {safetyStatus === "dangerous" && "Dangerous URL"}
              </AlertTitle>
              <AlertDescription className="ml-6 mt-2">
                <ul className="list-disc space-y-1">
                  {analysisDetails.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </AlertDescription>
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

