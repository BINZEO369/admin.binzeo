import type { NextConfig } from "next";

const configuredCentralBase = process.env.CENTRAL_API_BASE_URL?.trim().replace(/\/+$/, "");
if (!configuredCentralBase) {
  throw new Error("CENTRAL_API_BASE_URL is required; admin.binzeo has no local API fallback.");
}

const centralOrigin = new URL(configuredCentralBase).origin;
if (process.env.NODE_ENV === "production" && !centralOrigin.startsWith("https://")) {
  throw new Error("CENTRAL_API_BASE_URL must use HTTPS in production.");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${centralOrigin}/v1/:path*` },
      ],
    };
  },
};

export default nextConfig;
