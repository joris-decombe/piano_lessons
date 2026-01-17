import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // basePath: "/piano_lessons", // Uncomment and set to your repo name if deploying to GitHub Pages Project site
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
