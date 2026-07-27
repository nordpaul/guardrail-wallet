# Search setup

The canonical public site is `https://patronhill.ru`. Publish `robots.txt` and `sitemap.xml` from that origin. The SEO helper in `src/web/seo.ts` generates content for the following public paths:

- `/`
- `/docs`
- `/docs/ru`
- `/api`

It does not place `/dashboard` or `/admin` in the sitemap and disallows both paths in `robots.txt`. This reduces accidental crawling but is not access control: protect private routes with authentication and authorization.

## Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console/).
2. Add `https://patronhill.ru` as a URL-prefix property, or add a Domain property if DNS control is available.
3. Complete ownership verification using a method appropriate for the environment, such as DNS or a managed HTML file. Never put verification tokens in source control or this document.
4. Submit `https://patronhill.ru/sitemap.xml` in the Sitemaps report.
5. Use URL Inspection for the home page, `/docs`, `/docs/ru`, and `/api`, then request indexing only after confirming the page is public and canonical.
6. Monitor Coverage/Indexing, HTTPS, and security reports; fix canonical, redirect, access, or server errors at the origin.

## Yandex Webmaster

1. Open [Yandex Webmaster](https://webmaster.yandex.com/).
2. Add `https://patronhill.ru` as the site.
3. Verify ownership with a deployment-managed method such as DNS or an uploaded verification file. Do not commit verification tokens or values to repository files.
4. Submit `https://patronhill.ru/sitemap.xml` through the Sitemap section.
5. Check indexing, diagnostics, robots processing, and HTTPS status after the crawler has revisited the site.

## Operational notes

- Serve each indexed URL with a stable `200` response and canonical HTTPS URL.
- Redirect HTTP to HTTPS in a single hop.
- Keep sitemap URLs absolute and aligned with canonical URLs.
- Remove or mark private, duplicate, temporary, and test content before requesting indexing.
- Re-submit the sitemap after public URL structure changes; avoid repeatedly requesting indexing for unchanged pages.
