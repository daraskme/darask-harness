import { publicOrigin } from './http.mjs';

export function developmentRoutes(env = process.env, fetchImpl = globalThis.fetch, getHost = () => null) {
  let updating = false;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const forward = async input => {
    const response = await fetchImpl(env.DARASK_DEV_CONTROL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DARASK_DEV_CONTROL_TOKEN}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(15000), redirect: 'error' });
    return { status: response.status, body: await response.json() };
  };
  return [{ path: '/api/darask/development', methods: ['GET', 'POST'], requestBody: 'buffered', async fetch(request) {
    try {
      let input = { action: 'status' };
      if (request.method === 'POST') {
        if (!request.headers.get('origin')) return json({ error: '画面から操作してください。' }, 403);
        publicOrigin(request);
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'JSON 形式で送信してください。' }, 415);
        const body = await request.text(); if (body.length > 2048) return json({ error: '入力が長すぎます。' }, 413);
        input = JSON.parse(body);
      }
      const host = getHost();
      const distribution = host?.distribution;
      if ((input.expectedHost !== undefined || input.propagate === false) && input.expectedHost !== host?.hub?.info().id) return json({ error: '選択した PC と接続先が一致しません。' }, 400);
      if (input.action === 'distribute') {
        if (!distribution) return json({ error: 'この PC は配布に対応していません。DSH を更新してください。' }, 400);
        if (updating) return json({ error: '更新処理が終わるまでお待ちください。' }, 409);
        return json(await distribution.request());
      }
      if (!env.DARASK_DEV_CONTROL_URL || !env.DARASK_DEV_CONTROL_TOKEN) return json({ available: false, message: 'Git のソースから npm run dev で起動すると、編集・更新を利用できます。', distribute: await distribution?.status() });
      if (input.action === 'update' && distribution) {
        if (updating || distribution.busy) return json({ error: '配布・更新処理が終わるまでお待ちください。' }, 409);
        updating = true;
        try {
          await distribution.markPending(input.propagate !== false);
          const { status, body: result } = await forward(input);
          if (status < 300 && result?.accepted) {
            void distribution.resume().catch(() => {});
          } else await distribution.clearPending();
          return json(result, status);
        } catch (error) {
          await distribution.clearPending();
          throw error;
        } finally { updating = false; }
      }
      const { status, body: result } = await forward(input);
      if (input.action === 'status' && distribution) result.distribute = await distribution.status();
      return json(result, status);
    } catch (error) {
      if (/^[ぁ-んァ-ヶ一-龯]/.test(error?.message || '')) return json({ error: error.message }, 400);
      return json({ error: '開発機能に接続できません。DSH の起動ログを確認してください。' }, 400);
    }
  } }];
}
