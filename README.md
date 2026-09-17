# darask-harness

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) を軸に、[dsh-darask](https://github.com/daraskme/dsh-darask) の DARASK 固有機能と [grok-build](https://github.com/xai-org/grok-build) の優れたツールを **一つの DSH プロファイル** として合成するハーネスです。上流はフォークせず npm 依存として使い、追加・差し替えはすべて DSH の拡張点 (bundle patch / agent preset / `ctx.tools` / `ctx.fs` / `systemPrompt`) 経由で行います。

対象は **DSH 0.1.5-rc.2 / Node.js 24.19.0 以上**。

## 構成

```
darask-harness/            DSH bundle plugin (dsh.bundle.patch = cordis.patch.yml)
├─ cordis.patch.yml        プロファイル合成: 権限テーブル、既定 preset、各プラグインの insert
├─ presets/darask/         既定 agent preset (上流 standard + grok-build 互換の指示ファイル名)
├─ src/                    host 側の glue (preset を $DSH_HOME/.agent-presets へ配置)
└─ packages/
   ├─ darask/              dsh-darask (パッケージ名は互換のため dsh-darask のまま)
   ├─ dsh-code-graph/      @darask/dsh-code-graph — tree-sitter (WASM) による定義・参照索引 (code_definitions / code_references / code_outline / code_symbols)
   ├─ dsh-hashline/        @darask/dsh-hashline — grok-build の hashline read/edit/grep 移植
   ├─ dsh-hunk-tracker/    @darask/dsh-hunk-tracker — セッション変更の hunk 追跡 (ターン帰属 / 外部編集検出 / accept・reject)
   ├─ dsh-memory/          @darask/dsh-memory — クロスセッション記憶 (観測キャプチャ / Dream 統合 / memory_search・memory_get)
   ├─ dsh-rules/           @darask/dsh-rules — .grok/.claude/.cursor rules ディレクトリと glob 条件ルール
   └─ dsh-status-line/     @darask/dsh-status-line — モデル/コンテキスト/コスト/経過時間のステータスライン
```

### どこから何を採ったか

| 領域 | 採用元 | 実装 |
|---|---|---|
| ランタイム・プラグイン基盤・Plan mode・Hooks・Sandbox・Jobs・Subagent・MCP・ACP・LSP・Browser/Computer use・セッション永続化・Skills/Workflows・AGENTS.md ローダー | DSH (上流) | そのまま使用。再実装しない |
| 日本語 UI、OpenAI/OpenRouter/Grok/Cursor/Codex/Claude/ローカルモデルの Usage・認証、リモート PC / ワークスペース、Cloudflare Access 対応 Bridge Gateway、GPU / LoRA、ハブ→リモート更新配布 | dsh-darask | `packages/darask` |
| Hashline 行アンカー編集 (`hashline_read` / `hashline_edit` / `hashline_grep`): FNV-1a 正規化ハッシュ、stale/shift/ambiguous 検出、範囲・重複検証、bottom-up 一括適用 | grok-build `GrokBuildHashline` | `packages/dsh-hashline` (JS 再実装、`ctx.fs` + sandbox policy 経由) |
| プロジェクト指示ファイル名 (`AGENTS.md` / `AGENT.md` / `GROK.md` / `CLAUDE.md` と `.local` 版) | grok-build | `presets/darask` で上流 `@deepseek-ai/dsh-agent-instructions` を設定 (独自ローダーは持たない) |
| ディレクトリ型ルール (`.grok/rules` / `.claude/rules` / `.cursor/rules` の `.md` / `.mdc`、`alwaysApply` / `globs` / `paths` frontmatter): 常時ルールはステップ前に、glob 条件ルールは該当ファイルの読み取り成功後に一度だけ注入 | grok-build `project_rules` / cursor-rules-on-read | `packages/dsh-rules` (`agent/pre-step` と `tools/result` を購読) |
| ステータスライン (モデル、コンテキスト使用率、トークン、コスト、ターン経過時間、セッション名): 表示項目の設定と外部コマンド契約 (JSON on stdin) | grok-build `ui.status_line` | `packages/dsh-status-line`。上流の `tokenUsage` / `contextPressure` / `sessionStats` projection を参照し、独自 projection はモデル・ターン・料金だけ |
| クロスセッション記憶 (Memory v2): 完了ターンからツール無しの補助モデル呼び出しで観測を抽出し、global / workspace スコープの不変ファイル + SQLite FTS5 索引 + `MEMORY.md` 目次として保存。Dream (統合) ジョブで観測をトピックへ集約・アーカイブ | grok-build Memory v2 (`memory/`) | `packages/dsh-memory` (`session/event` を購読、`memory_search` / `memory_get` ツール、`/memory` コマンド)。セッション永続化・compaction は上流のまま |
| 変更追跡 (Hunk tracker): エージェント編集をターン帰属付きの hunk として保持し、外部編集 (`external` / `externalEditOnAgentFile`) と区別。作成・削除・バイナリ・巨大ファイルを個別に扱い、accept でベースラインへ畳み込み、reject でディスクを復元 | grok-build `xai-hunk-tracker` | `packages/dsh-hunk-tracker` (上流ファイルツールの `fs/write-intent` / `fs/edit-intent` / `tools/result` を観測。ファイルツール自体は置き換えない)。`hunks_status` / `hunks_diff` ツール、`/hunks` コマンド |
| コードグラフ (Codebase graph): tree-sitter の tags クエリで JS / TS / TSX / Python / Go / Rust の定義・参照をワークスペース単位に索引し、go-to-definition / find-references / アウトライン / 名前検索を言語サーバー無しで提供。バイナリ・巨大ファイル除外、git ls-files による候補列挙、増分再索引 | grok-build `xai-codebase-graph` | `packages/dsh-code-graph` (WASM 文法は npm の tree-sitter 各言語パッケージから `npm run build` で取得。`ctx.fs` 経由で読み、`fs/write-intent` / `tools/result` でエージェント編集を追従)。`code_*` ツール、`/code-graph` コマンド。上流 LSP・grep は置き換えない |
| Auto 権限プリセット | dsh-darask | `cordis.patch.yml` の `permission` 行 |

## 導入

```powershell
git clone https://github.com/daraskme/darask-harness.git
cd darask-harness
npm ci
npm run check
```

DSH の web プロファイルへ登録する (dsh-darask を別途 add しないこと。patch は本パッケージが一括で持つ):

```powershell
dsh plugin --profile web add link:"C:\path\to\darask-harness"
dsh --profile web
```

開発モード (ソース監視・HMR・Git 更新 UI) は dsh-darask のものをそのまま使えます。チェックアウト直下から:

```powershell
npm run dev            # = packages/darask/scripts/dev.mjs。ハーネスの root を link し、cordis.patch.yml を適用
```

## Hashline ツール

`hashline_read` は各行を `行番号:ハッシュ→内容` で返し、`hashline_edit` はそのアンカーで `replace` / `insert_after` / `write` を一括適用します。ハッシュが合わない行は stale として拒否し、±15 行以内に一意な移動先があれば候補を提示します。全操作を元のスナップショットに対して検証してから適用するため、部分適用は起きません。`hashline_grep` は `ctx.fs` 上でディレクトリを走査し、同じアンカー形式で一致行と前後文脈を返します。

## ステータスライン

セッションヘッダーに `deepseek-chat │ 42% (54K/128K) │ $0.0123 │ 12s` の形式で表示します。`$DSH_HOME/darask/status-line.json` で上書きできます (grok-build の `[ui.status_line]` と同じ語彙):

```json
{
  "type": "builtin",
  "items": ["model", "context", "cost", "turn-timer", "session-name"],
  "pricing": { "deepseek/deepseek-chat": { "input": 0.28, "output": 0.42, "cacheRead": 0.028 } }
}
```

`type: "command"` と `command` を指定すると、ホストが作業ディレクトリでそのコマンドを実行し、stdin に 1 行の JSON (`schema_version: 1`、`model` / `context_window` / `cost` / `turn` / `workspace` / `cwd` / `session_id`) を渡し、stdout の最初の非空行を表示します。ANSI 制御列は除去し、長さとタイムアウトで打ち切ります。料金は USD / 1M トークンで、モデル名または `provider/model` の glob をキーにします。料金が無いモデルはコスト項目を省きます。

## メモリー (Memory v2)

ターン完了ごとに、そのターンの要約 transcript をツール無しの補助モデル呼び出しへ渡し、再利用価値のある観測 (`user` / `feedback` → global、`project` / `reference` → workspace) だけを厳密な JSON として取り出します。保存先は `$DSH_HOME/darask/memory/{global,workspaces/<slug>-<hash>}/` で、各スコープに次があります:

```
topics/<slug>.md              Dream が統合したトピック (## セクション構成)
observations/_inbox/*.md      不変の観測ファイル (frontmatter + 本文)。書き込みは同一ディレクトリの一時ファイル → rename
archive/*.md                  トピックへ取り込まれた観測 (archiveRetentionDays 経過で削除)
MEMORY.md                     生成される目次 (決定的、バイト数・件数で上限)
memory.sqlite                 メタデータと FTS5 索引 (unicode61 + trigram。日本語は trigram で一致)
```

- `memory_search` / `memory_get` ツールと `/memory status|search|dream|clear <scope> --yes` コマンドを提供。読み取りはスコープ相対パスのみ受け付け、`..` や絶対パスは拒否します。
- セッション最初のステップで `MEMORY.md` の要約を一度だけ注入します。注入内容には「過去の文脈であり、実際の状態は実ソースで確認する」旨の警告を含みます。
- Dream は保留観測が `dreamMinPending` 件以上または `dreamMaxPendingAgeMs` 以上経過したときに走り、モデルが返す `create` / `update` / `delete` / `rename` / `merge` / `split` 操作を検証 (パスは `topics/<slug>.md` のみ、evidence は今回渡した観測パスのみ) してから適用します。同時実行はリースで排他します。
- モデル出力はコマンド実行やファイル書き込みを直接行えません。未知のフィールドや上限超過は拒否します。SQLite は Node 24 組み込みの `node:sqlite` を使い、再起動後は不変ファイルから索引を再構築します。
- 設定は `cordis.patch.yml` の `darask-memory` 項目 (`provider` / `model` を省くとセッションのモデルを使用、`capture` / `injectContext` / `dream` で各段を無効化可能)。

## 変更追跡 (Hunk tracker)

上流の書き込み・編集ツールが通す `fs/write-intent` / `fs/edit-intent` ゲートで、そのセッションが初めて触るファイルの内容をベースラインとして保存し、ツールが `tools/result` で確定した後に再読込して差分を hunk (連続する変更行の塊) として保持します。各 hunk は `agentEdit { turn }` / `externalEditOnAgentFile` / `external` のいずれかに帰属し、追跡中ファイルはターン開始時と照会時に再読込して外部編集を検出します。再計算時は内容一致・重なりで旧 hunk と照合し、ID と帰属を引き継ぎます。

- `hunks_status` (ターン別・ファイル別の保留 hunk 数、accept / reject 集計) と `hunks_diff` (ベースライン→現在の unified diff、`agent_only` でエージェント hunk のみ) はモデル向けの読み取り専用ツール。出力は `diffOutputMaxBytes` で打ち切ります。
- `/hunks status|list [path]|diff [path]|accept <all|turn N|path|id>|reject <all|turn N|path|id> [--yes]|forget <path>`。accept は hunk をベースラインへ畳み込み、reject は `ctx.fs.writeText` で該当 hunk だけを元に戻します (作成ファイルの reject は削除)。複数 hunk の reject は `--yes` が必要です。
- 状態は `$DSH_HOME/darask/hunks/<session>.json` に一時ファイル → rename で保存し、再起動後も引き継ぎます (`persist: false` で無効)。`baseline: git-head` にすると初回のベースラインを `git show HEAD:<file>` から取ります。バイナリ (`FS_NOT_TEXT`)・`maxFileBytes` 超・非通常ファイルは hunk を計算せず種別だけ記録します。
- 追跡はエージェントが触ったファイルに限ります (grok-build の `AgentOnly` 相当)。作業ツリー全体の dirty ファイル追跡と、hunk 単位の UI レビューは未実装です。

## コードグラフ (Codebase graph)

`npm run build` が `packages/dsh-code-graph/grammars.json` に固定した tree-sitter 文法パッケージ (`tree-sitter-javascript` / `-typescript` / `-python` / `-go` / `-rust`、いずれも MIT) を `npm pack` で取得し、WASM と `queries/tags.scm` だけを `grammars/` へ展開します (ネイティブビルドは走らず、`grammars/` は git 管理外)。取得できない言語は実行時にスキップされ、`/code-graph languages` で状態を確認できます。

最初の照会時にワークスペース (`git ls-files --cached --others --exclude-standard`、git 外では `node_modules` 等を除く再帰走査) を索引し、その後は `staleAfterMs` 経過後の照会で stat 版数を比較して変わったファイルだけ再解析します。エージェントの書き込みは `fs/write-intent` / `fs/edit-intent` と `tools/result` から検出して即時に再索引します。外部エディターでの追加・削除は次の走査または `/code-graph reindex` で反映されます。

- `code_definitions` (定義へジャンプ。`path` を渡すと同一ファイル → 近いディレクトリの順で並ぶ)、`code_references` (呼び出し・生成・型参照・impl。名前一致なので同名シンボルは全て並び、`include_definitions` で定義も併記)、`code_outline` (1 ファイルの定義一覧と包含関係)、`code_symbols` (部分一致の名前検索)。いずれも読み取り専用です。
- `/code-graph status|reindex|languages|outline <path>|find <symbol>`。
- 索引は `$DSH_HOME/darask/code-graph/<workspace-hash>.json` に一時ファイル → rename で保存し、再起動後は stat 版数が一致するファイルを再解析せずに使います (`persist: false` で無効)。`maxFileBytes` (既定 5 MiB) 超・バイナリ・非通常ファイルは除外、`maxFiles` 超のワークスペースは先頭 (パス順) だけ索引して status に警告を出します。
- grok-build の scope graph (字句スコープでの解決) と ACP `workspace.code_goto_*` RPC は移植していません。参照は名前一致で、型解決はしません。

## ハブ更新の配布

dsh-darask の `host-update` はこの monorepo でも動作します。開発モードの PC はハーネスのチェックアウトを `git merge --ff-only` し、インストール済み PC には `packages/darask` を `npm pack` したアーカイブ (`dsh-darask-*.tgz`) を配布します。配布単位をハーネス全体にするのは今後の課題です (下記)。

## 今後の課題

- 配布単位を `darask-harness` パッケージにし、リモート PC のインストーラーもハーネスを導入する。
- grok-build の Agent Dashboard の DSH プラグイン化。Hunk tracker の全 dirty ファイル追跡と UI レビュー。Code graph のスコープ解決 (同名シンボルの絞り込み) と言語追加。
- Memory の埋め込み検索・クエリ拡張 (現状は語彙検索のみ)。
- dsh-darask 内で上流と重なる補助 UI の整理。

## ライセンス

MIT。取り込んだ第三者コードの出典とライセンスは [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) を参照。
