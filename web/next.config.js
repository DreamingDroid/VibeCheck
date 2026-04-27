/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizes the build output for Docker/self-hosted deployments.
  // Produces a minimal, self-contained server in .next/standalone
  output: 'standalone',
};

module.exports = nextConfig;
