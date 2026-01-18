import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Disabled to support API routes
  basePath: "/piano_lessons",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
