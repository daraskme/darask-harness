const PENDING = new Set(['approval', 'plan-review', 'question']);

/** Native StateDot order: user attention, failure, live work, then the green done reminder. */
export function sessionActivity(session) {
  if (!session || typeof session !== 'object') return null;
  if (PENDING.has(session.pendingInteraction)) return 'warning';
  if (session.error === true) return 'error';
  if (session.running === true || (Number.isInteger(session.runningSubagentCount) && session.runningSubagentCount > 0)) return 'ongoing';
  if (session.completed === true) return 'done';
  return null;
}

export function workspaceActivity(sessions) {
  const rank = { warning: 0, error: 1, ongoing: 2, done: 3 };
  let best = null;
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const state = sessionActivity(session);
    if (state && (best === null || rank[state] < rank[best])) best = state;
  }
  return best;
}

/** Keep the green done mark after a run until the session is working again. */
export function retainCompleted(previous, session) {
  if (!session || session.running === true || (Number.isInteger(session.runningSubagentCount) && session.runningSubagentCount > 0)) return false;
  if (session.completed === true || previous?.running === true || previous?.completed === true) return true;
  return false;
}

/** Keep a red error until the session runs again or completes. */
export function retainError(previous, session) {
  if (!session || session.running === true) return session.error === true;
  if (session.error === true) return true;
  return previous?.error === true && session.completed !== true;
}

export function sessionActivityLabel(state) {
  return { warning: '作業の許可待ち', error: 'エラー', ongoing: '作業中', done: '完了' }[state] ?? '';
}

export function sanitizeRemoteSession(item) {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.title !== 'string') return null;
  const pendingInteraction = PENDING.has(item.pendingInteraction) ? item.pendingInteraction : undefined;
  const runningSubagentCount = Number.isInteger(item.runningSubagentCount) ? Math.min(Math.max(item.runningSubagentCount, 0), 99) : 0;
  return {
    id: item.id,
    title: item.title,
    running: item.running === true,
    completed: item.completed === true,
    error: item.error === true,
    runningSubagentCount,
    ...pendingInteraction ? { pendingInteraction } : {},
  };
}
