import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { browserRunConfig } from '../src/browser-run.mjs';

const config = browserRunConfig({ accountId: process.env.DARASK_CF_ACCOUNT_ID, apiToken: process.env.DARASK_CF_API_TOKEN });
delete process.env.DARASK_CF_ACCOUNT_ID;
delete process.env.DARASK_CF_API_TOKEN;
// Authentication is added inside this process, never to an OS command line.
process.argv = [process.execPath, process.argv[1],
  `--wsEndpoint=wss://api.cloudflare.com/client/v4/accounts/${config.accountId}/browser-rendering/devtools/browser?keep_alive=60000`,
  `--wsHeaders=${JSON.stringify({ Authorization: `Bearer ${config.apiToken}` })}`,
  '--no-usage-statistics', '--no-performance-crux', '--redact-network-headers'];
const require = createRequire(import.meta.url);
await import(pathToFileURL(join(dirname(require.resolve('chrome-devtools-mcp')), 'bin', 'chrome-devtools-mcp.js')).href);
