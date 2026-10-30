import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/* The admin footer shows which build is running: version from package.json, the short commit and the build time.
   FOX_BUILD_SHA overrides the commit where the build has no .git (a CI artifact). */
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
let sha = process.env.FOX_BUILD_SHA || "";
if (!sha) {
  try { sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { sha = ""; }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FOX_BUILD_VERSION: pkg.version ?? "",
    FOX_BUILD_SHA: sha.slice(0, 7),
    FOX_BUILD_TIME: new Date().toISOString(),
  },
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
