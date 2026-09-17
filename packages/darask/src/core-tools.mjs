import { defineTool } from '@deepseek-ai/dsh-tools';
import { delegate } from './delegation.mjs';
import { registerComputerTool } from './computer-tool.mjs';
export function registerCoreTools(toolsCtx, { browserRun, store, service, config, computer }) {
    toolsCtx.tools.register(defineTool({
      name: 'darask_browser_run', description: 'Cloudflare Browser Run Quick Actions for an explicitly requested public HTTPS page: render Markdown, HTML, links, accessibility tree, screenshot or PDF. Requires Browser Run credentials in DARASK settings. Browser time can be billable on the Cloudflare account. Use Kitesurf by default for interactive browsing.',
      parameters: { action: { type: 'string', enum: ['markdown', 'content', 'links', 'screenshot', 'pdf', 'accessibilityTree'], required: true }, url: { type: 'string', required: true } },
      output: { schema: { type: 'object', additionalProperties: false, properties: { action: { type: 'string', required: true }, text: { type: 'string', required: true }, file: { type: 'string' }, truncated: { type: 'boolean' }, browserMs: { type: 'number' } } }, render: (_args, value) => [{ type: 'text', text: value.text }] },
      async execute(args, exec) { return browserRun.run(args, exec.signal); },
    }));
    toolsCtx.tools.register(defineTool({
      name: 'darask_agent',
      description: 'Delegate a read-only analysis or planning task to a logged-in external Cursor, Claude Code or Grok CLI in this workspace. Uses DARASK priority for auto. Does not require official ACP packages. It never enables force/yolo or automatically resends started work.',
      parameters: { provider: { type: 'string', enum: ['auto', 'cursor', 'claude', 'grok'], description: 'Default auto follows saved priority.' }, prompt: { type: 'string', required: true, description: 'The analysis or planning request.' } },
      output: { schema: { type: 'object', additionalProperties: false, properties: { provider: { type: 'string', required: true }, mode: { type: 'string', required: true }, output: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `${value.provider} (${value.mode})\n${value.output}` }] },
      async execute(args, exec) { return delegate({ config: store.get(), snapshots: service.snapshots, ...args, cwd: exec.agent?.session.header.cwd, signal: exec.signal, timeoutMs: config.cliTimeoutMs }); },
    }));
    toolsCtx.tools.register(defineTool({
      name: 'darask_jev_evaluate',
      description: 'Evaluate shared state with typesafe-ai/jev through Vercel AI Gateway. Use for fast typed classification, routing, rubric scoring, or automated verification; it is not a conversation or browser-control model.',
      parameters: {
        state: { type: 'string', required: true, description: 'Text or serialized state to evaluate.' },
        questions: {
          type: 'array', required: true, description: 'One to sixteen typed questions.',
          items: {
            type: 'object', additionalProperties: false, properties: {
              id: { type: 'string', required: true },
              type: { type: 'string', enum: ['boolean', 'choice', 'score'], required: true },
              instructions: { type: 'string', required: true },
              criteria: {
                type: 'array',
                items: {
                  type: 'object', additionalProperties: false, properties: {
                    id: { type: 'string', required: true },
                    description: { type: 'string', required: true },
                  },
                },
              },
            },
          },
        },
      },
      output: { schema: { type: 'object', additionalProperties: false, properties: { model: { type: 'string', required: true }, text: { type: 'string', required: true }, inputTokens: { type: 'number' } } }, render: (_args, value) => [{ type: 'text', text: value.text }] },
      async execute(args, exec) { return service.evaluateJev(args, exec.signal); },
    }));
    registerComputerTool(toolsCtx, computer);
}
