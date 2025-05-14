// next.config.mjs  (oder: next.config.js + "type":"module" in package.json)
import { withPayload } from '@payloadcms/next/withPayload'
import redirects from './redirects.js'

/**
 * Baue dir hier aus den ENV-Variablen deinen Server-URL
 * (z.B. Vercel-Deployment oder Fallback auf localhost)
 */
const SERVER_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Damit next build bei Lint-Warnings nicht fehlschlägt
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript-Fehler beim Build ignorieren
  typescript: {
    ignoreBuildErrors: true,
  },

  // Für Next 13 / React Server Components:
  experimental: {
    reactCompiler: false,
  },

  images: {
    domains: [
      'www.sktchbk.de',
      'hebbkx1anhila5yf.public.blob.vercel-storage.com',
    ],
    remotePatterns: [
      {
        protocol: new URL(SERVER_URL).protocol.replace(':', ''),
        hostname: new URL(SERVER_URL).hostname,
      },
    ],
  },

  // PDF.js worker–Support
  webpack: (config) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    config.module.rules.push({
      test: /\.(pdf)$/i,
      type: 'asset/resource',
    })
    return config
  },

  // Redirects aus deiner redirects.js
  redirects,

  // Hier fügst du die rewrites ein:
  async rewrites() {
    return [
      {
        // Alle Anfragen an /api/media/... leiten wir auf /media/... um
        source: '/api/media/:path*',
        destination: '/media/:path*',
      },
    ]
  },
}

// Wrappe dein Next-Config mit Payload
export default withPayload(nextConfig)
