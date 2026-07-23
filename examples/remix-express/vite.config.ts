import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Vite's default target includes `safari14`, but esbuild >=0.28 treats
    // Safari <14.1 as unable to handle destructuring (compat-table#2008) and,
    // lacking a destructuring transform, errors instead of passing it through.
    // Bump only the Safari floor to 14.1 to keep the rest of the default target.
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14.1"],
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
  ],
});
