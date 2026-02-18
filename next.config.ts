import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Default to /piano_lessons for GitHub Pages; override with NEXT_PUBLIC_BASE_PATH='' for Cloudflare Pages previews.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "/piano_lessons",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
