# 第三者ソフトウェアの表示

darask-harness は以下の成果物を利用・移植しています。各パッケージの LICENSE / NOTICE は配布物に同梱されます。`packages/darask` が取り込む依存 (Bridge Gateway、Grok provider、Codex Connect、Chrome DevTools MCP、jsQR、qrcode、フォントなど) は [packages/darask/THIRD_PARTY_NOTICES.md](./packages/darask/THIRD_PARTY_NOTICES.md) を参照してください。

| 用途 | 出典 | ライセンス | 取り込み方 |
|---|---|---|---|
| ランタイム・プラグイン基盤・agent preset | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 0.1.5-rc.2 | MIT / Copyright 2026 DeepSeek | npm 依存。`presets/darask/agent.cordis.yml` は `@deepseek-ai/dsh-agent-presets` の `standard` プリセットを元に DARASK 行を追加 |
| Hashline 行アンカー編集の設計 (FNV-1a 正規化ハッシュ、chunk / checkpoint スキーム、stale / shift / ambiguous 検出、範囲検証、`0:` / `EOF` アンカー、出力形式) | [xai-org/grok-build](https://github.com/xai-org/grok-build) `crates/codegen/xai-grok-tools/src/implementations/grok_build_hashline` | Apache-2.0 / Copyright xAI | Rust 実装の仕様を JavaScript で再実装 (`packages/dsh-hashline`)。コードの直接コピーはしていない |
| プロジェクト指示ファイル名の互換 (`AGENT.md`, `GROK.md`, `.local` 版) | xai-org/grok-build `agents_md_tracker.rs` | Apache-2.0 | ファイル名リストのみ参照し、上流 DSH ローダーの設定として反映 |
| ディレクトリ型ルール (`.grok/rules` / `.claude/rules` / `.cursor/rules`、`.mdc` frontmatter の `alwaysApply` / `globs` / `description`、読み取り時の glob 一致ルール注入) | xai-org/grok-build `project_rules.rs` / `cursor_rules_on_read.rs` | Apache-2.0 | 探索順序・frontmatter 語彙・注入タイミングを参照して JavaScript で再実装 (`packages/dsh-rules`)。コードの直接コピーはしていない |
| ステータスライン (`[ui.status_line]` の `type` / `command` / `items` / `padding` / `refresh_interval` 語彙、外部コマンドへの JSON stdin 契約 `schema_version` / `model` / `context_window` / `cost` / `turn` / `workspace`) | xai-org/grok-build `status_line.rs` / `status_line_command.rs` | Apache-2.0 | 設定語彙と JSON 契約の互換性のみ参照し、集計は上流 DSH の projection で実装 (`packages/dsh-status-line`) |
| DARASK 機能一式 | [daraskme/dsh-darask](https://github.com/daraskme/dsh-darask) | MIT / Copyright 2026 daraskme | `packages/darask` として同一リポジトリに移設 |
