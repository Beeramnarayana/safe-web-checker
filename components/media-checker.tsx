"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, AlertCircle, Loader2, Image, FileVideo } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type MediaAnalysisResult = {
  safetyScore: number
  categories: {
    name: string
    score: number
    severity: "low" | "medium" | "high"
  }[]
}

export function MediaChecker() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<MediaAnalysisResult | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video">("image")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    // Create a preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Reset analysis
    setAnalysisResult(null)
  }

  const analyzeMedia = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)

    try {
      // Simulate API call to analyze media
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // This would be replaced with actual API call
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // const response = await fetch('/api/analyze-media', {
      //   method: 'POST',
      //   body: formData
      // });
      // const data = await response.json();

      // For demo purposes, generate random analysis results
      const mockCategories = [
        {
          name: "NSFW Content",
          score: Math.floor(Math.random() * 100),
          severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
        },
        {
          name: "Violence",
          score: Math.floor(Math.random() * 100),
          severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
        },
        {
          name: "Hate Symbols",
          score: Math.floor(Math.random() * 100),
          severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
        },
        {
          name: "Disturbing Content",
          score: Math.floor(Math.random() * 100),
          severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
        },
      ]

      // Calculate overall safety score (inverse of the average of all category scores)
      const avgCategoryScore = mockCategories.reduce((sum, cat) => sum + cat.score, 0) / mockCategories.length
      const safetyScore = 100 - avgCategoryScore

      setAnalysisResult({
        safetyScore,
        categories: mockCategories,
      })
    } catch (error) {
      console.error("Error analyzing media:", error)
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
    if (!analysisResult) return null
    if (analysisResult.safetyScore >= 80) return "safe"
    if (analysisResult.safetyScore >= 40) return "suspicious"
    return "dangerous"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Content Analysis</CardTitle>
        <CardDescription>Upload images or videos to check for inappropriate content</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              {previewUrl && mediaType === "image" ? (
                <div className="relative w-full">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Preview"
                    className="max-h-[200px] mx-auto rounded-md object-contain"
                  />
                  <p className="text-xs text-center mt-2 text-muted-foreground">{selectedFile?.name}</p>
                </div>
              ) : (
                <>
                  <Image className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG or GIF (max. 10MB)</p>
                </>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isAnalyzing}
              />
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById("video-upload")?.click()}
            >
              {previewUrl && mediaType === "video" ? (
                <div className="relative w-full">
                  <video src={previewUrl} controls className="max-h-[200px] mx-auto rounded-md" />
                  <p className="text-xs text-center mt-2 text-muted-foreground">{selectedFile?.name}</p>
                </div>
              ) : (
                <>
                  <FileVideo className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Click to upload a video</p>
                  <p className="text-xs text-muted-foreground">MP4, WebM or AVI (max. 50MB)</p>
                </>
              )}
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isAnalyzing}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={analyzeMedia} disabled={!selectedFile || isAnalyzing} className="mt-4 w-full">
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            "Analyze Media"
          )}
        </Button>

        {isAnalyzing && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Analyzing media content...</p>
            <Progress value={45} className="h-2" />
          </div>
        )}

        {analysisResult && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Safety Score</h3>
              <span className="text-sm font-medium">{analysisResult.safetyScore}%</span>
            </div>
            <Progress
              value={analysisResult.safetyScore}
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
                {getOverallStatus() === "safe" && "Safe Media"}
                {getOverallStatus() === "suspicious" && "Potentially Problematic Media"}
                {getOverallStatus() === "dangerous" && "Harmful Media Detected"}
              </AlertTitle>
            </Alert>

            <div className="mt-6">
              <h3 className="font-medium mb-3">Content Categories</h3>
              <div className="grid grid-cols-2 gap-3">
                {analysisResult.categories.map((category, index) => (
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
        Media analysis powered by computer vision AI models
      </CardFooter>
    </Card>
  )
}

