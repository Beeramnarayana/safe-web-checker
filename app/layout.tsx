import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevents invisible text while font loads (CLS improvement)
})

export const metadata: Metadata = {
  title: {
    default: "Safe Web Checker — Threat Intelligence Platform",
    template: "%s | Safe Web Checker",
  },
  description:
    "Analyze URLs, text content, and media files for malware, phishing, and harmful content using AI-powered threat intelligence.",
  // FIX: Removed generator: 'v0.dev' — this leaks internal build-tooling information
  robots: { index: false, follow: false }, // Don't index a security tool
  openGraph: {
    title: "Safe Web Checker",
    description: "AI-powered threat analysis for URLs, text, and media",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning prevents false hydration mismatch warnings
    // caused by next-themes injecting the "dark" / "light" class server vs client
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

