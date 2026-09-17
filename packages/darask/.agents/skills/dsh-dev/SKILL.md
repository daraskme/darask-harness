---
name: dsh-dev
description: dsh-darask のソース編集、DSH プラグインの起動・翻訳・再読み込みの修正に使う。他プロジェクトの開発には適用しない。
---

# dsh-dev

## Dashboard runtime testing

- Register a local folder with the workspace chooser. A `/goal` command can show
  output while the upstream session summary is still `blank`; it is not a reliable
  dashboard-row fixture. To test nonblank rows without model credentials, submit
  distinctive ordinary text in separate sessions and expect a missing-credential
  turn error. Report that limitation rather than claiming successful model turns.
- Open the `ダッシュボード` sidebar panel. Its preference key is
  `darask-dashboard:prefs`; reopening the panel after a browser reload may be
  necessary because upstream restores the conversation panel.
- Use authenticated page-context fetch for `/api/darask/sessions/dashboard`.
  The local payload uses `node: "local"` and `cwd` (not `workspace`); `read` also
  takes `sessionId`. For forbidden-field tests, include otherwise-valid fields
  so a missing `cwd` cannot accidentally satisfy a rejection assertion.
- JavaScript cannot set the browser's forbidden `Origin` header. If using CDP
  interception for this check, scope it to one marked request, leave cookies
  untouched, and disable interception afterward. An upstream plain-text
  `forbidden` response proves rejection but does not isolate the plugin guard.
- Confirm responsive breakpoints with `innerWidth`/`matchMedia`, not the outer
  window width: browser zoom and Windows display scaling can differ. Restore
  browser zoom and maximize before recording the primary flow.

### Devin Secrets Needed

- None for local dashboard list/navigation/preferences/user-text peek coverage.
- `DEEPSEEK_API_KEY` is needed for successful DeepSeek model turns; real running,
  assistant-output, tool, and usage-dependent states require suitable credentials.

編集前にリポジトリ直下の `AGENTS.md` を読み、そのルールに従う。DSH の runtime skill には同ファイルの内容も付与される。作業中にルールが変更された場合は読み直す。

## ソースと検索

- `src/*.mjs` はホスト側、`src/*.jsx` と `src/client.css` は UI、`src/locales/` は翻訳。`scripts/` はビルド・開発起動、`test/` は Node テスト、`vendor/dsh-bridge-gateway/` は同梱 Gateway。
- `node_modules/@deepseek-ai/` は本体 API を調べるために読む。ここを直接変更しない。
- DSH の `grep` は gitignore を尊重する。無視された `node_modules/`、`work/`、`.dsh/` を検索したり、存在しない `*.ts` を指定すると `No files were searched` になる。
- まず `src`、`scripts`、`test`、`vendor` を検索する。無視されたパスは `glob` で対象を絞り `read` で読む。`read` の `offset`/`limit` は 1 以上の整数。先頭行は省略するか `1`。`offset: 0` は `Error: offset must be a positive integer` になる。セッション横断の `darask_remote_sessions` の offset は 0 始まりで、0 が正しい。CLI では `rg` と具体的なファイルパスを使える。

## 反映と確認

既存の DSH は `http://127.0.0.1:3080`。開発モードは `npm run dev` でソースを監視している。既存プロセスが動作中なら重複起動しない。DSH コア用の `pnpm run dev:web` をこのプラグインに使わない。

ソース保存によるビルド、または「設定 → 開発・更新 → 編集を反映」で更新し、ページを再読み込みする。ビルド失敗時は直前の生成物を保持する。`npm run build` は実際の本体ロケールと日本語パックで登録・解除・再適用を検査する。

完了前に `npm run check` を実行し、修正した失敗条件と稼働環境への反映を確認する。ブラウザは Kitesurf を使い、localhost や Tailscale に届かない場合は API／CLI による検証範囲を明記する。別ブラウザや PC 画面操作で代用しない。

このスキルの正本は `skills/dsh-dev/SKILL.md`。`.agents/skills/dsh-dev/SKILL.md` と同じ内容を保つ。既存の差分を保護し、コミット・送信はユーザーの依頼した範囲で行う。
