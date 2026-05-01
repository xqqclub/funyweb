import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    // `npm run typecheck` is the explicit gate. Next's internal checker hangs on
    // this local Node/Next combination after compilation succeeds.
    ignoreBuildErrors: true
  }
};

export default nextConfig;
