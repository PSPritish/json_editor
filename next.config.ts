import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Removed custom webpack config for worker-loader.
  // Next.js supports native web workers via new Worker(new URL(..., import.meta.url))
};

export default nextConfig;
