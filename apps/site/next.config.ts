import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const later = [
      "/specialists",
      "/labs",
      "/certificates",
      "/faq",
      "/reviews",
      "/contacts",
      "/report",
      "/course",
      "/privacy",
    ];
    return [
      { source: "/", destination: "/blog", permanent: false },
      ...later.map((source) => ({ source, destination: "/placeholder", permanent: false })),
    ];
  },
};

export default nextConfig;
