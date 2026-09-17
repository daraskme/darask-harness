import React, { useEffect, useState } from 'react';

const USER_ROWS = '[data-chat-flow-kind="user"]:not([hidden])';

function visibleScroller(root = document) {
  const candidates = [...root.querySelectorAll('[data-conversation-scroll]')];
  return candidates.find(node => node.getClientRects().length > 0 && node.clientHeight > 0) ?? null;
}

export function sessionNavigationState(root = document) {
  const scroller = visibleScroller(root);
  if (!scroller) return { scroller: null, users: [], previous: null, next: null };
  const users = [...scroller.querySelectorAll(USER_ROWS)].filter(row => row.getClientRects().length > 0);
  const port = scroller.getBoundingClientRect();
  const line = port.top + Math.min(48, port.height * .2);
  const previous = users.filter(row => row.getBoundingClientRect().top < line - 2).at(-1) ?? null;
  const next = users.find(row => row.getBoundingClientRect().top > line + 2) ?? null;
  return { scroller, users, previous, next };
}

export function navigateSession(direction, root = document) {
  const state = sessionNavigationState(root);
  if (!state.scroller) return false;
  if (direction === 'top' || direction === 'bottom') {
    state.scroller.scrollTo({ top: direction === 'top' ? 0 : state.scroller.scrollHeight, behavior: 'smooth' });
    return true;
  }
  const target = direction === 'previous-user' ? state.previous : state.next;
  if (!target) return false;
  target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  return true;
}

export function SessionNavigation() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setAvailable(Boolean(visibleScroller())));
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style'] });
    window.addEventListener('resize', refresh);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', refresh); };
  }, []);
  if (!available) return null;
  const move = direction => { navigateSession(direction); };
  return <nav className="darask-session-navigation" aria-label="会話内を移動">
    <button type="button" aria-label="会話の一番上へ" title="一番上" onClick={() => move('top')}>⇈</button>
    <button type="button" aria-label="前のユーザー発言へ" title="前のユーザー発言" onClick={() => move('previous-user')}>↑</button>
    <button type="button" aria-label="次のユーザー発言へ" title="次のユーザー発言" onClick={() => move('next-user')}>↓</button>
    <button type="button" aria-label="会話の一番下へ" title="一番下" onClick={() => move('bottom')}>⇊</button>
  </nav>;
}

export function registerSessionNavigation(ctx) {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'darask-session-navigation' }, SessionNavigation));
}
