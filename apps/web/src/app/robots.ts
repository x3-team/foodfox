import type { MetadataRoute } from "next";

/** The demo server is public but must not be indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
