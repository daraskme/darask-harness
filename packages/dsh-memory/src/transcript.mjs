// Condense upstream session events for a completed-turn range into a bounded,
// plain-text transcript for the extraction model. Reasoning blocks, images and
// file attachments are dropped; tool results are trimmed aggressively.

import { scrubBlock, trimMiddle, utf8Length } from './text.mjs';

export const DEFAULT_TRANSCRIPT_BUDGET = 48 * 1024;
const TOOL_RESULT_BYTES = 1200;
const TOOL_ARGS_BYTES = 600;
const MESSAGE_BYTES = 6 * 1024;

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    else if (block.type === 'tool-result') parts.push(textOf(block.content));
    else if (block.type === 'image') parts.push('[image]');
    else if (block.type === 'file') parts.push('[file attachment]');
  }
  return parts.join('\n');
}

function toolCallsOf(content) {
  if (!Array.isArray(content)) return [];
  return content.filter(block => block && block.type === 'tool-call').map(block => ({
    name: String(block.name ?? ''),
    args: trimMiddle(scrubBlock(typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments ?? {})), TOOL_ARGS_BYTES),
  }));
}

/** Turn number attached to an event, or undefined for events outside a turn. */
export function eventTurn(event) {
  const turn = event?.data?.turn;
  return typeof turn === 'number' ? turn : undefined;
}

/**
 * Build transcript items for events whose turn lies in [fromTurn, throughTurn].
 * `user/message` events carry no turn: one that arrives before `turn/start`
 * opens the next turn, one that arrives mid-turn (steering) belongs to it.
 */
export function condenseTranscript(events, { fromTurn, throughTurn, budget = DEFAULT_TRANSCRIPT_BUDGET } = {}) {
  const items = [];
  let currentTurn;
  let inTurn = false;
  for (const event of events) {
    const turn = eventTurn(event);
    switch (event.type) {
      case 'user/message': {
        const source = event.data?.source?.kind;
        if (source !== undefined && source !== 'human') break;
        const text = trimMiddle(scrubBlock(textOf(event.data?.content)), MESSAGE_BYTES).trim();
        const userTurn = inTurn ? currentTurn : (currentTurn ?? fromTurn - 1) + 1;
        if (text) items.push({ turn: userTurn, role: 'user', text });
        break;
      }
      case 'turn/start':
        if (turn !== undefined) { currentTurn = turn; inTurn = true; }
        break;
      case 'turn/end':
        inTurn = false;
        break;
      case 'assistant/message': {
        if (turn === undefined || turn < fromTurn || turn > throughTurn) break;
        const message = event.data?.message;
        const text = trimMiddle(scrubBlock(textOf(message?.content)), MESSAGE_BYTES).trim();
        if (text) items.push({ turn, role: 'assistant', text });
        for (const call of toolCallsOf(message?.content)) items.push({ turn, role: 'tool-call', name: call.name, text: call.args });
        break;
      }
      case 'tool/result': {
        if (turn === undefined || turn < fromTurn || turn > throughTurn) break;
        const message = event.data?.message;
        const text = trimMiddle(scrubBlock(textOf(message?.content)), TOOL_RESULT_BYTES).trim();
        const failed = event.data?.error !== undefined || (Array.isArray(message?.content) && message.content.some(block => block?.type === 'tool-result' && block.isError));
        items.push({ turn, role: failed ? 'tool-error' : 'tool-result', text });
        break;
      }
      default:
        break;
    }
  }
  const filtered = items.filter(item => item.turn >= fromTurn && item.turn <= throughTurn);
  return fitBudget(filtered, budget);
}

/** Drop the oldest tool output first, then the oldest messages, until the rendering fits. */
function fitBudget(items, budget) {
  const nodes = items.map((item, index) => {
    const text = renderItem(item);
    const bytes = utf8Length(text);
    const heading = `## Turn ${item.turn}`;
    return {
      item, text, bytes, heading,
      headingBytes: utf8Length(heading) + 1,
      trailingBytes: bytes - utf8Length(text.trimEnd()),
      previous: index - 1,
      next: index + 1,
      removed: false,
    };
  });
  const headingBytes = (node, previous) => node.item.turn !== nodes[previous]?.item.turn ? node.headingBytes : 0;
  let total = nodes.reduce((sum, node) => sum + node.bytes + 2 + headingBytes(node, node.previous), 0);
  let last = nodes.length - 1;
  let count = nodes.length;
  const renderedBytes = () => last < 0 ? 0 : total - 2 - nodes[last].trailingBytes;
  for (const toolsFirst of [true, false]) {
    for (let index = 0; index < nodes.length && count > 1 && renderedBytes() > budget; index++) {
      const node = nodes[index];
      const isTool = node.item.role === 'tool-result' || node.item.role === 'tool-error' || node.item.role === 'tool-call';
      if (isTool !== toolsFirst) continue;
      total -= node.bytes + 2 + headingBytes(node, node.previous);
      const next = nodes[node.next];
      if (next) {
        total += headingBytes(next, node.previous) - headingBytes(next, index);
        next.previous = node.previous;
      } else {
        last = node.previous;
      }
      const previous = nodes[node.previous];
      if (previous) previous.next = node.next;
      node.removed = true;
      count--;
    }
  }
  const current = [], lines = [];
  let lastTurn;
  for (const node of nodes) {
    if (node.removed) continue;
    current.push(node.item);
    if (node.item.turn !== lastTurn) lines.push(node.heading);
    lastTurn = node.item.turn;
    lines.push(node.text, '');
  }
  let text = lines.join('\n').trimEnd();
  if (renderedBytes() > budget) text = trimMiddle(text, budget);
  return { items: current, text, truncated: current.length !== items.length };
}

function renderItem(item) {
  return item.role === 'tool-call' ? `[tool-call ${item.name}] ${item.text}` : `[${item.role}]\n${item.text}`;
}

export function renderTranscript(items) {
  const lines = [];
  let lastTurn;
  for (const item of items) {
    if (item.turn !== lastTurn) {
      lines.push(`## Turn ${item.turn}`);
      lastTurn = item.turn;
    }
    lines.push(renderItem(item));
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}
