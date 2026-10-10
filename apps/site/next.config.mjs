/** @type {import('next').NextConfig} */
const nextConfig = {
  // On foodfox.yuri.guru the site shares the domain with apps/web, which owns
  // /_next/*. The VPS build sets SITE_ASSET_PREFIX=/_site and nginx strips the
  // prefix back off (deploy/vps/nginx-apply.sh). Empty everywhere else.
  assetPrefix: process.env.SITE_ASSET_PREFIX || undefined,
};

export default nextConfig;
