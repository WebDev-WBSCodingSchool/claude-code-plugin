import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` would otherwise append its own block to AGENTS.md whenever it runs
  // inside a coding agent. AGENTS.md belongs to the course harness and is
  // read-only, so the rewrite would show up as an unexplained diff.
  agentRules: false,
};

export default nextConfig;
