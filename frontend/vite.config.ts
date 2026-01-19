import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    https: process.env.VITE_NO_HTTPS === "true"
      ? undefined
      : {
        key: fs.readFileSync(path.resolve(__dirname, "../certs/key.pem")),
        cert: fs.readFileSync(path.resolve(__dirname, "../certs/cert.pem")),
      },
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
