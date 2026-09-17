/** I-10 7+1 intent routing + I-01 constraint detection, forked from oh-my-deepseek-harness. */
const RULES = [
  { id: 'architecture', effort: 'high', hint: 'Architecture: compare trade-offs, name constraints, then propose a structure. Do not start large refactors until the shape is agreed.', keywords: ['architecture', 'アーキテクチャ', '設計', '構成', 'system design', 'スケール'] },
  { id: 'research', effort: 'high', hint: 'Research: gather sources, separate facts from guesses, and report uncertainty.', keywords: ['research', 'search', 'lookup', 'find', '検索', '調査', '調べ', '探し', 'why', '比較', '論文', '根拠'] },
  { id: 'collaboration', effort: 'high', hint: 'Collaboration: keep a shared plan, report blockers, and do not silently change another agent\'s task.', keywords: ['review', 'レビュー', 'pair', '一緒', 'subagent', '委任', 'かんばん'] },
  { id: 'refactor', effort: 'medium', hint: 'Refactor: preserve behavior, take small steps, and verify after each change.', keywords: ['refactor', 'リファクタ', '整理', 'rename', 'cleanup', '書き直し'] },
  { id: 'new', effort: 'medium', hint: 'New work: invent only what was asked. List files you will create before writing them.', keywords: ['create', '新規', '作って', 'scaffold', '追加して', '実装して'] },
  { id: 'medium', effort: 'medium', hint: 'Bugfix: reproduce, change the smallest correct surface, and check the original symptom.', keywords: ['fix', 'bug', '修正', '直して', 'エラー', '落ちる'] },
  { id: 'simple', effort: 'low', hint: 'Simple request: answer directly. Do not expand scope.', keywords: ['hello', 'hi', 'とは', '何？', '一言', 'thanks', 'ありがとう'] },
  { id: 'spec_driven', effort: 'high', hint: 'Spec-driven: write the contract first, then implement against it.', keywords: ['spec', '仕様', 'rfc', '契約'] },
];

const CONSTRAINT = /(?:してはいけ(?:ない|ません)|しないで(?:ください)?|するな|禁止|\b(?:must not|do not|don't|cannot|never)\b)/i;

export function classifyIntent(text) {
  const haystack = String(text ?? '').toLowerCase();
  if (!haystack.trim()) return RULES.find(rule => rule.id === 'simple');
  for (const rule of RULES) {
    if (rule.keywords.some(keyword => haystack.includes(keyword.toLowerCase()))) return rule;
  }
  const length = haystack.trim().length;
  if (length < 48) return RULES.find(rule => rule.id === 'simple');
  if (length > 400) return RULES.find(rule => rule.id === 'architecture');
  return RULES.find(rule => rule.id === 'medium');
}

export function detectConstraints(text) {
  const found = [];
  const source = String(text ?? '');
  for (const part of source.split(/[\r\n。．]/)) {
    const clause = part.trim();
    // Keep the subject and negation together; truncation can invert Japanese clauses.
    if (clause.length <= 120 && CONSTRAINT.test(clause) && !found.includes(clause)) found.push(clause);
  }
  return found.slice(0, 8);
}

export function effortFor(intent) {
  return intent?.effort ?? 'medium';
}

export function decorateEffort(intent) {
  return effortFor(intent);
}

export function cognitiveGate(observation) {
  const intent = observation?.intent ?? classifyIntent('');
  const constraints = observation?.constraints ?? [];
  const exclusion = constraints.length ? constraints.map(item => `- ${item}`).join('\n') : '- Do not expand the request into unrelated work.';
  return [
    'DeepSeek harness cognitive gate (oh-my-deepseek-harness fork):',
    'L1 honor: finish the asked task, keep user constraints, and say when something is unverified.',
    'L1 shame: inventing APIs, ignoring “do not”, or silently widening scope.',
    'L2: classify the request, plan briefly, then act. Heavy reasoning only when the intent needs it.',
    `L2 intent: ${intent.id} → reasoning_effort=${intent.effort}. ${intent.hint}`,
    'L3 exclusion list for this turn:',
    exclusion,
  ].join('\n');
}

export function latestUserText(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index];
    if (!isUserMessage(message)) continue;
    const text = messageText(message).trim();
    if (text) return text.slice(0, 8000);
  }
  return '';
}

function isUserMessage(message) {
  if (!message || typeof message !== 'object') return false;
  const role = message.role ?? message.type ?? message.kind ?? message.channel;
  const source = message.source?.kind;
  return (role === 'user' || role === 'human') && (source === undefined || source === 'user' || source === 'human');
}

function messageText(message) {
  if (typeof message.text === 'string') return message.text;
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) return message.content.map(part => typeof part === 'string' ? part : part?.text ?? '').join('\n');
  if (typeof message.data?.text === 'string') return message.data.text;
  if (typeof message.body === 'string') return message.body;
  return '';
}
