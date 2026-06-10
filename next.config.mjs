/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript and ESLint MUST run during builds in production.
  // Disabling these silences type errors that can hide security bugs.
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable Next.js image optimization with explicit allowed domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Server-side security headers (defense-in-depth alongside middleware)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // No caching on API responses — they contain sensitive security data
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ]
  },
  // Experimental: enable React strict mode for better error detection
  reactStrictMode: true,
  // Compress responses
  compress: true,
  // Powered-By header leaks server info
  poweredByHeader: false,
}

export default nextConfig
