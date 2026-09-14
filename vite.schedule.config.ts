import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { createHash } from "crypto";
import { resolve } from "path";
import { defineConfig } from "vite";
import { getScheduleContentSecurityPolicy } from "./src/main/schedule-display-csp";

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  base: "/schedule/",
  publicDir: false,
  plugins: [
    react(),
    legacy({
      targets: ["Android >= 4.4", "Chrome >= 40"],
      additionalLegacyPolyfills: ["whatwg-fetch"]
    }),
    {
      name: "schedule-inline-script-csp",
      enforce: "post",
      generateBundle: {
        order: "post",
        handler(_options, bundle) {
          const html = bundle["schedule.html"];
          if (html?.type !== "asset" || typeof html.source !== "string") return;
          // Old Android CSP implementations may not support inline script hashes.
          // Serve classic bootstrap scripts from self instead of allowing unsafe-inline.
          html.source = html.source.replace(
            /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
            (tag, attributes: string, source: string) => {
              if (/type="module"|(?:^|\s)src\s*=/i.test(attributes) || !source.trim()) return tag;
              const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
              const fileName = `assets/schedule-bootstrap-${hash}.js`;
              this.emitFile({ type: "asset", fileName, source });
              if (attributes.includes('id="schedule-basic-debug"')) {
                // Inline ES5 remains first; the guarded copy also runs on CSP1 browsers.
                return `${tag}<script src="/schedule/${fileName}"></script>`;
              }
              return `<script${attributes} src="/schedule/${fileName}"></script>`;
            }
          );
          const policy = getScheduleContentSecurityPolicy(html.source);
          html.source = html.source.replace(
            /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*("\s*\/?\s*>)/i,
            `$1${policy}$2`
          );
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared")
    }
  },
  build: {
    outDir: resolve(__dirname, "out/schedule"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/renderer/schedule.html")
    }
  }
});
