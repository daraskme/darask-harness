import { fileURLToPath } from 'node:url';
import { buildClients } from './client-build.mjs';
await buildClients(fileURLToPath(new URL('..', import.meta.url)));
