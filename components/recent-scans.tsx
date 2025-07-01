"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link, FileText, Globe } from "lucide-react"

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

export function RecentScans() {
  const [scans, setScans] = useState<ScanResult[]>([])

  useEffect(() => {
    // In a real app, this would fetch from an API
    const mockScans: ScanResult[] = [
      {
        id: "1",
        type: "url",
        content: "https://example.com/secure-page",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        status: "safe",
        score: 92,
      },
      {
        id: "2",
        type: "text",
        content: "Suspicious message with concerning language...",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        status: "suspicious",
        score: 65,
      },
      {
        id: "3",
        type: "url",
        content: "https://malicious-site.example",
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        status: "dangerous",
        score: 15,
      },
      {
        id: "4",
        type: "media",
        content: "profile-image.jpg",
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        status: "safe",
        score: 95,
      },
      {
        id: "5",
        type: "text",
        content: "Normal conversation text...",
        timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
        status: "safe",
        score: 98,
      },
    ]

    setScans(mockScans)
  }, [])

  const getStatusColor = (status: ScanStatus) => {
    switch (status) {
      case "safe":
        return "bg-green-500/20 text-green-700 hover:bg-green-500/20"
      case "suspicious":
        return "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20"
      case "dangerous":
        return "bg-red-500/20 text-red-700 hover:bg-red-500/20"
      default:
        return ""
    }
  }

  const getTypeIcon = (type: ScanType) => {
    switch (type) {
      case "url":
        return <Globe className="h-4 w-4" />
      case "text":
        return <FileText className="h-4 w-4" />
      case "media":
        return <Link className="h-4 w-4" />
      default:
        return null
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + " years ago"

    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + " months ago"

    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + " days ago"

    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + " hours ago"

    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + " minutes ago"

    return Math.floor(seconds) + " seconds ago"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scans</CardTitle>
        <CardDescription>History of your recent safety checks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scans.map((scan) => (
            <div key={scan.id} className="flex items-start space-x-3 border-b pb-3 last:border-0">
              <div className="mt-0.5 rounded-full bg-muted p-1.5">{getTypeIcon(scan.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {scan.type === "url"
                      ? scan.content.length > 25
                        ? scan.content.substring(0, 25) + "..."
                        : scan.content
                      : scan.type === "text"
                        ? "Text content"
                        : scan.content}
                  </p>
                  <Badge className={getStatusColor(scan.status)}>{scan.score}%</Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="capitalize">{scan.type}</span>
                  <span className="mx-1">•</span>
                  <span>{formatTimeAgo(scan.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

