import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionActivity, workspaceActivity, sanitizeRemoteSession, retainCompleted, retainError } from '../src/session-activity.mjs';

test('session activity prefers permission, then error, then running, then done', () => {
  assert.equal(sessionActivity({ pendingInteraction: 'approval', running: true, error: true }), 'warning');
  assert.equal(sessionActivity({ error: true, running: true }), 'error');
  assert.equal(sessionActivity({ running: true, completed: true }), 'ongoing');
  assert.equal(sessionActivity({ runningSubagentCount: 2 }), 'ongoing');
  assert.equal(sessionActivity({ completed: true }), 'done');
  assert.equal(sessionActivity({ title: 'idle' }), null);
  assert.equal(workspaceActivity([{ completed: true }, { running: true }, { pendingInteraction: 'question' }]), 'warning');
  assert.equal(workspaceActivity([{ completed: true }, { error: true }]), 'error');
  assert.equal(workspaceActivity([{ completed: true }, { title: 'idle' }]), 'done');
  assert.equal(retainCompleted({ running: true }, { running: false }), true);
  assert.equal(retainCompleted({ running: false, completed: true }, { running: false, completed: false }), true);
  assert.equal(retainCompleted({ running: false, completed: true }, { running: true }), false);
  assert.equal(retainError({ error: true }, { running: false, completed: false }), true);
  assert.equal(retainError({ error: true }, { running: true }), false);
  assert.equal(retainError({ error: true }, { completed: true }), false);
  const cleaned = sanitizeRemoteSession({ id: 's', title: '会話', running: true, pendingInteraction: 'approval', extra: 'drop', runningSubagentCount: 3 });
  assert.deepEqual(cleaned, { id: 's', title: '会話', running: true, completed: false, error: false, runningSubagentCount: 3, pendingInteraction: 'approval' });
  assert.equal(sanitizeRemoteSession({ id: 's', title: 'x', pendingInteraction: 'hack' }).pendingInteraction, undefined);
  assert.equal(sanitizeRemoteSession({ title: 'no-id' }), null);
});
