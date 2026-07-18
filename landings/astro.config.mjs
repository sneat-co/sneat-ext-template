import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { createSitemapConfig } from "@sneat/astro/scripts/sitemap.mjs";

// TODO(hosting): set this to your real apex domain (e.g. https://myproduct.com).
// Used for canonical URLs, Open Graph URLs, and the generated sitemap. Keep it
// and the `locales` below in step with src/i18n/languages.ts.
const SITE_URL = "https://example.com";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: "static",
  outDir: "./dist",
  integrations: [
    // Every entry carries the whole hreflang cluster (en, ru, x-default), with
    // the default locale's home as the bare `/`. A plain sitemap() omits the
    // alternates entirely, which for a multilingual site is a silent SEO bug.
    sitemap(
      createSitemapConfig({
        site: SITE_URL,
        locales: ["en", "ru"],
        defaultLocale: "en",
      }),
    ),
  ],
});
