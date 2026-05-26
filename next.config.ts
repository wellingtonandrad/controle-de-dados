import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/clinica/:id",
        destination: "/empresa/:id",
        permanent: true,
      },
      {
        source: "/acesso-clinica",
        destination: "/acesso-empresa",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/clinic/:path*",
        destination: "/api/panel/appointments/:path*",
      },
    ];
  },

  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
