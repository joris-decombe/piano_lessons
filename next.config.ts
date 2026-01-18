import type { NextConfig } from "next";

const isStatic = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : undefined,
  basePath: "/piano_lessons",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_IS_STATIC: isStatic ? "true" : "false",
  },
};

export default nextConfig;
