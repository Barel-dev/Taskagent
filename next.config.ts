import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Builds run from the project dir; pin the tracing root so the stray
  // lockfile in the user home dir doesn't get picked as the workspace root.
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig
