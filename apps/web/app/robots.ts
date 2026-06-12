import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: "https://www.7openclinic.com/sitemap.xml",
    host: "https://www.7openclinic.com"
  };
}
