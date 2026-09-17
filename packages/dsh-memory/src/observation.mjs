// Model-produced observation drafts: strict parsing (unknown fields rejected),
// byte/count limits and control-character scrubbing, then the immutable
// markdown rendering stored in `observations/_inbox/`.

import { createHash } from 'node:crypto';

import { scrubBlock, scrubInline, truncateUtf8, utf8Length } from './text.mjs';

export const PROMPT_VERSION = 'darask-memory-capture-1';
export const OBSERVATION_TYPES = ['user', 'feedback', 'project', 'reference'];
export const MAX_TOPIC_BYTES = 128;
export const MAX_STATEMENT_BYTES = 1024;
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_KEYWORDS = 16;
export const MAX_ALIASES = 16;
export const MAX_TERM_BYTES = 64;
export const MAX_OBSERVATIONS = 128;
export const OBSERVATION_SCHEMA_VERSION = 2;

const OUTCOME_KEYS = new Set(['outcome', 'observations']);
const OBSERVATION_KEYS = new Set(['type', 'topic_hint', 'statement', 'keywords', 'aliases', 'body']);

export class ObservationParseError extends Error {
  constructor(message) {
    super(`malformed extraction output: ${message}`);
    this.name = 'ObservationParseError';
    this.code = 'MEMORY_MALFORMED';
  }
}

/** Locate the first JSON object in free text (models sometimes wrap output in fences). */
export function extractJsonObject(text) {
  const raw = String(text).trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/iu);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new ObservationParseError('no JSON object found');
  return candidate.slice(start, end + 1);
}

function rejectUnknownKeys(value, allowed, where) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ObservationParseError(`unknown field "${key}" in ${where}`);
}

function normalizeTerm(term, maxBytes) {
  if (typeof term !== 'string') return undefined;
  const clean = truncateUtf8(scrubInline(term), maxBytes).trimEnd();
  return clean === '' ? undefined : clean;
}

function normalizeTerms(terms, maxCount, where) {
  if (terms === undefined || terms === null) return [];
  if (!Array.isArray(terms)) throw new ObservationParseError(`${where} must be an array`);
  const out = [];
  const seen = new Set();
  for (const term of terms) {
    const clean = normalizeTerm(term, MAX_TERM_BYTES);
    if (clean === undefined || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
    if (out.length >= maxCount) break;
  }
  return out;
}

function normalizeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== 'string') throw new ObservationParseError('body must be a string or null');
  const clean = truncateUtf8(scrubBlock(body).trim(), MAX_BODY_BYTES).trimEnd();
  return clean === '' ? undefined : clean;
}

/**
 * Parse the capture model's JSON into `{ outcome: 'noop' }` or
 * `{ outcome: 'observations', observations: ObservationDraft[] }`.
 */
export function parseModelOutcome(text, { model, createdAt, promptVersion = PROMPT_VERSION }) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch (error) {
    if (error instanceof ObservationParseError) throw error;
    throw new ObservationParseError(error instanceof Error ? error.message : String(error));
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ObservationParseError('top level must be an object');
  rejectUnknownKeys(parsed, OUTCOME_KEYS, 'outcome');
  const { outcome, observations } = parsed;
  if (outcome === 'noop') {
    if (observations !== undefined && observations !== null && !(Array.isArray(observations) && observations.length === 0)) {
      throw new ObservationParseError('noop cannot contain observations');
    }
    return { outcome: 'noop', observations: [] };
  }
  if (outcome !== 'observations') throw new ObservationParseError(`unknown outcome "${String(outcome)}"`);
  if (!Array.isArray(observations)) throw new ObservationParseError('observations outcome requires observations');
  if (observations.length === 0) throw new ObservationParseError('observations cannot be empty');
  const drafts = observations.slice(0, MAX_OBSERVATIONS).map((entry, index) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) throw new ObservationParseError(`observation ${index} must be an object`);
    rejectUnknownKeys(entry, OBSERVATION_KEYS, `observation ${index}`);
    if (!OBSERVATION_TYPES.includes(entry.type)) throw new ObservationParseError(`observation ${index} has unknown type "${String(entry.type)}"`);
    if (typeof entry.statement !== 'string') throw new ObservationParseError(`observation ${index} statement must be a string`);
    const statement = scrubInline(entry.statement);
    if (statement === '') throw new ObservationParseError(`observation ${index} statement is empty`);
    if (utf8Length(statement) > MAX_STATEMENT_BYTES) throw new ObservationParseError(`observation ${index} statement exceeds ${MAX_STATEMENT_BYTES} bytes`);
    if (entry.topic_hint !== undefined && entry.topic_hint !== null && typeof entry.topic_hint !== 'string') throw new ObservationParseError(`observation ${index} topic_hint must be a string or null`);
    return {
      type: entry.type,
      topicHint: entry.topic_hint ? normalizeTerm(entry.topic_hint, MAX_TOPIC_BYTES) : undefined,
      statement,
      keywords: normalizeTerms(entry.keywords, MAX_KEYWORDS, `observation ${index} keywords`),
      aliases: normalizeTerms(entry.aliases, MAX_ALIASES, `observation ${index} aliases`),
      body: normalizeBody(entry.body),
      extractionModel: String(model ?? 'unknown').slice(0, 128),
      promptVersion,
      createdAt,
    };
  });
  return { outcome: 'observations', observations: drafts };
}

/** Deterministic inbox filename: creation second, session prefix, content hash. */
export function observationFileName(draft, job, ordinal) {
  const hash = createHash('sha256').update(`${job.sessionId}\n${job.fromTurn}\n${job.throughTurn}\n${ordinal}\n${draft.statement}`).digest('hex').slice(0, 12);
  const seconds = Math.max(0, Math.floor(draft.createdAt / 1000));
  return `${String(seconds).padStart(10, '0')}-${String(ordinal + 1).padStart(2, '0')}-${hash}.md`;
}

/** Immutable observation markdown with YAML-ish frontmatter (JSON-encoded string values). */
export function renderObservation(draft, job, ordinal, count) {
  const json = value => JSON.stringify(value);
  const lines = [
    '---',
    `schema_version: ${OBSERVATION_SCHEMA_VERSION}`,
    `type: ${draft.type}`,
    `topic_hint: ${draft.topicHint === undefined ? 'null' : json(draft.topicHint)}`,
    `keywords: ${json(draft.keywords)}`,
    `aliases: ${json(draft.aliases)}`,
    `session_id: ${json(job.sessionId)}`,
    `from_turn: ${job.fromTurn}`,
    `through_turn: ${job.throughTurn}`,
    `extraction_model: ${json(draft.extractionModel)}`,
    `prompt_version: ${json(draft.promptVersion)}`,
    `created_at: ${Math.floor(draft.createdAt / 1000)}`,
    `observation_ordinal: ${ordinal}`,
    `observation_count: ${count}`,
    '---',
    '',
    `# ${draft.statement}`,
  ];
  let text = `${lines.join('\n')}\n`;
  if (draft.body !== undefined) text += `\n${draft.body}\n`;
  return text;
}

/** Parse an observation file back into its frontmatter fields (used by manifest/search rebuilds). */
export function parseObservationFile(text) {
  const match = String(text).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/u);
  if (!match) return undefined;
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const raw = line.slice(colon + 1).trim();
    let value = raw;
    if (raw === 'null') value = null;
    else if (/^-?\d+$/u.test(raw)) value = Number(raw);
    else if (raw.startsWith('"') || raw.startsWith('[')) {
      try { value = JSON.parse(raw); } catch { value = raw; }
    }
    meta[key] = value;
  }
  const body = match[2];
  const heading = body.match(/^\s*# (.+)$/mu);
  return { meta, statement: heading ? heading[1].trim() : '', body: body.trim() };
}
