import { publicOrigin } from './http.mjs';

export function mediaSettingsRoute({ settings, tools }) {
  const ns = 'llm-openai-codex';
  const status = () => ({
    codex: { enabled: settings.get(ns)?.enableImageGeneration === true, registered: Boolean(tools.get('codex_connect_image_generate')) },
    grok: { registered: Boolean(tools.get('darask_imagine_video')) },
  });
  const json = (value, code = 200) => new Response(JSON.stringify(value), { status: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  return { path: '/api/darask/media', methods: ['GET', 'POST'], requestBody: 'buffered', async fetch(request) {
    try {
      if (request.method === 'GET') return json(status());
      publicOrigin(request);
      if (!request.headers.get('origin')) return json({ error: 'DSH の画面から操作してください。' }, 403);
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'JSON 形式で送信してください。' }, 415);
      const text = await request.text();
      if (text.length > 1024) return json({ error: '入力が長すぎます。' }, 413);
      const input = JSON.parse(text);
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || typeof input.enableCodexImages !== 'boolean') return json({ error: '画像生成の設定を確認してください。' }, 400);
      if (settings.get(ns) === undefined) return json({ error: 'Codex Connect が読み込まれていません。' }, 503);
      await settings.update(ns, { enableImageGeneration: input.enableCodexImages });
      return json(status());
    } catch { return json({ error: '画像生成の設定を更新できません。DSH の接続と起動状態を確認してください。' }, 400); }
  } };
}
