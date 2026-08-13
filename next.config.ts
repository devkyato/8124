import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/8124" : "",
  trailingSlash: isGitHubPages,
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
