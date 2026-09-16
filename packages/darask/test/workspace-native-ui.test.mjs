import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { patchClient } from '../src/client-compat.mjs';
const require = createRequire(import.meta.url);

test('the pinned main layout keeps the persistent workspace slot mounted for every panel', () => {
  const id='@deepseek-ai/dsh-client-ui-layout';
  const source=patchClient(id,readFileSync(require.resolve(id+'/client'),'utf8'));
  let MainPanel;
  vm.runInNewContext(source.replace('return module.exports;','return { MainPanel };'),{window:{__ModuleLoader__:{load({factory}){MainPanel=factory(id => id === '@deepseek-ai/dsh-client-store' ? {} : require(id)).MainPanel;}}},AbortController,AbortSignal});
  for(const activePanelId of [null,'darask-workspace','settings']) {
    const slots=[];
    const markup=renderToStaticMarkup(React.createElement(MainPanel,{usePanelInfo:select=>select({activePanelId}),renderSlot(name,_owner,options){slots.push([name,options?.entryKey]);return React.createElement('span',{key:name},name);}}));
    assert.deepEqual(slots,[['main',activePanelId??'conversation'],['main.persistent',undefined]]);
    assert.ok(markup.includes('darask-main-stack'));
  }
});

test('the pinned workspace browser renders the additive remote slot alongside local workspace actions', () => {
  const id = '@deepseek-ai/dsh-client-ui-workspace';
  const source = patchClient(id, readFileSync(require.resolve(id + '/client'), 'utf8'));
  let browser;
  const primitives = new Proxy({ Modal: () => null, HoverCard: ({ anchor }) => anchor, Menu: ({ anchor }) => anchor, StateDot: ({ state }) => React.createElement('span', { 'data-state': state }) }, { get: (target, name) => target[name] ?? (({ children }) => React.createElement(React.Fragment, null, children)) });
  vm.runInNewContext(source.replace('return module.exports;', 'return { WorkspaceBrowser };'), { window: { __ModuleLoader__: { load({ factory }) {
    browser = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? primitives : id === '@deepseek-ai/dsh-client-store' ? {} : require(id)).WorkspaceBrowser;
  } } }, AbortController });
  const store = value => select => select(value);
  const calls = [], noOp = () => {};
  const props = {
    wide: true, expandSidebar: noOp, usePanelInfo: store({ activePanelId: null }),
    useHostInfo: store({ home: 'C:\\Users\\test' }), useSessions: store({ phase: 'ready', ids: ['s1'], byId: { s1: { id: 's1', displayTitle: '作業中の会話', running: true, blank: false, updatedAt: 1 } }, jobsBySession: {}, current: undefined }),
    useSessionPendingInteraction: store(new Map()), useWorkspaces: store({ phase: 'ready', state: 'ready', archivedSessionIds: [], items: [{ workspaceId: 'local', title: '既存のローカル作業', path: 'C:\\Projects', sessionIds: ['s1'], createdAt: '2020-01-01T00:00:00.000Z' }] }),
    useStore: store({ groupBy: 'workspace', orderBy: 'updated', groupExpansion: {}, sessionOrderByAccount: {}, sessionUpdatedAtByAccount: {} }),
    useDirectoryFlow: store(true), actions: new Proxy({}, { get: () => noOp }), t: key => key,
    renderSlot(name, owner) { calls.push({ name, owner }); return name === 'sidebar.workspaces.remote' ? React.createElement('button', null, '🌐 WIN の作業') : null; },
  };
  const markup = renderToStaticMarkup(React.createElement(browser, props));
  assert.ok(markup.includes('既存のローカル作業')); assert.ok(markup.includes('data-state="ongoing"')); assert.ok(markup.includes('🌐 WIN の作業'));
  assert.ok(markup.includes('darask-unified-workspace-list')); assert.ok(markup.includes('darask-local-workspaces'));
  assert.equal(calls.filter(item => item.name === 'sidebar.workspaces.remote').length, 1);
  assert.equal(calls.find(item => item.name === 'sidebar.workspaces.remote').owner.query, '');
  assert.ok(source.includes('renameWorkspace')); assert.ok(source.includes('deleteWorkspace')); assert.ok(source.includes('insertWorkspaceBefore'));
});

test('hidden remote workspace frames stay mounted instead of unloading', () => {
  const css = readFileSync(new URL('../src/client.css', import.meta.url), 'utf8');
  assert.match(css, /\.darask-workspace-action \{ flex: none; width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center;/);
  assert.match(css, /\.darask-workspace-main\[hidden\] \{ display: flex; visibility: hidden;/);
  assert.doesNotMatch(css, /\.darask-workspace-pool\[hidden\], \.darask-workspace-main\[hidden\] \{ display: none/);
});
