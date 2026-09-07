// Import the esbuild-bundled output (built by `npm run build`), not the raw
// TypeScript source - Vercel's per-function bundler doesn't follow/inline
// server.ts's relative imports (e.g. ./src/unitLimits) when importing it
// directly, which crashed every /api/* request with ERR_MODULE_NOT_FOUND
// because the unbundled file was never actually present at runtime.
import app from "../dist/server.cjs";

export default app;
