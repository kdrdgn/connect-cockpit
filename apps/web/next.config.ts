import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Data lives in the browser mock, so Cache Components / partial prefetching have nothing to cache.
  transpilePackages: ["@cockpit/contract", "@cockpit/mock", "@cockpit/client", "@cockpit/tokens"],
};

export default nextConfig;
