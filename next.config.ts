import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.10.4.20",
    "10.10.4.20:3000",
    "10.10.4.20:3001",
    "10.10.7.66",
    "10.10.1.184",
    "10.10.11.160",
    "192.168.88.57",
    "172.27.176.1",
    "localhost",
    "127.0.0.1",
    "192.168.1.212",
    "192.168.1.113",
  ],
};

export default nextConfig;
