/** @type {import('next').NextConfig} */
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.live https://*.vercel-scripts.com https://va.vercel-scripts.com https://*.vercel.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://vercel.live",
  "img-src 'self' blob: data: https: https://vercel.live https://*.vercel.com https://vercel.com",
  "font-src 'self' https://fonts.gstatic.com https://vercel.live https://assets.vercel.com data:",
  "connect-src 'self' https://compliance-document-review-494m.onrender.com https://*.vercel.app https://*.vercel.live https://*.vercel.com https://*.vercel-insights.com https://*.vercel-analytics.com ws: wss:",
  "frame-src 'self' https://compliance-document-review-494m.onrender.com https://vercel.live blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
