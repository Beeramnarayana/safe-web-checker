"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, AlertCircle, Loader2, ImageIcon, FileVideo } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Severity = "low" | "medium" | "high"

type MediaAnalysisResult = {
  safetyScore: number
  categories: { name: string; score: number; severity: Severity }[]
}

const STATUS_CONFIG = {
  safe: { variant: "success" as const, icon: Shield, title: "Safe Media", indicatorClass: "bg-green-500" },
  suspicious: { variant: "warning" as const, icon: AlertTriangle, title: "Potentially Problematic Media", indicatorClass: "bg-yellow-500" },
  dangerous: { variant: "destructive" as const, icon: AlertCircle, title: "Harmful Media Detected", indicatorClass: "bg-red-500" },
}

const SEVERITY_BADGE: Record<Severity, string> = {
  low: "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
  high: "bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20",
}

const SEVERITY_INDICATOR: Record<Severity, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
}

export function MediaChecker() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<MediaAnalysisResult | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Revoke old object URL to prevent memory leaks
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setAnalysisResult(null)
    setErrorMessage(null)
  }

  const analyzeMedia = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/analyze-media", {
        method: "POST",
        body: formData,
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.message ?? `Analysis failed (HTTP ${response.status})`)
      }

      const data = json?.data
      if (!data || typeof data.safetyScore !== "number" || !Array.isArray(data.categories)) {
        throw new Error("Unexpected response format from server")
      }

      setAnalysisResult({ safetyScore: data.safetyScore, categories: data.categories })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStatus = (score: number) =>
    score >= 80 ? "safe" : score >= 40 ? "suspicious" : "dangerous"

  const statusCfg = analysisResult ? STATUS_CONFIG[getStatus(analysisResult.safetyScore)] : null

  const DropZone = ({
    type,
    accept,
    inputRef,
  }: {
    type: "image" | "video"
    accept: string
    inputRef: React.RefObject<HTMLInputElement>
  }) => (
    <div
      className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
      role="button"
      tabIndex={0}
      aria-label={`Upload ${type} file`}
    >
      {previewUrl && mediaType === type ? (
        <div className="w-full">
          {type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Uploaded preview" className="max-h-[200px] mx-auto rounded-md object-contain" />
          ) : (
            <video src={previewUrl} controls className="max-h-[200px] mx-auto rounded-md" aria-label="Uploaded video preview" />
          )}
          <p className="text-xs text-center mt-2 text-muted-foreground">{selectedFile?.name}</p>
        </div>
      ) : (
        <>
          {type === "image" ? (
            <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" aria-hidden="true" />
          ) : (
            <FileVideo className="h-10 w-10 text-muted-foreground mb-2" aria-hidden="true" />
          )}
          <p className="text-sm text-muted-foreground mb-1">Click or press Enter to upload a {type}</p>
          <p className="text-xs text-muted-foreground">
            {type === "image" ? "PNG, JPG, GIF, WebP (max 100 MB)" : "MP4, WebM, MOV (max 100 MB)"}
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={isAnalyzing}
        aria-label={`${type} file input`}
      />
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Content Analysis</CardTitle>
        <CardDescription>Upload images or videos to check for inappropriate content</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={mediaType}
          onValueChange={(v) => {
            setMediaType(v as "image" | "video")
            setSelectedFile(null)
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
            setAnalysisResult(null)
            setErrorMessage(null)
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-4">
            <DropZone type="image" accept="image/*" inputRef={imageInputRef} />
          </TabsContent>

          <TabsContent value="video" className="mt-4">
            <DropZone type="video" accept="video/*" inputRef={videoInputRef} />
          </TabsContent>
        </Tabs>

        <Button
          onClick={analyzeMedia}
          disabled={!selectedFile || isAnalyzing}
          className="mt-4 w-full"
          aria-label="Analyze media file"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Analyzing…</span>
            </>
          ) : (
            "Analyze Media"
          )}
        </Button>

        {isAnalyzing && (
          <div className="mt-4" aria-live="polite">
            <p className="text-sm text-muted-foreground mb-2">Analyzing media content…</p>
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

        {analysisResult && statusCfg && !isAnalyzing && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-sm">Safety Score</h3>
              <span className="text-sm font-semibold tabular-nums">{Math.round(analysisResult.safetyScore)}%</span>
            </div>
            <Progress
              value={analysisResult.safetyScore}
              className="h-2"
              indicatorClassName={statusCfg.indicatorClass}
              aria-label={`Safety score: ${Math.round(analysisResult.safetyScore)}%`}
            />

            <Alert variant={statusCfg.variant} className="mt-4">
              <statusCfg.icon className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="ml-2">{statusCfg.title}</AlertTitle>
            </Alert>

            {analysisResult.categories.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-sm mb-3">Content Categories</h3>
                <div className="grid grid-cols-2 gap-3" role="list" aria-label="Media category scores">
                  {analysisResult.categories.map((category) => {
                    const sev = (category.severity ?? "low") as Severity
                    return (
                      <div key={category.name} className="border rounded-lg p-3" role="listitem">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{category.name}</span>
                          <Badge className={SEVERITY_BADGE[sev]} aria-label={`${category.score}% ${sev}`}>
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
        Media analysis powered by computer vision AI models
      </CardFooter>
    </Card>
  )
}
