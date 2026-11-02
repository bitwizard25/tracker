import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Migration SQL files are read from disk at runtime (Vercel demo mode), so bundle them into every route.
  outputFileTracingIncludes: {
    "/*": ["./src/server/db/migrations/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
