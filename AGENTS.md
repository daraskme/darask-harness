# darask-harness の作業ルール

このリポジトリを編集する AI・開発者向け。DSH 上流はフォークせず npm 依存として使う。上流が既に持つ機能 (Plan mode、Hooks、Sandbox、Jobs、Subagent、MCP、ACP、LSP、Browser/Computer use、永続化、Skills/Workflows、AGENTS.md ローダー) は再実装しない。

## 構成の原則

- ルートは単一の DSH bundle plugin。`cordis.patch.yml` がプロファイル全体を合成する唯一の場所で、別の DARASK プラグインを追加しない。
- ツールは `ctx.tools.register(defineTool(...))`、ファイル操作は `ctx.fs` + `sandbox.resolvePolicy` + `fs/write-intent` + `fs/observed`、プロンプト追加は `ctx.systemPrompt.section(...)`。上流の `@deepseek-ai/dsh-tool-fs` と同じ経路を通す。
- agent preset は `presets/<id>/`。`src/presets.mjs` が `$DSH_HOME/.agent-presets/<id>` へ同期する。マーカーファイルが無いディレクトリ (ユーザー作成) は上書きしない。上流の `standard` を更新したら `presets/darask/agent.cordis.yml` も追従させる。
- DARASK 本体はルートの `src/`、`scripts/`、`test/`、`skills/`、`vendor/` に置き、パッケージ名とプラグイン ID は `darask-harness` に統一する。
- ファイルの `read` の `offset` と `limit` は 1 以上の整数。先頭行は省略するか `1` を使い、`0` は `offset must be a positive integer` になる。
- `packages/dsh-hashline` は grok-build の仕様を JS で再実装したもの。Rust コードのコピーはしない。純粋ロジック (`hash` / `scheme` / `apply` / `format` / `search`) は DSH に依存せず単体テストできる状態を保つ。
- `packages/dsh-rules` はディレクトリ型ルールだけを扱う。`AGENTS.md` 系のファイル名ロードは上流 `@deepseek-ai/dsh-agent-instructions` に任せ、重複して読まない。ルール本文はモデルに対する入力なので `system-reminder` タグは無効化し、サイズ上限を外さない。
- `packages/dsh-status-line` は上流 projection (`tokenUsage` / `contextPressure` / `sessionStats` / `title`) を参照する。コンテキスト使用率の再計算を自前で持たない。`src/status.mjs` はブラウザーでも読まれるので Node 専用 API や zod を import しない (host 専用は `projection.mjs` / `command.mjs` / `index.mjs`)。外部コマンドは利用者設定ファイルだけから受け取り、モデル出力や HTTP リクエストでは指定できない。
- 依存は固定バージョン。`*` / `latest` / 範囲指定は使わない。

## 検証

- 変更後は `npm run check` (ワークスペース全体の build + test)。
- `dist/client.js`、`vendor/dsh-bridge-gateway/client/client.js`、`packages/dsh-status-line/dist/client.js` は build で作る。手で編集しない。
- Windows の PowerShell では `node --test test/*.test.mjs` のワイルドカードが展開されない。単体実行はファイルを明示するか `npm test --workspace <name>` を使う。
- 開発モードは `npm run dev`。チェックアウト直下 (Git toplevel) がハーネスの root として DSH プロファイルへ link される。

## セキュリティ

- Origin / Host / セッション / Cloudflare Access の検証を弱めない。トークン・Cookie・QR・鍵は Git、fixture、ログに残さない。
- 依存の鮮度チェックや権限テーブルを CI 通過のために緩めない。
