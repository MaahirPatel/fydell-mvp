import type { MetadataRoute } from "next";
import { PRIVATE_PATH_PREFIXES, SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  // Bare prefixes would over-match (`/p` also blocks /pricing and /privacy), so
  // each prefix is disallowed as an exact path and as a directory.
  const disallow = PRIVATE_PATH_PREFIXES.flatMap((prefix) => [`${prefix}$`, `${prefix}/`]);
  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
