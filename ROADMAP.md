# Roadmap

What is planned, roughly in order. Nothing here is promised for a date. Ideas and votes are welcome in the [issues](https://github.com/benitodotcool/tiny-type-rules/issues).

## Next: sites without hydration

When no framework renders the page again in the browser, the final HTML can be fixed as a whole, safely.

- **Shopify themes (Liquid).** Liquid runs on Shopify's servers, out of reach. Options to explore: a theme app extension that loads `watchElement` in the browser, or fixing product and page content when it is written (metafields, an admin action). Hydrogen storefronts are React and use the Next.js integration.
- **A command line tool** to fix the HTML files of a static build: `npx tiny-type-rules dist`, for Astro, Eleventy, Hugo, Jekyll or plain HTML.
- **Server middleware recipes** for pages rendered without hydration: Express, Hono, Astro, email templates.
- **A browser script** for any site: one `<script>` tag that fixes and watches the page, for CMSs such as WordPress or Webflow.

## Later

- **More languages**: German, Spanish, Italian, Dutch, and regional variants (Swiss and Canadian French).
- **More opt-in rules**: hours (`21 h 30`), ordinals (`2ème` to `2e`), the multiplication sign (`3 x 4`), primes (`5′ 11″`), English elisions (`’tis`, `’em`).
- **Visible spaces in HTML output**: write `&nbsp;` and `&#8239;` instead of the raw characters, for editors who read the source.
- **Fixing attributes** that people read: `alt`, `title`, `aria-label`, `placeholder`.
- **A playground page** to try the rules and settings live.

## Done

See the [changelog](CHANGELOG.md).
