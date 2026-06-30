// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // TODO(hosting): set this to your real apex domain (e.g. https://myproduct.com).
  // Used for canonical URLs, Open Graph URLs, and the generated sitemap.
  // Custom domain: no repo-name base path needed.
  site: "https://example.com",
  output: "static",
  outDir: "./dist",
  integrations: [sitemap()],
});
