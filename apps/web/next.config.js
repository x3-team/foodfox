/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  ...(basePath ? { basePath } : {}),
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
    // src/instrumentation.ts: reports errors that escape the route handlers.
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
