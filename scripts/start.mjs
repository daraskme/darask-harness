import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { createTailscale } from '../src/tailscale.mjs';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';

const require = createRequire(import.meta.url);
const integration = createTailscale({ directory: join(resolveDshHome(), 'darask') });
const state = await integration.status();
await integration.dispose();
const args = ['--profile', 'web', '--host', '127.0.0.1', '--port', '3080'];
if (state.dnsName) args.push('--trusted-host', `${state.dnsName}:8443`);
const child = spawn(process.execPath, [join(require.resolve('@deepseek-ai/dsh/package.json'), '..', 'lib', 'bin.js'), ...args, ...process.argv.slice(2)], { stdio: 'inherit', shell: false, windowsHide: true });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('error', () => { console.error('DSH を起動できません。@deepseek-ai/dsh@0.1.5-rc.2 をインストールしてください。'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
