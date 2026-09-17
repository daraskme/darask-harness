import { experimental_evaluate as evaluate } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

export const JEV_CREDENTIAL = 'AI_GATEWAY_API_KEY';
export const JEV_MODEL = 'typesafe-ai/jev';
export const JEV_PURPOSE_CRITERIA = Object.freeze({
  architecture: 'Design, architecture, major trade-offs, or structural planning.',
  research: 'Requires current facts from the public Web or X. Local files, installed software, and repository inspection are not public research.',
  collaboration: 'Review, coordination, delegation, or multi-agent collaboration.',
  refactor: 'Restructure existing code while preserving behavior.',
  new: 'Implement a new feature, component, or capability.',
  medium: 'Fix, debug, configure, or verify an existing system.',
  simple: 'A short factual answer or trivial request that needs no implementation.',
  spec_driven: 'Create or implement a specification, RFC, protocol, or formal contract.',
});

export function createJevPurposeRouter(classify) {
  if (typeof classify !== 'function') throw new TypeError('Jev purpose classifier is required');
  const cache = new WeakMap();
  return async ({ agent, state, fallback, signal }) => {
    if (!((typeof agent === 'object' && agent !== null) || typeof agent === 'function') || typeof state !== 'string' || !state) return fallback;
    let current = cache.get(agent);
    if (!current || current.state !== state) {
      current = { state, promise: classify(state, signal) };
      cache.set(agent, current);
    }
    return await current.promise ?? fallback;
  };
}

function jevDiagnostic(error) {
  const parts = [];
  if (Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode <= 599) parts.push(`HTTP ${error.statusCode}`);
  const type = typeof error?.type === 'string' && /^[a-z0-9_-]{1,64}$/i.test(error.type) ? error.type : null;
  const code = typeof error?.code === 'string' && /^[a-z0-9_.-]{1,64}$/i.test(error.code) ? error.code : null;
  if (type) parts.push(type);
  else if (code) parts.push(code);
  return parts.join(' / ');
}

function text(value, label, limit = 8000) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new Error(`Invalid ${label}`);
  return value.trim();
}

function normalizeCriteria(question) {
  const criteria = question.criteria;
  if (criteria === undefined) return undefined;
  if (!Array.isArray(criteria) || criteria.length > 20) throw new Error('Invalid Jev criteria');
  const rows = criteria.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['id', 'description'].includes(key))) throw new Error('Invalid Jev criterion');
    return { id: text(item.id, 'Jev criterion id', 64), description: text(item.description, 'Jev criterion description') };
  });
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Jev criterion IDs must be unique');
  return rows;
}

export function normalizeJevQuestions(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 16) throw new Error('Jev requires 1–16 questions');
  const questions = {};
  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['id', 'type', 'instructions', 'criteria'].includes(key))) throw new Error('Invalid Jev question');
    const id = text(item.id, 'Jev question id', 64);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id) || Object.hasOwn(questions, id)) throw new Error('Jev question IDs must be unique identifiers');
    if (!['boolean', 'choice', 'score'].includes(item.type)) throw new Error('Invalid Jev question type');
    const instructions = text(item.instructions, 'Jev instructions');
    const criteria = normalizeCriteria(item);
    if (item.type === 'boolean') {
      if (criteria?.some(row => !['true', 'false'].includes(row.id))) throw new Error('Boolean criteria IDs must be true or false');
      questions[id] = {
        type: 'boolean',
        instructions,
        ...(criteria ? { criteria: Object.fromEntries(criteria.map(row => [row.id, row.description])) } : {}),
      };
    } else if (item.type === 'choice') {
      if (!criteria || criteria.length < 2) throw new Error('Choice questions require at least two criteria');
      questions[id] = { type: 'choice', instructions, criteria: Object.fromEntries(criteria.map(row => [row.id, row.description])) };
    } else {
      if (!criteria || criteria.length < 2) throw new Error('Score questions require at least two ordered criteria');
      questions[id] = { type: 'score', instructions, criteria: criteria.map(row => row.description) };
    }
  }
  return questions;
}

export function createJev({ credentials, evaluateImpl = evaluate, createGatewayImpl = createGateway } = {}) {
  const resolveKey = async () => (await credentials?.resolve?.(JEV_CREDENTIAL))?.value;
  return {
    async status() {
      return { model: JEV_MODEL, configured: Boolean(await resolveKey()) };
    },
    async save({ aiGatewayApiKey } = {}) {
      if (aiGatewayApiKey) await credentials.set(JEV_CREDENTIAL, aiGatewayApiKey);
    },
    async remove() {
      await credentials.unset(JEV_CREDENTIAL);
    },
    async classifyPurpose(state, signal) {
      const apiKey = await resolveKey();
      if (!apiKey) throw new Error('Jev：AI Gateway API キーをアカウント設定で登録してください。');
      const normalizedState = text(state, 'Jev routing state');
      try {
        const result = await evaluateImpl({
          model: createGatewayImpl({ apiKey }).evaluationModel(JEV_MODEL),
          state: normalizedState,
          questions: { purpose: { type: 'choice', instructions: 'Classify the primary purpose of the latest user request. Choose research only when current public Web or X information is required.', criteria: JEV_PURPOSE_CRITERIA } },
          abortSignal: signal,
          providerOptions: { gateway: { zeroDataRetention: true } },
        });
        const answer = result.answers?.purpose;
        if (answer?.type !== 'choice' || !Object.hasOwn(JEV_PURPOSE_CRITERIA, answer.choice)) throw new Error('Invalid Jev routing answer');
        return answer.choice;
      } catch (error) {
        if (signal?.aborted) throw error;
        const failure = new Error('Jev：用途の自動判定に失敗しました。');
        failure.diagnostic = jevDiagnostic(error);
        throw failure;
      }
    },
    async run({ state, questions }, signal) {
      const apiKey = await resolveKey();
      if (!apiKey) throw new Error('Jev：AI Gateway API キーをアカウント設定で登録してください。');
      const normalizedState = text(state, 'Jev state', 100000);
      try {
        const result = await evaluateImpl({
          model: createGatewayImpl({ apiKey }).evaluationModel(JEV_MODEL),
          state: normalizedState,
          questions: normalizeJevQuestions(questions),
          abortSignal: signal,
          providerOptions: { gateway: { zeroDataRetention: true } },
        });
        return {
          model: JEV_MODEL,
          text: JSON.stringify(result.answers, null, 2),
          inputTokens: result.usage?.inputTokens,
        };
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new Error('Jev：評価に失敗しました。AI Gateway のキー、予算、質問形式を確認してください。');
      }
    },
  };
}
