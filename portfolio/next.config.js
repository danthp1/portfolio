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

  // Für Next 13 / React Server Components:
  experimental: {
    reactCompiler: false,
  },

  images: {
    // Statische Domains
    domains: [
      'hebbkx1anhila5yf.public.blob.vercel-storage.com',
    ],
    // Dynamische Remote-Patterns aus der SERVER_URL
    remotePatterns: [
      {
        protocol: new URL(SERVER_URL).protocol.replace(':', ''),
        hostname: new URL(SERVER_URL).hostname,
      },
    ],
  },

  // Configuration for PDF.js worker
  webpack: (config) => {
    // Add support for PDF.js worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Add support for importing PDF files
    config.module.rules.push({
      test: /\.(pdf)$/i,
      type: 'asset/resource',
    });

    return config;
  },

  // Deine Redirect-Rules
  redirects,
}

// Wrappe dein Next-Config mit Payload
export default withPayload(nextConfig)
