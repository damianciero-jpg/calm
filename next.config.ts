import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/play/select",
        destination: "/play-select",
      },
    ];
  },
};

export default nextConfig;
