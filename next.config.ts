import type { NextConfig } from "next";

const centralEnabled = process.env.CENTRAL_API_ENABLED === "true";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_CENTRAL_API_ENABLED: centralEnabled ? "true" : "false",
    NEXT_PUBLIC_AUTH_APP_URL: process.env.NEXT_PUBLIC_AUTH_APP_URL ?? process.env.AUTH_APP_URL ?? "https://auth-binzeo.vercel.app",
  },
  async rewrites() {
    if (!centralEnabled) return [];
    const base = process.env.CENTRAL_API_BASE_URL?.replace(/\/+$/, "");
    if (!base) throw new Error("CENTRAL_API_BASE_URL is required when CENTRAL_API_ENABLED=true");
    const parsed = new URL(base);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      throw new Error("CENTRAL_API_BASE_URL must use HTTPS in production");
    }
    return { beforeFiles: [{ source: "/api/:path*", destination: `${parsed.origin}/v1/:path*` }] };
  },
};

export default nextConfig;
