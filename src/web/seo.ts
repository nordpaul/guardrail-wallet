const origin = "https://patronhill.ru";

const publicPaths = ["/", "/docs", "/docs/ru", "/api"] as const;

export const robotsTxt = (): string => `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin

Sitemap: ${origin}/sitemap.xml
`;

export const sitemapXml = (): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPaths.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join("\n")}
</urlset>
`;
