// Host-only: `daraskStatus` session projection registration (zod schemas guard
// the persisted state and the wire view, like upstream `sessionStats`).

import { z } from 'zod';
import { PROJECTION_KEY, applyStatusEvent, initialStatusState, statusView } from './status.mjs';

const buckets = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
}).strict();

const model = z.object({ provider: z.string(), id: z.string() }).strict();
const turn = z.object({ number: z.number().int().nonnegative(), startedAt: z.number().nonnegative() }).strict();

export const statusStateSchema = z.object({
  startedAt: z.number().nonnegative().nullable(),
  lastEventAt: z.number().nonnegative().nullable(),
  model: model.nullable(),
  contextWindow: z.number().int().positive().nullable(),
  turn: turn.nullable(),
  turns: z.number().int().nonnegative(),
  usageByModel: z.record(z.string(), buckets),
  last: z.object({ turn: z.number().int().nonnegative(), step: z.number().int().nonnegative(), modelKey: z.string(), buckets }).strict().nullable(),
}).strict();

export const statusViewSchema = z.object({
  startedAt: z.number().nonnegative().nullable(),
  lastEventAt: z.number().nonnegative().nullable(),
  model: model.nullable(),
  contextWindow: z.number().int().positive().nullable(),
  turn: turn.nullable(),
  turns: z.number().int().nonnegative(),
  usageByModel: z.record(z.string(), buckets),
  totalCostUsd: z.number().nonnegative().nullable(),
}).strict();

/** `pricing` may be a table or a getter so a user-config reload can re-price without re-registering. */
export function statusProjectionDefinition(pricing = {}) {
  const table = typeof pricing === 'function' ? pricing : () => pricing;
  return {
    key: PROJECTION_KEY,
    stateVersion: 1,
    stateSchema: statusStateSchema,
    init: header => initialStatusState(header),
    apply: applyStatusEvent,
    wire: {
      viewSchema: statusViewSchema,
      view: state => statusView(state, table()),
    },
  };
}
