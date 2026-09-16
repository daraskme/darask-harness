import { readFileSync } from 'node:fs';

// Compatibility for the pinned DSH 0.1.5-rc.2 browser modules. Serve derived
// assets through the authenticated Connection carrier; never change installed
// packages, connection.isLoopback, native-open policy or server authorization.
export const COMPAT_PATH = '/api/darask/client-bundle';
export const CLIENT_PATCHES = {
  '@deepseek-ai/dsh-client-ui-layout': [
    [/return renderSlot\("main", \{\}, \{ entryKey: usePanelInfo\(\(info\) => info\.activePanelId\) \?\? "conversation" \}\);/g,
      'return (0, react_jsx_runtime.jsxs)("div", { className: "darask-main-stack", children: [renderSlot("main", {}, { entryKey: usePanelInfo((info) => info.activePanelId) ?? "conversation" }), renderSlot("main.persistent", {})] });'],
    [/"main": \{\s*kind: "keyed",\s*scope: "root"\s*\},/g,
      '"main": { kind: "keyed", scope: "root" }, "main.persistent": { kind: "single", scope: "root" },'],
  ],
  '@deepseek-ai/dsh-client-ui-workspace': [
    [/children: \{ "sidebar\.workspaces\.directoryFlow": \{/g,
      'children: { "sidebar.workspaces.remote": { kind: "single", scope: "root" }, "sidebar.workspaces.directoryFlow": {'],
    [/className: WorkspaceBrowser_module_css_default\.listArea,\s*children: (wide && \(normalizedQuery[\s\S]*?\}\)\))\s*\}\),\s*\(0, react_jsx_runtime\.jsxs\)\(_deepseek_ai_dsh_client_ui_primitives\.Modal, \{\s*open: renameTarget !== null,/g,
      'className: WorkspaceBrowser_module_css_default.listArea + " darask-unified-workspace-list", children: [(0, react_jsx_runtime.jsx)("div", { className: "darask-local-workspaces", children: $1 }, "local"), wide && (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: renderSlot("sidebar.workspaces.remote", { query: normalizedQuery }) }, "remote")] }), (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, { open: renameTarget !== null,'],
    [/(var WorkspaceBrowser_module_css_default = \{[^}]*?"treeBody": "[^" ]+)"/g, '$1 darask-native-workspace-tree"'],
    [/(var WorkspaceBrowser_module_css_default = \{[^}]*?"list": "[^" ]+)"/g, '$1 darask-native-workspace-list"'],
    [/(var WorkspaceBrowser_module_css_default = \{[^}]*?"fade": "[^" ]+)"/g, '$1 darask-native-workspace-fade"'],
    [/function sessionNode\(s, descendants, pendingInteractions\) \{/g,
      'const prevRunning = /* @__PURE__ */ new Map();\n\t\tconst doneReminder = /* @__PURE__ */ new Map();\n\t\tfunction sessionNode(s, descendants, pendingInteractions, jobs) {\n\t\t\tif (prevRunning.get(s.id) && !s.running) doneReminder.set(s.id, true);\n\t\t\tif (s.running) doneReminder.delete(s.id);\n\t\t\tprevRunning.set(s.id, s.running === true);'],
    [/completed: s\.completed === true,\s*hasActiveSchedule: hasActiveSchedule\(s\),/g,
      'completed: s.completed === true || doneReminder.get(s.id) === true, error: Array.isArray(jobs) && jobs.some((job) => job.status === "failed"), hasActiveSchedule: hasActiveSchedule(s),'],
    [/sessions: expanded \? g\.sessions\.map\(\(session\) => sessionNode\(session, descendants, pendingInteractions\)\) : \[\]/g,
      'sessions: expanded ? g.sessions.map((session) => sessionNode(session, descendants, pendingInteractions, list.jobsBySession?.[session.id])) : [], activity: (() => { const nodes = g.sessions.map((session) => sessionNode(session, descendants, pendingInteractions, list.jobsBySession?.[session.id])); if (nodes.some((n) => n.pendingInteraction)) return "warning"; if (nodes.some((n) => n.error)) return "error"; if (nodes.some((n) => n.running || n.runningSubagentCount > 0)) return "ongoing"; if (nodes.some((n) => n.completed)) return "done"; })()'],
    [/return rows\.map\(\(session\) => sessionNode\(session, descendants, pendingInteractions\)\);/g,
      'return rows.map((session) => sessionNode(session, descendants, pendingInteractions, list.jobsBySession?.[session.id]));'],
    [/completed: summary\.completed === true,\s*hasActiveSchedule: hasActiveSchedule\(summary\),/g,
      'completed: summary.completed === true || doneReminder.get(summary.id) === true, error: Array.isArray(list.jobsBySession?.[summary.id]) && list.jobsBySession[summary.id].some((job) => job.status === "failed"), hasActiveSchedule: hasActiveSchedule(summary),'],
    [/if \(pending !== void 0\) return subagents === void 0 \? \[pending\] : \[pending, subagents\];\s*if \(node\.running\) \{/g,
      'if (pending !== void 0) return subagents === void 0 ? [pending] : [pending, subagents];\n\t\t\tif (node.error) return [{ state: "error", label: "エラー" }];\n\t\t\tif (node.running) {'],
    [/className: Rows_module_css_default\.projectText,\s*children: \(0, react_jsx_runtime\.jsx\)\("span", \{\s*className: Rows_module_css_default\.title,\s*children: label\s*\}\)\s*\}\),/g,
      'className: Rows_module_css_default.projectText, children: (0, react_jsx_runtime.jsx)("span", { className: Rows_module_css_default.title, children: label }) }), group.activity ? (0, react_jsx_runtime.jsx)("span", { className: Rows_module_css_default.slot, children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: group.activity }) }) : null,'],
  ],
  '@deepseek-ai/dsh-client-ui-settings': [[
    /const persistence = ctx\.remote\.\$host\.isLoopback \? "host" : "memory";/g,
    'const persistence = "host"; // DARASK: authenticated remote settings',
  ]],
  'dsh-grok-provider': [[
    /ctx\.slots\.inject\("settings\.section", \(\) => ctx\.slots\.register\(\{\s*name: "settings\.section", id: "grok-auth",[\s\S]*?\}, GrokSettings\)\)\s*;?/g,
    '/* DARASK: Grok authentication is in the shared Accounts section. */',
  ]],
  'dsh-codex-connect': [
    [/ctx\.slots\.inject\("settings\.plugin\.item", \(\) => ctx\.slots\.register\(\{\s*name: "settings\.plugin\.item",\s*key: OPENAI_CODEX_SETTINGS_NAMESPACE,[\s\S]*?\}, OpenAICodexPluginCard\)\);/g,
      '/* DARASK: use the shared Accounts section; keep generic plugin configuration. */'],
    [/ctx\.slots\.inject\("settings\.models\.footer", \(\) => ctx\.slots\.register\(\{\s*name: "settings\.models\.footer",\s*id: "dsh-codex-connect-account",[\s\S]*?\}, OpenAICodexModelsCard\)\);/g,
      '/* DARASK: Codex authentication is in the shared Accounts section. */'],
  ],
};

export function patchClient(id, source) {
  for (const [pattern, replacement] of CLIENT_PATCHES[id] ?? []) {
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`DARASK: incompatible client bundle: ${id}`);
    // Startup responses concatenate many factories. Never let a UI rewrite
    // consume another plugin's registration, even if an upstream shape drifts.
    const match = matches[0], marker = 'window.__ModuleLoader__.load(';
    const start = source.lastIndexOf(marker, match.index);
    const owner = /^window\.__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)"/.exec(source.slice(start))?.[1];
    const next = source.indexOf(marker, start + marker.length);
    if (owner !== id || next >= 0 && match.index + match[0].length > next) throw new Error(`DARASK: client patch escaped its plugin: ${id}`);
    source = source.replace(pattern, replacement);
  }
  return source;
}

export function compatibleUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/plugins/')) return value;
  if (!Object.keys(CLIENT_PATCHES).some(id => value.includes(`${id}/client.js`) && !value.includes(`${id}/client.js.map`))) return value;
  const revision = /[?&]rev=([^&#]+)/.exec(value)?.[1];
  return `${COMPAT_PATH}?v=10&resource=${encodeURIComponent(value)}${revision ? `&rev=${revision}` : ''}`;
}

export function compatibleResource(requestUrl) {
  const url = new URL(requestUrl);
  const resource = url.searchParams.get('resource');
  if (!resource?.startsWith('/plugins/') || resource.includes('://') || compatibleUrl(resource) === resource) return null;
  const revision = url.searchParams.get('rev');
  if (revision && !/^[A-Za-z0-9_-]{1,256}$/.test(revision)) return null;
  // Preserve DSH's /plugins/??a,b&rev=... combo spelling; URLSearchParams
  // would re-encode the combo key. HMR updates the outer rev on invalidate.
  return revision ? resource.replace(/([?&]rev=)[^&#]*/, `$1${encodeURIComponent(revision)}`) : resource;
}

// Only rewrite URL fields. Module ids, integrity revisions and dependencies
// remain the host's facts. Copy the graph instead of mutating the registry.
export function compatibleGraph(value) {
  if (Array.isArray(value)) return value.map(compatibleGraph);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) =>
    [key, ['url', 'src'].includes(key) ? compatibleUrl(child) : compatibleGraph(child)]));
}

export function installClientCompatibility(ctx) {
  const refresh = () => {
    for (const id of Object.keys(CLIENT_PATCHES)) {
      const path = ctx.clientModules.clientPath(id);
      if (!path) throw new Error(`DARASK: missing client bundle: ${id}`);
      const source = readFileSync(path, 'utf8');
      patchClient(id, source);
    }
  };
  refresh();
  ctx.on('webserver/index-inject', table => {
    for (let index = 0; index < table.length; index++) table[index] = compatibleGraph(table[index]);
  });
  ctx.connection.fetch.register({ path: COMPAT_PATH, methods: ['GET', 'HEAD'], requestBody: 'buffered', async fetch(request) {
    const resource = compatibleResource(request.url);
    if (!resource) return new Response('Not found', { status: 404 });
    const response = ctx.clientModules.fetchBundle(new Request(new URL(resource, 'http://dsh.internal'), { method: 'GET' }));
    if (!response.ok) return response;
    let text = await response.text();
    for (const id of Object.keys(CLIENT_PATCHES)) if (resource.includes(`${id}/client.js`)) text = patchClient(id, text);
    return new Response(request.method === 'HEAD' ? null : text, { headers: {
      'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } });
}
