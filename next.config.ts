import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/piano_lessons",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
