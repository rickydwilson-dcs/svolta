import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload' // 2 years
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // Cross-origin isolation for SharedArrayBuffer (multi-threaded WASM)
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless' // Use 'credentialless' instead of 'require-corp' for better compatibility
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Script: Allow inline scripts for next-themes FOUC prevention
              // Note: next-themes requires inline script to prevent flash of unstyled content
              "script-src 'self' 'unsafe-inline' blob: https://js.stripe.com https://*.supabase.co https://cdn.jsdelivr.net https://vercel.live",
              // Style: Allow inline for Tailwind + Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' data: blob: https://*.supabase.co https://api.stripe.com https://*.stripe.com wss://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://staticimgly.com https://vercel.live",
              "frame-src https://js.stripe.com https://checkout.stripe.com https://vercel.live",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
