"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Link2, FileText, ImageIcon } from "lucide-react"

type ScanType = "url" | "text" | "media"
type ScanStatus = "safe" | "suspicious" | "dangerous"

type ScanResult = {
  id: string
  type: ScanType
  content: string
  timestamp: Date
  status: ScanStatus
  score: number
}

const STATUS_BADGE: Record<ScanStatus, string> = {
  safe: "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20",
  suspicious: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
  dangerous: "bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20",
}

// FIX: was using <Link> icon for media — now uses <ImageIcon>
const TYPE_ICON: Record<ScanType, React.ElementType> = {
  url: Link2,
  text: FileText,
  media: ImageIcon,
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ]
  for (const [duration, label] of intervals) {
    const count = Math.floor(seconds / duration)
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`
  }
  return "just now"
}

function ScanSkeleton() {
  return (
    <div className="flex items-start space-x-3 border-b pb-3 last:border-0">
      <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

export function RecentScans() {
  const [scans, setScans] = useState<ScanResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In Phase 4, this will fetch from /api/scans with auth token
    // For now, use realistic demo data
    const timer = setTimeout(() => {
      setScans([
        {
          id: "1",
          type: "url",
          content: "https://example.com/secure-page",
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          status: "safe",
          score: 92,
        },
        {
          id: "2",
          type: "text",
          content: "Suspicious phishing message…",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: "suspicious",
          score: 65,
        },
        {
          id: "3",
          type: "url",
          content: "https://malicious-site.example",
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          status: "dangerous",
          score: 15,
        },
        {
          id: "4",
          type: "media",
          content: "profile-image.jpg",
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
          status: "safe",
          score: 95,
        },
        {
          id: "5",
          type: "text",
          content: "Normal conversation text…",
          timestamp: new Date(Date.now() - 1000 * 60 * 180),
          status: "safe",
          score: 98,
        },
      ])
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scans</CardTitle>
        <CardDescription>History of your recent safety checks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" role="list" aria-label="Recent scans">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ScanSkeleton key={i} />)
            : scans.map((scan) => {
                const Icon = TYPE_ICON[scan.type]
                const displayContent =
                  scan.type === "url"
                    ? scan.content.length > 28
                      ? scan.content.substring(0, 28) + "…"
                      : scan.content
                    : scan.content

                return (
                  <div
                    key={scan.id}
                    className="flex items-start space-x-3 border-b pb-3 last:border-0"
                    role="listitem"
                  >
                    <div
                      className="mt-0.5 rounded-full bg-muted p-1.5 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium leading-none truncate" title={scan.content}>
                          {displayContent}
                        </p>
                        <Badge className={`flex-shrink-0 ${STATUS_BADGE[scan.status]}`}>
                          {scan.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span className="capitalize">{scan.type}</span>
                        <span className="mx-1" aria-hidden="true">•</span>
                        <time dateTime={scan.timestamp.toISOString()}>
                          {formatTimeAgo(scan.timestamp)}
                        </time>
                      </div>
                    </div>
                  </div>
                )
              })}
        </div>
      </CardContent>
    </Card>
  )
}
