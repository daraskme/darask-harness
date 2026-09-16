# darask-harness の作業ルール

このリポジトリを編集する AI・開発者向け。DSH 上流はフォークせず npm 依存として使う。上流が既に持つ機能 (Plan mode、Hooks、Sandbox、Jobs、Subagent、MCP、ACP、LSP、Browser/Computer use、永続化、Skills/Workflows、AGENTS.md ローダー) は再実装しない。

## 構成の原則

- ルートは DSH bundle plugin。`cordis.patch.yml` がプロファイル全体を合成する唯一の場所で、`packages/darask/cordis.patch.yml` の行はここへ折り込んである。両方を別々に add しない。
- ツールは `ctx.tools.register(defineTool(...))`、ファイル操作は `ctx.fs` + `sandbox.resolvePolicy` + `fs/write-intent` + `fs/observed`、プロンプト追加は `ctx.systemPrompt.section(...)`。上流の `@deepseek-ai/dsh-tool-fs` と同じ経路を通す。
- agent preset は `presets/<id>/`。`src/presets.mjs` が `$DSH_HOME/.agent-presets/<id>` へ同期する。マーカーファイルが無いディレクトリ (ユーザー作成) は上書きしない。上流の `standard` を更新したら `presets/darask/agent.cordis.yml` も追従させる。
- `packages/darask` はパッケージ名 `dsh-darask` を維持する (更新配布のアーカイブ名、インストーラー、プラグイン ID が依存)。その中のルールは [packages/darask/AGENTS.md](./packages/darask/AGENTS.md) に従う。
- `packages/dsh-hashline` は grok-build の仕様を JS で再実装したもの。Rust コードのコピーはしない。純粋ロジック (`hash` / `scheme` / `apply` / `format` / `search`) は DSH に依存せず単体テストできる状態を保つ。
- `packages/dsh-rules` はディレクトリ型ルールだけを扱う。`AGENTS.md` 系のファイル名ロードは上流 `@deepseek-ai/dsh-agent-instructions` に任せ、重複して読まない。ルール本文はモデルに対する入力なので `system-reminder` タグは無効化し、サイズ上限を外さない。
- `packages/dsh-status-line` は上流 projection (`tokenUsage` / `contextPressure` / `sessionStats` / `title`) を参照する。コンテキスト使用率の再計算を自前で持たない。`src/status.mjs` はブラウザーでも読まれるので Node 専用 API や zod を import しない (host 専用は `projection.mjs` / `command.mjs` / `index.mjs`)。外部コマンドは利用者設定ファイルだけから受け取り、モデル出力や HTTP リクエストでは指定できない。
- `packages/dsh-memory` は host 専用 (`node:sqlite` / `node:fs` / `node:crypto`)。上流のセッション永続化・compaction を置き換えない。モデル出力 (観測・Dream 計画) は必ず `observation.mjs` / `prompts.mjs` の厳密パーサーを通し、未知フィールドは拒否する。ファイル書き込みは `resolveContained` で scope ディレクトリ内に閉じ、`writeAtomic` (同一ディレクトリの一時ファイル → rename) 以外で書かない。注入するメモリー文脈には「過去の文脈であり実ソースで検証する」旨の警告を残す。
- 依存は固定バージョン。`*` / `latest` / 範囲指定は使わない。

## 検証

- 変更後は `npm run check` (ワークスペース全体の build + test)。
- `packages/darask` と `packages/dsh-status-line` の生成物 (`dist/client.js`、`vendor/dsh-bridge-gateway/client/client.js`) は build で作る。手で編集しない。
- Windows の PowerShell では `node --test test/*.test.mjs` のワイルドカードが展開されない。単体実行はファイルを明示するか `npm test --workspace <name>` を使う。
- 開発モードは `npm run dev`。チェックアウト直下 (Git toplevel) がハーネスの root として DSH プロファイルへ link される。

## セキュリティ

- Origin / Host / セッション / Cloudflare Access の検証を弱めない。トークン・Cookie・QR・鍵は Git、fixture、ログに残さない。
- 依存の鮮度チェックや権限テーブルを CI 通過のために緩めない。
