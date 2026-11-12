import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://hendrixventures.com",
  // Deal pages are link-only (dotato DOT-512): never listed in the sitemap.
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/deals/") })],
  build: {
    inlineStylesheets: "auto",
  },
});
