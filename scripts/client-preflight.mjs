import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const nativeSource = id => readFileSync(require.resolve(`${id}/client`), 'utf8');
const localeSource = nativeSource('@deepseek-ai/dsh-client-locale');
const permissionSource = nativeSource('@deepseek-ai/dsh-client-ui-permission-presets');
const japaneseSource = nativeSource('@fang2hou/dsh-locale-ja');

function snapshotStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    update(fn) { value = { ...value }; fn(value); for (const listener of listeners) listener(); },
  };
}

/** Build-time lifecycle smoke check, not a browser or a security sandbox.
 * Locale registration/translation comes from the pinned DSH and Japanese pack.
 * Only UI seats, DOM styles and unused host transports are simulated. */
export function validateClientBundle(source) {
  for (const japaneseFirst of [true, false]) {
    const styles = new Set();
    const context = vm.createContext({
      window: {}, navigator: { languages: ['ja'], language: 'ja' },
      document: {
        querySelector: () => null,
        createElement() { const tag = { dataset: {}, remove: () => styles.delete(tag) }; return tag; },
        head: { append: tag => styles.add(tag), appendChild: tag => styles.add(tag) },
      },
      AbortController, AbortSignal, URL, Intl,
      fetch() { throw new Error('Client preflight must not make network requests'); },
      setTimeout() { throw new Error('Client preflight must not start background timers'); },
      clearTimeout() {},
    });
    function load(code, expected) {
      let plugin, count = 0;
      context.window.__ModuleLoader__ = { load({ id, factory }) {
        assert.equal(id, expected, 'Unexpected client module registration');
        count++;
        plugin = factory(id => {
          if (id === '@deepseek-ai/dsh-client-ui-primitives') return {};
          if (id === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: snapshotStore };
          return require(id);
        });
      } };
      vm.runInContext(code, context, { timeout: 5000, filename: expected });
      assert.equal(count, 1, 'Client must register exactly one loader factory');
      assert.equal(typeof plugin.apply, 'function', 'Client must export apply');
      return plugin;
    }
    const { LocaleRuntime } = load(localeSource, '@deepseek-ai/dsh-client-locale');
    const locale = new LocaleRuntime({ emit() {} });
    const seats = new Map();
    const tabTypes = new Map();
    function scope() {
      const disposers = [];
      return {
        locale,
        sidebarRightTabs: { register(definition) { assert.ok(!tabTypes.has(definition.id)); assert.equal(typeof definition.title, 'function'); tabTypes.set(definition.id, definition); return () => tabTypes.delete(definition.id); } },
        effect(fn) { const dispose = fn(); disposers.push(dispose); return dispose; },
        slots: {
          inject(_name, fn) { return fn(); },
          register(options) {
            const key = `${options.name}/${options.id}`;
            assert.ok(!seats.has(key), `Duplicate UI slot: ${key}`);
            seats.set(key, options);
            const dispose = () => seats.delete(key);
            disposers.push(dispose);
            return dispose;
          },
        },
        get(name) { assert.equal(name, 'commandUi'); return { decorate: () => () => {} }; },
        settingsScope: { describe: () => ({}) },
        sessions: {}, settingsSchema: {},
        dispose() { for (const dispose of disposers.reverse()) dispose?.(); disposers.length = 0; },
      };
    }
    const dictionaries = () => JSON.stringify([...locale.dicts]
      .filter(([, languages]) => languages.size)
      .map(([ns, languages]) => [ns, [...languages]]));
    const native = scope(), japanese = scope();
    let pluginScope;
    try {
      const ja = load(japaneseSource, '@fang2hou/dsh-locale-ja');
      const permission = load(permissionSource, '@deepseek-ai/dsh-client-ui-permission-presets');
      const plugin = load(source, 'darask-harness');
      if (japaneseFirst) ja.apply(japanese);
      permission.apply(native);
      if (!japaneseFirst) {
        pluginScope = scope();
        plugin.apply(pluginScope);
        ja.apply(japanese);
        pluginScope.dispose();
      }
      const before = dictionaries();
      const seatCount = seats.size, styleCount = styles.size, listenerCount = locale.listeners.size;
      for (let round = 0; round < 2; round++) {
        pluginScope = scope();
        plugin.apply(pluginScope);
        for (const language of ['en', 'ja']) {
          locale.setLocale(language);
          for (const ns of ['settings.permission', 'permission.access']) {
            assert.notEqual(locale.bind(ns)('preset.readOnly'), 'preset.readOnly');
          }
        }
        pluginScope.dispose();
        assert.equal(dictionaries(), before, 'Client changed or leaked locale dictionaries');
        assert.equal(tabTypes.size, 0, 'Client leaked right sidebar tab types');
        assert.equal(seats.size, seatCount, 'Client leaked UI slots after unload');
        assert.equal(styles.size, styleCount, 'Client leaked styles after unload');
        assert.equal(locale.listeners.size, listenerCount, 'Client leaked locale subscribers');
      }
    } finally {
      pluginScope?.dispose();
      native.dispose();
      japanese.dispose();
    }
  }
}
