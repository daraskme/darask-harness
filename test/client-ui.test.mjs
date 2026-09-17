import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const primitives = {
  Button: ({ variant, size, children, ...props }) => React.createElement('button', props, children),
  Input: props => React.createElement('input', props), Tag: ({ tone, children }) => React.createElement('span', null, children),
  Switch: ({ checked, onChange, label, ...props }) => React.createElement('button', { ...props, role: 'switch', 'aria-label': label, 'aria-checked': checked }),
  Modal: ({ open, children }) => open ? children : null,
  Menu: ({ anchor }) => anchor,
  StateDot: ({ state }) => React.createElement('span', { 'data-state': state, className: 'state-dot' }),
};
test('Accounts centralizes provider login; sidebar Usage displays available balances above Settings', async () => {
  let plugin, dictionary; const entries = [], disposers = [];
  vm.runInNewContext(readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load({ factory }) { plugin = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? primitives : require(id)); } } },
    document: { createElement: () => ({ dataset: {}, remove() {} }), head: { appendChild() {} } },
    AbortController, AbortSignal, setTimeout, clearTimeout, structuredClone, URL, Intl,
    fetch() { throw new Error('SSR must not send credentials or start requests'); },
  });
  plugin.apply({ sidebarRightTabs: { register() { return () => {}; } }, effect(fn) { disposers.push(fn()); },
    locale: { register(ns, value) { if (ns === 'settings.darask') dictionary = value; return () => {}; }, bind() { return key => dictionary.ja[key]; } },
    slots: { inject(name, callback) { return callback(); }, register(options, component) { entries.push({ options, component }); return () => {}; } },
  });
  let submitted;
  const callbackWindow = {
    location: { href: 'http://127.0.0.1:3080/?darask_openrouter_callback=1&state=fixture-state&code=fixture-code' },
    history: { state: null, replaceState(_state, _title, url) { this.replaced = url; } },
  };
  await plugin.completeOpenRouterRedirect(callbackWindow, async (url, options) => { submitted = { url, options }; return { ok: true }; });
  assert.equal(callbackWindow.history.replaced, 'http://127.0.0.1:3080/');
  assert.equal(submitted.url, '/api/darask/action');
  assert.deepEqual(JSON.parse(submitted.options.body), { action: 'submitCallback', provider: 'openrouter', config: { callbackUrl: callbackWindow.location.href } });
  assert.deepEqual(Object.keys(dictionary.ja).sort(), Object.keys(dictionary.en).sort());
  const accounts = entries.find(e => e.options.id === 'darask-accounts');
  const usage = entries.find(e => e.options.id === 'darask-usage');
  assert.equal(accounts.options.name, 'settings.section');
  assert.equal(usage.options.name, 'sidebar.footer.action');
  assert.ok(!entries.some(e => e.options.id === 'darask-gpu'));
  const development = entries.find(e => e.options.id === 'darask-development');
  assert.equal(development.options.name, 'settings.section');
  const restart = entries.find(e => e.options.id === 'darask-restart');
  assert.equal(restart.options.name, 'settings.general.item');
  assert.equal(restart.options.order, 100);
  assert.ok(renderToStaticMarkup(React.createElement(restart.component, { t: key => dictionary.ja[key] })).includes('DSH を再起動'));
  const addons = entries.find(e => e.options.id === 'darask-addons');
  assert.equal(addons.options.name, 'settings.section');
  assert.equal(addons.options.order, 12);
  const archives = entries.find(e => e.options.id === 'darask-archives');
  assert.equal(archives.options.name, 'settings.section');
  assert.equal(archives.options.order, 13);
  assert.ok(renderToStaticMarkup(React.createElement(archives.component)).includes('アーカイブ'));
  assert.ok(renderToStaticMarkup(React.createElement(development.component)).includes('開発・更新'));
  assert.equal(entries.filter(e => e.options.name === 'sidebar.workspaces.directoryFlow').length, 1);
  assert.equal(entries.filter(e => e.options.name === 'sidebar.workspaces.remote').length, 1);
  assert.ok(!entries.some(e => e.options.id === 'darask-remote-workspaces'));
  assert.equal(entries.filter(e => e.options.name === 'main' && e.options.key === 'darask-workspace').length, 1);
  assert.equal(entries.filter(e => e.options.name === 'main.persistent').length, 1);
  const providers = [
    { id: 'deepseek', name: 'DeepSeek API', usage: { status: 'unavailable' }, model: 'deepseek-v4-pro' },
    { id: 'openai', name: 'OpenAI API', usage: { status: 'available', used: { amount: 1200, unit: 'tokens', scope: 'complimentary-daily' } } },
    { id: 'openrouter', name: 'OpenRouter', usage: { status: 'available', credits: { balance: 0, unit: 'USD' } } },
    { id: 'grok', name: 'Grok', usage: { status: 'available', windows: [{ id: 'weekly', remainingPercent: 64, label: 'Grok weekly' }] } },
    { id: 'cursor', name: 'Cursor', usage: { status: 'unsupported', windows: [] } },
    { id: 'codex', name: 'Codex', usage: { status: 'available', credits: { balance: '12.3456789' } } },
    { id: 'claude', name: 'Claude', usage: { status: 'unavailable' } },
  ].map(p => ({ ...p, enabled: true, auth: 'authenticated', model: p.model ?? '', executable: '', capability: p.id === 'cursor' ? 'agent' : 'model' }));
  const props = { t: key => dictionary.ja[key], wide: true, action: async () => {}, load: async () => {},
    useDaraskStatus: () => ({ data: { providers, priority: providers.map(p => p.id), routingEnabled: false, purposeRoutes: { research: 'grok' }, jev: { model: 'typesafe-ai/jev', configured: false } }, pending: null, error: null, loading: false }) };
  const sidebar = renderToStaticMarkup(React.createElement(usage.component, props));
  for (const text of ['Usage', 'OpenAI API', 'OpenRouter', 'Grok', 'Codex', '残り 64%', '12.3456789', '0 USD', '1,200']) assert.ok(sidebar.includes(text), text);
  assert.ok(!sidebar.includes('Cursor')); assert.ok(!sidebar.includes('Claude')); assert.ok(!sidebar.includes('残り 0%'));
  const panel = renderToStaticMarkup(React.createElement(accounts.component, props));
  for (const text of ['アカウント', 'DeepSeek API', 'DeepSeek公式APIキー', 'DeepSeek V4 Pro', 'OpenAI API', 'データ共有の危険', 'OpenRouter', 'Grok', 'Cursor', 'Codex', 'Claude', 'ログイン', '会話モデル・CLI への作業委任', 'モデル選択に表示', 'OpenRouter · OpenAI Sol', 'Codex · Astra', 'Claude Fable 5.1']) assert.ok(panel.includes(text), text);
  for (const text of ['用途別のモデル', '検索・調査', 'Jev 評価', 'typesafe-ai/jev', 'Vercel AI Gateway API キー', 'API キーを発行']) assert.ok(panel.includes(text), text);
  assert.match(panel, /<select[^>]*><option value="">通常の優先順位<\/option>.*?<option value="grok" selected="">Grok<\/option>/);
  assert.ok(!panel.includes('<progress'));
  for (const label of ['QR でかんたん接続', 'QR で PC を追加', 'この PC の QR を表示']) assert.ok(panel.includes(label), label);
  for (const label of ['AI アカウント', 'PC・Tailscale', 'ブラウザー', 'PC 画面の操作', '画面操作を有効にする']) assert.ok(panel.includes(label), label);
  assert.match(panel, /id="darask-panel-pc"[^>]*hidden/);
  assert.equal(plugin.hasUsage({ local: { promptTokens: 0 } }), true);
  assert.equal(plugin.hasUsage({ credits: { balance: null }, windows: [{ remainingPercent: NaN }] }), false);
  providers.find(p => p.id === 'codex').accounts = [
    { accountKey: 'first', displayName: '個人用', active: true, usage: { status: 'available', credits: { balance: '11.123' } } },
    { accountKey: 'second', displayName: '作業用', active: false, usage: { status: 'available', credits: { balance: '22.456' } } },
  ];
  const multiSidebar = renderToStaticMarkup(React.createElement(usage.component, props));
  for (const text of ['Codex · 個人用', 'Codex · 作業用', '11.123', '22.456', '使用中']) assert.ok(multiSidebar.includes(text), text);
  assert.ok(!multiSidebar.includes('12.3456789'), 'the active quota must not also appear as a duplicate provider total');
  const multiPanel = renderToStaticMarkup(React.createElement(accounts.component, props));
  for (const text of ['アカウントを追加', '個人用', '作業用', '11.123', '22.456', 'このアカウントを削除']) assert.ok(multiPanel.includes(text), text);
  providers.push({
    id: 'local', name: 'ローカルモデル', enabled: true, auth: 'unavailable', model: 'unseen-gemma4-26b-q4', executable: 'C:\\llama-server.exe',
    localRuntime: { phase: 'starting', local: true, owned: true, progress: { stage: 'loading', percent: 42, lastLine: 'load_tensors: 42%', elapsedMs: 8000 } },
  });
  props.useDaraskStatus = () => ({ data: { providers, priority: providers.map(p => p.id), routingEnabled: false, local: { baseUrl: 'http://127.0.0.1:18081/v1', modelFile: 'C:\\model.gguf', contextSize: 8192, gpuLayers: 40, autoStart: false } }, pending: null, error: null, loading: false });
  const localPanel = renderToStaticMarkup(React.createElement(accounts.component, props));
  for (const text of ['モデルを起動', 'モデルを停止', '接続をテスト', '起動の進捗', '重みを読み込み中', 'load_tensors: 42%']) assert.ok(localPanel.includes(text), text);
  assert.ok(localPanel.includes('<progress'));
  const remoteReady = {
    id: 'local', name: 'ローカルモデル', enabled: true, auth: 'authenticated', model: 'unseen-gemma4-26b-q4', executable: 'C:\\llama-server.exe',
    localRuntime: { phase: 'ready', local: true, owned: false, reachable: true, progress: { stage: 'ready', percent: 100 } },
  };
  providers[providers.length - 1] = remoteReady;
  const stopEnabled = renderToStaticMarkup(React.createElement(accounts.component, props));
  assert.match(stopEnabled, />モデルを停止<\/button>/);
  assert.ok(!stopEnabled.includes('この URL の起動は相手の PC で行ってください。'));
  providers[providers.length - 1] = { ...remoteReady, localRuntime: { ...remoteReady.localRuntime, local: false, reachable: true } };
  const elsewhere = renderToStaticMarkup(React.createElement(accounts.component, props));
  assert.ok(elsewhere.includes('この URL の起動は相手の PC で行ってください。'));
  assert.match(elsewhere, /disabled=""[^>]*>モデルを停止<\/button>|disabled>モデルを停止<\/button>/);
  disposers.forEach(fn => fn?.());
});

test('workspace UI retains other PCs and shows existing and added remote workspaces together', () => {
  let plugin;
  vm.runInNewContext(readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load({ factory }) { plugin = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? primitives : require(id)); } } },
    AbortController, AbortSignal, setTimeout, clearTimeout, URL,
  });
  const old = { id: 'old', title: '既存プロジェクト', path: 'F:\\H3 concept\\h3-workspace' };
  const added = { id: 'new', title: '新規プロジェクト', path: 'D:\\New' };
  const data = { nodes: [{ id: 'win', name: 'win' }], groups: [
    { node: 'local', name: 'sub', workspaces: [{ id: 'local', title: 'SUB の作業', path: 'C:\\Projects' }] },
    { node: 'win', name: 'win', workspaces: [old] },
    { node: 'mac', name: 'MacBook Air', workspaces: [{ id: 'mac', title: 'Mac の作業', path: '/Users/darask/Projects' }], status: 'offline' },
  ] };
  const merged = plugin.mergeWorkspaceGroup(data, 'win', { id: 'win-host', name: 'WIN', workspaces: [old, added] });
  assert.equal(merged.groups.length, 3);
  assert.equal(merged.groups[0], data.groups[0]); assert.equal(merged.groups[2], data.groups[2]);
  assert.equal(data.groups[1].workspaces.length, 1, 'the previous snapshot is not mutated');
  assert.equal(merged.groups[1].workspaces.length, 2);
  const markup = renderToStaticMarkup(React.createElement(plugin.WorkspaceGroups, { groups: merged.groups, onOpen() {} }));
  for (const label of ['既存プロジェクト', '新規プロジェクト', 'SUB の作業', 'Mac の作業', 'リモート環境', 'オフライン']) assert.ok(markup.includes(label), label);
  const rows = renderToStaticMarkup(React.createElement(plugin.RemoteWorkspaceRows, { groups: merged.groups, onOpen() {} }));
  for (const label of ['既存プロジェクト', '新規プロジェクト', 'Mac の作業']) assert.ok(rows.includes(label), label);
  assert.equal(rows.split('>🌐</button>').length - 1, 3);
  assert.equal(rows.split('>…</button>').length - 1, 3);
  assert.equal(rows.split('>＋</button>').length - 1, 3);
  for (const hidden of ['SUB の作業', 'リモート環境', 'ハブに戻る', 'MacBook Air', 'F:\\H3']) assert.ok(!rows.includes(hidden), hidden);
  const search = renderToStaticMarkup(React.createElement(plugin.RemoteWorkspaceRows, { groups: merged.groups, query: 'macbook', onOpen() {} }));
  assert.ok(search.includes('Mac の作業')); assert.ok(!search.includes('既存プロジェクト'));
  const retained = renderToStaticMarkup(React.createElement(plugin.RemoteWorkspaceRows, { groups: merged.groups, selected: null, opened: [{node:'win',workspace:'old',current:'a',sessions:[{id:'a',title:'開いたままの会話',running:true},{id:'b',title:'許可待ち',pendingInteraction:'approval'},{id:'c',title:'失敗',error:true},{id:'d',title:'完了',completed:true}]}], onOpen() {} }));
  assert.ok(retained.includes('開いたままの会話'));
  assert.ok(readFileSync(new URL('../src/workspaces-client.jsx', import.meta.url), 'utf8').includes("id: 'fork', label: 'セッションをフォーク'"));
  assert.ok(!retained.includes('aria-current="page"'),'a hidden remote session must not appear selected over the local session');
  for (const state of ['ongoing', 'warning', 'error', 'done']) assert.ok(retained.includes(`data-state="${state}"`), state);
  const localStatus = renderToStaticMarkup(React.createElement(plugin.WorkspaceGroups, { groups: [{ node: 'local', name: 'sub', workspaces: [{ id: 'local', title: 'SUB の作業', path: 'C:\\Projects', sessions: [{ id: 'x', running: true }] }] }], onOpen() {} }));
  assert.ok(localStatus.includes('data-state="ongoing"'));
});

test('optional Bridge UI does not install duplicate workspace or mobile navigation handlers', () => {
  let plugin; const entries = [], disposers = [];
  const window = { crypto: { randomUUID: () => 'test' }, __ModuleLoader__: { load({ factory }) { plugin = factory(require); } } };
  vm.runInNewContext(readFileSync(new URL('../vendor/dsh-bridge-gateway/client/client.js', import.meta.url), 'utf8'), {
    window, document: new Proxy({}, { get() { throw new Error('Bridge must not intercept the native shell'); } }), URL, setTimeout, clearTimeout,
  });
  plugin.apply({ effect(fn) { disposers.push(fn()); }, locale: { register: () => () => {}, bind: () => key => key },
    connection: { rpc: { call() { throw new Error('Collapsed optional UI must not make requests'); } } },
    slots: { inject(_slot, callback) { return callback(); }, register(options, component) { entries.push({ options, component }); return () => {}; } },
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].options.name, 'settings.plugins.tab');
  assert.equal(entries[0].options.id, 'dsh-bridge-advanced');
  assert.equal(window.__dshOpenRemoteWorkspaceModal, undefined);
  const panel = renderToStaticMarkup(React.createElement(entries[0].component));
  assert.ok(panel.includes('PC・Tailscale')); assert.ok(!panel.includes('直通ゲートウェイ'));
  disposers.forEach(dispose => dispose?.());
});

test('multi-folder workspace UI offers local and remote roots with clear PC labels',()=>{
 let plugin;vm.runInNewContext(readFileSync(new URL('../dist/client.js',import.meta.url),'utf8'),{crypto:globalThis.crypto,window:{__ModuleLoader__:{load({factory}){plugin=factory(id=>id==='@deepseek-ai/dsh-client-ui-primitives'?primitives:require(id));}}}});
 const html=renderToStaticMarkup(React.createElement(plugin.WorkspaceSetsEditor,{data:{host:{name:'Hub'},nodes:[{id:'worker',name:'Worker'}]}}));
 assert.match(html,/複数フォルダーのワークスペース/);assert.match(html,/フォルダー 1/);assert.match(html,/フォルダー 2/);assert.match(html,/Worker/);assert.match(html,/構成を保存/);
 const preview=renderToStaticMarkup(React.createElement(plugin.WorkspaceSetBrowser,{set:{id:'group',revision:1,roots:[{id:'source',node:'worker',label:'Source',pc:'Worker',path:'D:\\Project'}]}}));
 assert.match(preview,/🌐 Source/);assert.match(preview,/Worker/);assert.match(preview,/D:/);
 const controls=renderToStaticMarkup(React.createElement(plugin.SessionFolderControls,{set:{roots:[{id:'base',node:'local',label:'Original',pc:'Hub',path:'C:\\Original',removable:false},{id:'extra',node:'worker',label:'Remote',pc:'Worker',path:'D:\\Remote',removable:true}]},pcs:[{node:'local',name:'Hub'},{node:'worker',name:'Worker'}],busy:false,onChange:()=>{}}));
 assert.match(controls,/作業フォルダーを追加/);assert.match(controls,/このセッションから外す/);assert.match(controls,/実ファイルは削除しません/);assert.equal(controls.match(/このセッションから外す/g).length,1);
});

test('auto permission menu row gets a matching shield icon', () => {
  let plugin
  vm.runInNewContext(readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load({ factory }) { plugin = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? primitives : require(id)); } } },
  })
  const created = []
  const doc = {
    createElement(tag) {
      const node = { tagName: tag.toUpperCase(), className: '', setAttribute() {}, append(...kids) { this.child = kids[0] } }
      created.push(node)
      return node
    },
    createElementNS(_ns, tag) { return this.createElement(tag) },
  }
  const label = { tagName: 'SPAN', textContent: '自動', querySelector() { return null } }
  const item = {
    children: [label],
    querySelector(sel) { return sel.includes('darask-auto-permission-icon') ? this.icon : null },
    insertBefore(node) { this.icon = node },
  }
  plugin.decorateAutoPermissionIcons({
    ownerDocument: doc,
    querySelectorAll(sel) { return sel === '[role="menuitem"]' ? [item] : [] },
  })
  assert.equal(item.icon.className, 'darask-auto-permission-icon')
  assert.ok(created.some(node => node.tagName === 'SVG'))
});
