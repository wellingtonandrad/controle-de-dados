import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
