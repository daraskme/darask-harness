import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Fixed remote browser. Never fall back to launching the user's Chrome profile.
const require = createRequire(import.meta.url);
process.argv = [process.execPath, process.argv[1], '--wsEndpoint=wss://kitesurf.cloudflare.app/devtools/browser', '--no-usage-statistics', '--no-performance-crux'];
const entry = join(dirname(require.resolve('chrome-devtools-mcp')), 'bin', 'chrome-devtools-mcp.js');
await import(pathToFileURL(entry).href);
