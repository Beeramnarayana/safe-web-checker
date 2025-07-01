"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type ContentCategory = {
  name: string
  score: number
  severity: "low" | "medium" | "high"
}

export function TextChecker() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [overallScore, setOverallScore] = useState(0)
  const [categories, setCategories] = useState<ContentCategory[]>([])

  const analyzeText = async () => {
    if (!text) return

    setIsAnalyzing(true)
    setCategories([])

    try {
      // Simulate API call to analyze text
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // This would be replaced with actual API call
      // const response = await fetch('/api/analyze-text', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text })
      // });
      // const data = await response.json();

      // For demo purposes, generate random analysis results
      const mockCategories: ContentCategory[] = [
        {
          name: "Toxicity",
          score: Math.floor(Math.random() * 100),
          severity: "medium",
        },
        {
          name: "Hate Speech",
          score: Math.floor(Math.random() * 100),
          severity: "high",
        },
        {
          name: "Harassment",
          score: Math.floor(Math.random() * 100),
          severity: "medium",
        },
        {
          name: "Self-harm",
          score: Math.floor(Math.random() * 100),
          severity: "high",
        },
        {
          name: "Sexual Content",
          score: Math.floor(Math.random() * 100),
          severity: "medium",
        },
        {
          name: "Violence",
          score: Math.floor(Math.random() * 100),
          severity: "high",
        },
      ]

      // Calculate overall safety score (inverse of the average of all category scores)
      const avgCategoryScore = mockCategories.reduce((sum, cat) => sum + cat.score, 0) / mockCategories.length
      const safetyScore = 100 - avgCategoryScore

      setOverallScore(safetyScore)
      setCategories(mockCategories)
    } catch (error) {
      console.error("Error analyzing text:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-500/20 text-green-700 hover:bg-green-500/20"
      case "medium":
        return "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20"
      case "high":
        return "bg-red-500/20 text-red-700 hover:bg-red-500/20"
      default:
        return ""
    }
  }

  const getOverallStatus = () => {
    if (overallScore >= 80) return "safe"
    if (overallScore >= 40) return "suspicious"
    return "dangerous"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Content Analysis</CardTitle>
        <CardDescription>Check text for potentially harmful or inappropriate content</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Enter text to analyze for harmful content..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isAnalyzing}
          className="min-h-[120px]"
        />

        <Button onClick={analyzeText} disabled={!text || isAnalyzing} className="mt-4 w-full">
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            "Analyze Text"
          )}
        </Button>

        {isAnalyzing && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Analyzing text content...</p>
            <Progress value={45} className="h-2" />
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Overall Safety Score</h3>
              <span className="text-sm font-medium">{overallScore}%</span>
            </div>
            <Progress
              value={overallScore}
              className="h-2"
              indicatorClassName={
                getOverallStatus() === "safe"
                  ? "bg-green-500"
                  : getOverallStatus() === "suspicious"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }
            />

            <Alert
              className="mt-4"
              variant={
                getOverallStatus() === "safe"
                  ? "default"
                  : getOverallStatus() === "suspicious"
                    ? "warning"
                    : "destructive"
              }
            >
              {getOverallStatus() === "safe" && <Shield className="h-4 w-4" />}
              {getOverallStatus() === "suspicious" && <AlertTriangle className="h-4 w-4" />}
              {getOverallStatus() === "dangerous" && <AlertCircle className="h-4 w-4" />}
              <AlertTitle className="ml-2">
                {getOverallStatus() === "safe" && "Safe Content"}
                {getOverallStatus() === "suspicious" && "Potentially Problematic Content"}
                {getOverallStatus() === "dangerous" && "Harmful Content Detected"}
              </AlertTitle>
            </Alert>

            <div className="mt-6">
              <h3 className="font-medium mb-3">Content Categories</h3>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge className={getSeverityColor(category.severity)}>{category.score}%</Badge>
                    </div>
                    <Progress
                      value={category.score}
                      className="h-1.5"
                      indicatorClassName={
                        category.severity === "low"
                          ? "bg-green-500"
                          : category.severity === "medium"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Text analysis powered by AI content moderation models
      </CardFooter>
    </Card>
  )
}

