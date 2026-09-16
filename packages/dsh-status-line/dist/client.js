window.__ModuleLoader__.load({ id: "@darask/dsh-status-line", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  StatusLine: () => StatusLine,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);

// src/status.mjs
var SCHEMA_VERSION = 1;
var DEFAULT_ITEMS = ["model", "context", "cost", "turn-timer"];
var zeroBuckets = () => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
function addBuckets(base, next, previous) {
  const out = {};
  for (const key of Object.keys(base)) out[key] = base[key] - (previous?.[key] ?? 0) + next[key];
  return out;
}
function sumBuckets(usageByModel) {
  let total = zeroBuckets();
  for (const buckets of Object.values(usageByModel ?? {})) total = addBuckets(total, buckets, void 0);
  return total;
}
var percent = (used, size) => size > 0 ? Math.min(100, Math.max(0, Math.round(used * 100 / size))) : null;
function buildStatusContext({ sessionId, header, status, tokenUsage, contextPressure, sessionStats, title, modelSelection, version, now = Date.now(), trigger = "refresh_interval", running }) {
  const usage = sumBuckets(status?.usageByModel);
  const selected = modelSelection?.next;
  const model = status?.model ?? (selected && typeof selected.model === "string" ? { provider: selected.provider, id: selected.model } : null);
  const contextWindow = contextPressure?.contextWindow ?? status?.contextWindow ?? null;
  const contextTokens = contextPressure?.projectedTokens ?? contextPressure?.pressureTokens ?? null;
  const used = contextWindow !== null && contextTokens !== null ? percent(contextTokens, contextWindow) : null;
  const startedAt = status?.startedAt ?? header?.createdAt ?? null;
  const turnRunning = running ?? (status?.turn !== null && status?.turn !== void 0);
  const cwd = header?.cwd ?? "";
  return {
    schema_version: SCHEMA_VERSION,
    cwd,
    session_id: sessionId ?? header?.id ?? null,
    session_name: typeof title === "string" && title !== "" ? title : null,
    model: {
      id: model?.id ?? null,
      display_name: model?.id ?? null,
      provider: model?.provider ?? null
    },
    workspace: { current_dir: cwd },
    version,
    cost: {
      total_cost_usd: status?.totalCostUsd ?? null,
      total_duration_ms: startedAt === null ? 0 : Math.max(0, now - startedAt),
      total_api_duration_ms: sessionStats === void 0 ? null : Math.round(sessionStats.llmMs),
      total_tool_duration_ms: sessionStats === void 0 ? null : Math.round(sessionStats.toolMs)
    },
    context_window: {
      context_window_size: contextWindow,
      context_tokens: contextTokens,
      session_input_tokens: tokenUsage === void 0 ? usage.inputTokens : tokenUsage.uncachedInputTokens,
      session_output_tokens: tokenUsage === void 0 ? usage.outputTokens : tokenUsage.outputTokens,
      session_usage: {
        input_tokens: tokenUsage === void 0 ? usage.inputTokens : tokenUsage.uncachedInputTokens,
        output_tokens: tokenUsage === void 0 ? usage.outputTokens : tokenUsage.outputTokens,
        cache_creation_input_tokens: tokenUsage === void 0 ? usage.cacheWriteTokens : tokenUsage.cacheWriteTokens,
        cache_read_input_tokens: tokenUsage === void 0 ? usage.cacheReadTokens : tokenUsage.cacheReadTokens
      },
      used_percentage: used,
      remaining_percentage: used === null ? null : 100 - used
    },
    turn: {
      number: status?.turn?.number ?? status?.turns ?? 0,
      running: turnRunning,
      started_at_ms: status?.turn?.startedAt ?? null,
      completed_turns: status?.turns ?? 0,
      steps: sessionStats?.steps ?? null
    },
    trigger
  };
}
function formatTokens(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";
  if (value < 1e3) return String(Math.round(value));
  if (value < 1e6) return `${(value / 1e3).toFixed(value < 1e4 ? 1 : 0)}K`;
  return `${(value / 1e6).toFixed(value < 1e7 ? 2 : 1)}M`;
}
function formatDuration(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "\u2014";
  const total = Math.floor(ms / 1e3);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
function formatCost(usd) {
  if (typeof usd !== "number" || !Number.isFinite(usd)) return "\u2014";
  if (usd < 0.01 && usd > 0) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
function shortCwd(cwd) {
  if (typeof cwd !== "string" || cwd === "") return "";
  const parts = cwd.replace(/[\\/]+$/u, "").split(/[\\/]/u);
  return parts.at(-1) || cwd;
}
function renderStatusSegments(context, items = DEFAULT_ITEMS, { now = Date.now() } = {}) {
  const segments = [];
  for (const item of items) {
    switch (item) {
      case "cwd": {
        const text = shortCwd(context.cwd);
        if (text !== "") segments.push({ item, text });
        break;
      }
      case "model":
        if (context.model.id) segments.push({ item, text: context.model.display_name ?? context.model.id });
        break;
      case "context": {
        const { context_tokens: tokens, context_window_size: size, used_percentage: used } = context.context_window;
        if (tokens === null && size === null) break;
        segments.push({ item, text: used === null ? formatTokens(tokens) : `${used}% (${formatTokens(tokens)}/${formatTokens(size)})` });
        break;
      }
      case "tokens": {
        const usage = context.context_window.session_usage;
        segments.push({ item, text: `\u2191${formatTokens(usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens)} \u2193${formatTokens(usage.output_tokens)}` });
        break;
      }
      case "cost":
        if (context.cost.total_cost_usd !== null) segments.push({ item, text: formatCost(context.cost.total_cost_usd) });
        break;
      case "turn-timer":
        if (context.turn.running && context.turn.started_at_ms !== null) segments.push({ item, text: `\u23F1 ${formatDuration(now - context.turn.started_at_ms)}` });
        break;
      case "elapsed":
        segments.push({ item, text: formatDuration(context.cost.total_duration_ms) });
        break;
      case "turns":
        segments.push({ item, text: `T${context.turn.completed_turns}` });
        break;
      case "session-name":
        if (context.session_name) segments.push({ item, text: context.session_name });
        break;
      default:
        break;
    }
  }
  return segments;
}

// src/client.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "darask-status-line-client";
var inject = ["slots", "locale"];
var NS = "darask-status-line";
var CONFIG_PATH = "/api/darask/status-line/config";
var LINE_PATH = "/api/darask/status-line";
var STYLE_ID = "@darask/dsh-status-line/status.css";
var ja = {
  "label.cwd": "\u4F5C\u696D\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA",
  "label.model": "\u30E2\u30C7\u30EB",
  "label.context": "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u4F7F\u7528\u7387",
  "label.cost": "\u63A8\u5B9A\u30B3\u30B9\u30C8 (USD)",
  "label.turn-timer": "\u3053\u306E\u30BF\u30FC\u30F3\u306E\u7D4C\u904E\u6642\u9593",
  "label.elapsed": "\u30BB\u30C3\u30B7\u30E7\u30F3\u7D4C\u904E\u6642\u9593",
  "label.tokens": "\u5165\u51FA\u529B\u30C8\u30FC\u30AF\u30F3",
  "label.turns": "\u5B8C\u4E86\u30BF\u30FC\u30F3\u6570",
  "label.session-name": "\u30BB\u30C3\u30B7\u30E7\u30F3\u540D",
  "detail.input": "\u5165\u529B",
  "detail.output": "\u51FA\u529B",
  "detail.cacheRead": "\u30AD\u30E3\u30C3\u30B7\u30E5\u8AAD\u53D6",
  "detail.cacheWrite": "\u30AD\u30E3\u30C3\u30B7\u30E5\u66F8\u8FBC",
  "detail.api": "LLM \u6642\u9593",
  "detail.tool": "\u30C4\u30FC\u30EB\u6642\u9593",
  "detail.noPrice": "\u6599\u91D1\u8868\u672A\u8A2D\u5B9A (status-line.json \u306E pricing \u3067\u8A2D\u5B9A)",
  "state.running": "\u5B9F\u884C\u4E2D",
  "state.idle": "\u5F85\u6A5F\u4E2D",
  "error.command": "\u5916\u90E8\u30B3\u30DE\u30F3\u30C9\u304C\u5931\u6557\u3057\u305F\u305F\u3081\u5185\u8535\u8868\u793A\u306B\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF\u3057\u307E\u3057\u305F"
};
var en = {
  "label.cwd": "Working directory",
  "label.model": "Model",
  "label.context": "Context usage",
  "label.cost": "Estimated cost (USD)",
  "label.turn-timer": "Elapsed in this turn",
  "label.elapsed": "Session elapsed",
  "label.tokens": "Input / output tokens",
  "label.turns": "Completed turns",
  "label.session-name": "Session name",
  "detail.input": "Input",
  "detail.output": "Output",
  "detail.cacheRead": "Cache read",
  "detail.cacheWrite": "Cache write",
  "detail.api": "LLM time",
  "detail.tool": "Tool time",
  "detail.noPrice": "No pricing configured (set pricing in status-line.json)",
  "state.running": "Running",
  "state.idle": "Idle",
  "error.command": "External command failed; showing the built-in line"
};
var css = `
.darask-status-line{display:inline-flex;align-items:center;gap:6px;max-width:48vw;overflow:hidden;font:11px/1 var(--dsw-font-mono,ui-monospace,Menlo,Consolas,monospace);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.darask-status-line[data-running="true"] .darask-status-line__seg[data-item="turn-timer"]{color:var(--dsw-alias-label-primary)}
.darask-status-line__seg{display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis}
.darask-status-line__seg+.darask-status-line__seg::before{content:"\u2502";margin-right:6px;opacity:.45}
.darask-status-line__seg[data-item="context"][data-level="warn"]{color:var(--dsw-alias-warning,#c58a00)}
.darask-status-line__seg[data-item="context"][data-level="critical"]{color:var(--dsw-alias-danger,#d33)}
.darask-status-line__error{color:var(--dsw-alias-danger,#d33)}
`;
function ensureStyle() {
  if (typeof document === "undefined" || document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_ID)}]`) !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "@darask/dsh-status-line";
  tag.dataset.pluginCss = STYLE_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
}
async function fetchJson(path, signal) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}
function useNow(intervalMs, enabled) {
  const [now, setNow] = (0, import_react.useState)(() => Date.now());
  (0, import_react.useEffect)(() => {
    if (!enabled) return void 0;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), Math.max(250, intervalMs));
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
function contextLevel(used) {
  if (used === null) return "ok";
  if (used >= 90) return "critical";
  if (used >= 75) return "warn";
  return "ok";
}
function tooltipFor(item, context, t) {
  const usage = context.context_window.session_usage;
  switch (item) {
    case "context":
      return `${t("label.context")}: ${formatTokens(context.context_window.context_tokens)} / ${formatTokens(context.context_window.context_window_size)}`;
    case "cost":
      return `${t("label.cost")}: ${formatCost(context.cost.total_cost_usd)} \xB7 ${t("detail.input")} ${formatTokens(usage.input_tokens)} \xB7 ${t("detail.output")} ${formatTokens(usage.output_tokens)} \xB7 ${t("detail.cacheRead")} ${formatTokens(usage.cache_read_input_tokens)} \xB7 ${t("detail.cacheWrite")} ${formatTokens(usage.cache_creation_input_tokens)}`;
    case "tokens":
      return `${t("detail.input")} ${formatTokens(usage.input_tokens)} \xB7 ${t("detail.output")} ${formatTokens(usage.output_tokens)} \xB7 ${t("detail.cacheRead")} ${formatTokens(usage.cache_read_input_tokens)} \xB7 ${t("detail.cacheWrite")} ${formatTokens(usage.cache_creation_input_tokens)}`;
    case "elapsed":
    case "turn-timer":
      return `${t(`label.${item}`)} \xB7 ${t("detail.api")} ${formatDuration(context.cost.total_api_duration_ms)} \xB7 ${t("detail.tool")} ${formatDuration(context.cost.total_tool_duration_ms)}`;
    case "model":
      return `${t("label.model")}: ${context.model.provider ?? ""}/${context.model.id ?? ""} \xB7 ${context.turn.running ? t("state.running") : t("state.idle")}`;
    case "cwd":
      return `${t("label.cwd")}: ${context.cwd}`;
    default:
      return t(`label.${item}`);
  }
}
function StatusLine(props) {
  const { sessionId, useProjection, useSessions, useStatusConfig, t } = props;
  const config = useStatusConfig((state) => state);
  const status = useProjection("daraskStatus");
  const tokenUsage = useProjection("tokenUsage");
  const contextPressure = useProjection("contextPressure");
  const sessionStats = useProjection("sessionStats");
  const title = useProjection("title");
  const modelSelection = useProjection("modelSelection");
  const entry = useSessions((list) => list.byId[String(sessionId)]);
  const running = entry?.running ?? (status?.turn !== null && status?.turn !== void 0);
  const tickingItems = config.type === "builtin" && config.items.includes("turn-timer") && running;
  const now = useNow(config.refreshIntervalMs, tickingItems);
  (0, import_react.useEffect)(ensureStyle, []);
  const context = (0, import_react.useMemo)(() => buildStatusContext({
    sessionId: String(sessionId),
    header: { cwd: entry?.cwd ?? "", createdAt: status?.startedAt ?? void 0 },
    status: status ?? void 0,
    tokenUsage: tokenUsage ?? void 0,
    contextPressure: contextPressure ?? void 0,
    sessionStats: sessionStats ?? void 0,
    title: title ?? void 0,
    modelSelection: modelSelection ?? void 0,
    version: config.version ?? "",
    now,
    running
  }), [sessionId, entry?.cwd, status, tokenUsage, contextPressure, sessionStats, title, modelSelection, now, running, config.version]);
  const [remote, setRemote] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (config.type !== "command") {
      setRemote(null);
      return void 0;
    }
    const controller = new AbortController();
    let timer;
    const tick = async () => {
      try {
        const result = await fetchJson(`${LINE_PATH}?session=${encodeURIComponent(String(sessionId))}&trigger=${running ? "turn" : "refresh_interval"}`, controller.signal);
        if (!controller.signal.aborted) setRemote(result);
      } catch (error) {
        if (!controller.signal.aborted) setRemote({ text: "", error: error instanceof Error ? error.message : String(error) });
      }
      if (!controller.signal.aborted) timer = setTimeout(tick, Math.max(1e3, config.commandRefreshIntervalMs));
    };
    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [config.type, config.commandRefreshIntervalMs, sessionId, running, status?.turns, status?.lastEventAt]);
  if (config.type === "disabled") return null;
  const padding = config.padding > 0 ? { padding: `0 ${config.padding * 4}px` } : void 0;
  if (config.type === "command") {
    if (remote === null) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "darask-status-line", "data-running": String(running), style: padding, title: remote.error ? `${t("error.command")}: ${remote.error}` : void 0, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: remote.error && remote.text === "" ? "darask-status-line__seg darask-status-line__error" : "darask-status-line__seg", "data-item": "command", children: remote.text !== "" ? remote.text : remote.error ? t("error.command") : "" }) });
  }
  const segments = renderStatusSegments(context, config.items, { now });
  if (segments.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "darask-status-line", "data-running": String(running), style: padding, "aria-live": "off", children: segments.map((segment) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: "darask-status-line__seg",
      "data-item": segment.item,
      "data-level": segment.item === "context" ? contextLevel(context.context_window.used_percentage) : void 0,
      title: tooltipFor(segment.item, context, t),
      children: segment.text
    },
    segment.item
  )) });
}
var DEFAULT_CONFIG = { type: "builtin", items: ["model", "context", "cost", "turn-timer"], refreshIntervalMs: 1e3, commandRefreshIntervalMs: 5e3, padding: 0, version: "" };
function configStore() {
  let value = DEFAULT_CONFIG;
  const listeners = /* @__PURE__ */ new Set();
  return {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      value = { ...DEFAULT_CONFIG, ...next };
      for (const listener of listeners) listener();
    }
  };
}
function apply(ctx) {
  const store = configStore();
  ctx.effect(() => ctx.locale.register(NS, { ja, en }), "darask-status-line: dictionaries");
  const controller = new AbortController();
  const load = async () => {
    try {
      store.set(await fetchJson(CONFIG_PATH, controller.signal));
    } catch (error) {
      if (!controller.signal.aborted) console.warn("darask-status-line: config unavailable", error);
    }
  };
  void load();
  const refresh = setInterval(load, 6e4);
  ctx.effect(() => () => {
    controller.abort();
    clearInterval(refresh);
  }, "darask-status-line: config polling");
  ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
    name: "conversation.session.header.utilities",
    id: "darask-status-line",
    order: -20,
    locale: NS,
    inject: () => ({ hooks: { statusConfig: store } })
  }, StatusLine));
}
return module.exports; } });
