import { classifyIntent, cognitiveGate, detectConstraints, effortFor, latestUserText } from './intent.mjs';
import { withoutLocalReasoningEffort } from '../local-settings.mjs';
import { formatSecurityWarning, scanToolArgs } from './security.mjs';
import { addonPrompt, bump, guessCleanupCategory, isSafeCleanupPath } from './tools.mjs';
import { newId } from './state.mjs';

export function createObservation() {
  return { intent: classifyIntent(''), constraints: [], text: '', at: 0 };
}

export function createAgentObservations() {
  const observations = new WeakMap();
  return agent => {
    if (!agent || typeof agent !== 'object') return undefined;
    if (!observations.has(agent)) observations.set(agent, createObservation());
    return observations.get(agent);
  };
}

export function observeMessages(observation, messages) {
  if (!observation) return observation;
  const text = latestUserText(messages);
  if (!text) return observation;
  observation.intent = classifyIntent(text);
  observation.constraints = detectConstraints(text);
  observation.text = text;
  observation.at = Date.now();
  return observation;
}

export function decorateRequest(store, observation, request, modelInfo) {
  if (!request || typeof request !== 'object') return request;
  const local = withoutLocalReasoningEffort(request);
  if (local.provider === 'darask-local' || local.provider === 'local') return local;
  // Effort IDs belong to the exact adapter/model, not to the intent classifier.
  // Without capability metadata we must not invent an automatic request value.
  if (!modelInfo) return request;
  if (modelInfo.provider !== request.provider || modelInfo.id !== request.model) throw new Error('DARASK：推論設定のモデル情報が一致しません。');
  const supported = value => modelInfo.reasoning?.efforts.some(effort => effort.id === value) ?? false;
  // Keep a valid manual/default selection so its durable UI projection agrees
  // with the header. In particular, never replace an explicit off/high/max.
  if (request.reasoningEffort !== undefined && supported(request.reasoningEffort)) return request;
  const { reasoningEffort, ...withoutEffort } = request;
  const preferred = observation && store.enabled('deepseek-harness') ? effortFor(observation.intent) : undefined;
  if (preferred !== undefined && supported(preferred)) return { ...withoutEffort, reasoningEffort: preferred };
  // An inherited unsupported value is omitted; Harness applies this model's
  // own default. Non-reasoning models receive no reasoning field at all.
  return reasoningEffort === undefined ? request : withoutEffort;
}

export function registerAddonHooks(ctx, api) {
  const { store, observationFor, state } = api;
  // Agent/request carries config, not identity. The native driver supplies the
  // initiating Agent through AsyncLocalStorage; agentless calls stay unobserved.
  api.currentObservation = () => observationFor(ctx.agents?.currentInitiator?.());
  ctx.inject(['systemPrompt'], promptCtx => {
    promptCtx.systemPrompt.section({
      name: 'darask:addons',
      order: 980,
      text: context => {
        const observation = observationFor(context?.agent);
        const parts = [addonPrompt(store, observation)];
        if (store.enabled('deepseek-harness')) {
          parts.push(cognitiveGate(observation));
          parts.push(`Current local time: ${new Date().toISOString()}`);
        }
        return parts.join('\n\n');
      },
    });
  });
  ctx.on('agent/pre-step', async (event, next) => {
    observeMessages(api.currentObservation(), event?.messages);
    if (store.enabled('deepseek-harness') && Array.isArray(event?.messages)) {
      const starts = event.messages.filter(item => (item?.role ?? item?.type) === 'subagent' || /subagent/i.test(item?.name ?? ''));
      if (starts.length) {
        await state.update(current => {
          current.subagents.push({ at: new Date().toISOString(), count: starts.length });
          current.subagents = current.subagents.slice(-50);
          return current;
        });
      }
    }
    return next();
  });
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (store.enabled('security-guidance') && store.get().securityBlock) {
      const findings = scanToolArgs(exec.name, exec.arguments);
      if (findings.length) return { kind: 'deny', reason: `security-guidance refused this write:\n${formatSecurityWarning(findings)}` };
    }
    return next();
  });
  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next();
    if (decision?.kind === 'block') return decision;
    let content = decision.content ?? result?.content;
    if (store.enabled('security-guidance') && !store.get().securityBlock) {
      const findings = scanToolArgs(exec.name, exec.arguments);
      if (findings.length) {
        await bump(api, 'warnings');
        const warning = formatSecurityWarning(findings);
        content = appendText(content, warning);
      }
    }
    return content === (decision.content ?? result?.content) ? decision : { ...decision, kind: 'accept', content };
  });
  ctx.on('tools/result', (exec, result) => {
    void (async () => {
      await bump(api, 'tools');
      if (store.enabled('disk-cleanup')) await trackFromTool(api, exec, result);
      if (store.enabled('langfuse')) {
        await state.update(current => {
          current.traces.push({
            type: 'trace-create',
            body: { id: exec.callId || newId('trace'), name: exec.name, timestamp: new Date().toISOString(), metadata: { error: Boolean(result?.isError) } },
          });
          current.traces = current.traces.slice(-100);
          return current;
        });
      }
    })();
  });
}

function appendText(content, text) {
  const block = { type: 'text', text };
  return Array.isArray(content) ? [...content, block] : [{ type: 'text', text: `${typeof content === 'string' ? content : ''}\n${text}` }];
}

async function trackFromTool(api, exec, result) {
  const args = exec.arguments ?? {};
  const path = typeof args.path === 'string' ? args.path : '';
  const candidates = new Set();
  if (path) candidates.add(path);
  const command = typeof args.command === 'string' ? args.command : typeof args.text === 'string' ? args.text : '';
  for (const match of command.matchAll(/(?:^|\s)([A-Za-z]:\\[^\s'"]+|\/tmp\/[^\s'"]+|~\/[^\s'"]+)/g)) candidates.add(match[1]);
  for (const candidate of candidates) {
    const category = guessCleanupCategory(candidate);
    if (!category || !isSafeCleanupPath(candidate, api.directory)) continue;
    await api.state.update(state => {
      if (!state.cleanup.tracked.some(item => item.path === candidate)) state.cleanup.tracked.push({ path: candidate, category, at: new Date().toISOString() });
      return state;
    });
  }
  void result;
}

export async function maybeSessionCleanup(api) {
  if (!api.store.enabled('disk-cleanup')) return;
  const tracked = api.state.get().cleanup.tracked.filter(item => item.category === 'test' && isSafeCleanupPath(item.path, api.directory));
  if (!tracked.length) return;
  const { unlink } = await import('node:fs/promises');
  for (const item of tracked) {
    try { await unlink(item.path); } catch { /* missing */ }
  }
  await api.state.update(state => {
    const removed = new Set(tracked.map(item => item.path));
    state.cleanup.tracked = state.cleanup.tracked.filter(item => !removed.has(item.path));
    return state;
  });
}
