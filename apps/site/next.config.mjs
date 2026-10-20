/** @type {import('next').NextConfig} */
const nextConfig = {
  // On foodfox.yuri.guru the site shares the domain with apps/web, which owns
  // /_next/*. The VPS build sets SITE_ASSET_PREFIX=/_site and nginx strips the
  // prefix back off (deploy/vps/nginx-apply.sh). Empty everywhere else.
  assetPrefix: process.env.SITE_ASSET_PREFIX || undefined,
  experimental: {
    // The VPS deploy wipes .next and rebuilds while the old server is still
    // up. A request in that window made the old server re-render the missing
    // page and write it into the new .next, so after the restart /course,
    // /privacy, /blog/authors and the 404 pointed at the old webpack chunk and
    // never hydrated. Keep on-demand renders in memory only.
    isrFlushToDisk: false,
  },
};

export default nextConfig;
