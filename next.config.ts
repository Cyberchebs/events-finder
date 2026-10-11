import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@opentelemetry/api-logs",
    "@opentelemetry/exporter-logs-otlp-http",
    "@opentelemetry/resources",
    "@opentelemetry/sdk-logs",
  ],
};

export default nextConfig;
