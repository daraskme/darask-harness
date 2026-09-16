# darask-harness の作業ルール

このリポジトリを編集する AI・開発者向け。DSH 上流はフォークせず npm 依存として使う。上流が既に持つ機能 (Plan mode、Hooks、Sandbox、Jobs、Subagent、MCP、ACP、LSP、Browser/Computer use、永続化、Skills/Workflows、AGENTS.md ローダー) は再実装しない。

## 構成の原則

- ルートは DSH bundle plugin。`cordis.patch.yml` がプロファイル全体を合成する唯一の場所で、`packages/darask/cordis.patch.yml` の行はここへ折り込んである。両方を別々に add しない。
- ツールは `ctx.tools.register(defineTool(...))`、ファイル操作は `ctx.fs` + `sandbox.resolvePolicy` + `fs/write-intent` + `fs/observed`、プロンプト追加は `ctx.systemPrompt.section(...)`。上流の `@deepseek-ai/dsh-tool-fs` と同じ経路を通す。
- agent preset は `presets/<id>/`。`src/presets.mjs` が `$DSH_HOME/.agent-presets/<id>` へ同期する。マーカーファイルが無いディレクトリ (ユーザー作成) は上書きしない。上流の `standard` を更新したら `presets/darask/agent.cordis.yml` も追従させる。
- `packages/darask` はパッケージ名 `dsh-darask` を維持する (更新配布のアーカイブ名、インストーラー、プラグイン ID が依存)。その中のルールは [packages/darask/AGENTS.md](./packages/darask/AGENTS.md) に従う。
- `packages/dsh-hashline` は grok-build の仕様を JS で再実装したもの。Rust コードのコピーはしない。純粋ロジック (`hash` / `scheme` / `apply` / `format` / `search`) は DSH に依存せず単体テストできる状態を保つ。
- 依存は固定バージョン。`*` / `latest` / 範囲指定は使わない。

## 検証

- 変更後は `npm run check` (ワークスペース全体の build + test)。
- `packages/darask` の生成物 (`dist/client.js`、`vendor/dsh-bridge-gateway/client/client.js`) は build で作る。手で編集しない。
- 開発モードは `npm run dev`。チェックアウト直下 (Git toplevel) がハーネスの root として DSH プロファイルへ link される。

## セキュリティ

- Origin / Host / セッション / Cloudflare Access の検証を弱めない。トークン・Cookie・QR・鍵は Git、fixture、ログに残さない。
- 依存の鮮度チェックや権限テーブルを CI 通過のために緩めない。
