import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Update `base` to match your GitHub repo name. If you rename the repo, change this.
export default defineConfig({
  base: "/cyber-drudge/",
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    cssMinify: true,
    outDir: "dist",
  },
});
