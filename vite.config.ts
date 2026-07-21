// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GitHub Pages only serves static files, so that build swaps SSR/nitro for a
// prerendered SPA shell served from the repo subpath. Lovable/dev builds are
// untouched (PAGES_DEPLOY is only set by .github/workflows/deploy-pages.yml).
const isGithubPages = process.env.PAGES_DEPLOY === "true";
const base = process.env.PAGES_BASE ?? "/";

export default defineConfig({
  ...(isGithubPages ? { nitro: false as const, vite: { base } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isGithubPages
      ? {
          router: { basepath: base },
          spa: { enabled: true, prerender: { outputPath: "/index.html" } },
        }
      : {}),
  },
});
