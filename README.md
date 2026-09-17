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
   ├─ dsh-monitor/         @darask/dsh-monitor — 長時間スクリプトの行イベント監視 (monitor ツール、レート制限・自動停止)
   ├─ dsh-rules/           @darask/dsh-rules — .grok/.claude/.cursor rules ディレクトリと glob 条件ルール
   ├─ dsh-status-line/     @darask/dsh-status-line — モデル/コンテキスト/コスト/経過時間のステータスライン
   └─ dsh-worktree/        @darask/dsh-worktree — Git worktree のライフサイクル (worktree_create / worktree_list / worktree_remove、/worktree gc)
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
| バックグラウンド監視 (monitor): 長時間スクリプトの stdout 各行をイベントとして即時配信 (実行中は inject、待機中は followup で起床)、行 500 字 / バッチ 3,000 字の打ち切り、トークンバケット (10 件 / 2 秒補充) による抑制と追い付き通知、30 秒継続過負荷での自動停止、既定 10 時間・`persistent` で無期限 | grok-build `monitor` ツール | `packages/dsh-monitor`。プロセスは上流 `ctx.shell` (bash / pwsh、sandbox 適用) で起動し `ctx.jobs` に登録するだけで、一覧・出力・停止は上流 `job_list` / `job_output` / `job_kill` をそのまま使う |
| Git worktree ライフサイクル: 名前付き worktree を `<repo>/.darask/worktrees/<name>` に作成 (`.git/info/exclude` 登録)、所有セッション・基点・時刻のレジストリ、dirty / missing / prunable / stale 判定、dirty を `force` 無しで消さない削除、消失・stale エントリの gc | grok-build `xai-fast-worktree` のライフサイクル部分 | `packages/dsh-worktree` (git CLI のみ。Btrfs / CoW / overlay / NFS / SQLite メタデータは非対象)。`worktree_*` ツール、`/worktree` コマンド |
| プロンプトキュー・割り込み (待機中プロンプト、次ステップへの steering、並べ替え・削除、キャンセル時の保持) | DSH 上流 `Agent.inbox` (`nextTurn` / `nextStep`、`append` / `prepend` / `replace` / `remove` / `splice`、`cancel(..., { keepInbox })`) | grok-build `prompt_queue` / `queue_mutation` 相当は上流に既にあるため移植しない |
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
- `/hunks status|list [path]|diff [path]|accept <all|turn N|path|id>|reject <all|turn N|path|id> [--yes]|forget <path>`。accept は hunk をベースラインへ畳み込み、reject は DSH の版数付き書き込みで該当 hunk を戻し、成功後に追跡状態を確定します。複数 hunk の reject は `--yes` が必要です。DSH 0.1.5-rc.2 に版数付き削除 API が無いため、新規ファイルの reject は拒否します（確認後に手動削除して再照会）。read-only / workspace-write の制限付きポリシーでは reject を無効にします。
- 状態は `$DSH_HOME/darask/hunks/<session>.json` に一時ファイル → rename で保存し、再起動後も引き継ぎます (`persist: false` で無効)。`baseline: git-head` にすると初回のベースラインを `git show HEAD:<file>` から取ります。バイナリ (`FS_NOT_TEXT`)・`maxFileBytes` 超・非通常ファイルは hunk を計算せず種別だけ記録します。
- 追跡はエージェントが触ったファイルに限ります (grok-build の `AgentOnly` 相当)。作業ツリー全体の dirty ファイル追跡と、hunk 単位の UI レビューは未実装です。

## コードグラフ (Codebase graph)

`npm run build` が `packages/dsh-code-graph/grammars.json` に固定した tree-sitter 文法パッケージ (`tree-sitter-javascript` / `-typescript` / `-python` / `-go` / `-rust`、いずれも MIT) を `npm pack` で取得し、WASM と `queries/tags.scm` だけを `grammars/` へ展開します (ネイティブビルドは走らず、`grammars/` は git 管理外)。取得できない言語は実行時にスキップされ、`/code-graph languages` で状態を確認できます。

最初の照会時にワークスペース (`git ls-files --cached --others --exclude-standard`、git 外では `node_modules` 等を除く再帰走査) を索引し、その後は `staleAfterMs` 経過後の照会で stat 版数を比較して変わったファイルだけ再解析します。エージェントの書き込みは `fs/write-intent` / `fs/edit-intent` と `tools/result` から検出して即時に再索引します。外部エディターでの追加・削除は次の走査または `/code-graph reindex` で反映されます。

- `code_definitions` (定義へジャンプ。`path` を渡すと同一ファイル → 近いディレクトリの順で並ぶ)、`code_references` (呼び出し・生成・型参照・impl。名前一致なので同名シンボルは全て並び、`include_definitions` で定義も併記)、`code_outline` (1 ファイルの定義一覧と包含関係)、`code_symbols` (部分一致の名前検索)。いずれも読み取り専用です。
- `/code-graph status|reindex|languages|outline <path>|find <symbol>`。
- 索引は `$DSH_HOME/darask/code-graph/<workspace-hash>.json` に一時ファイル → rename で保存し、再起動後は stat 版数が一致するファイルを再解析せずに使います (`persist: false` で無効)。`maxFileBytes` (既定 5 MiB) 超・バイナリ・非通常ファイルは除外、`maxFiles` 超のワークスペースは先頭 (パス順) だけ索引して status に警告を出します。
- grok-build の scope graph (字句スコープでの解決) と ACP `workspace.code_goto_*` RPC は移植していません。参照は名前一致で、型解決はしません。

## バックグラウンド監視 (monitor)

`monitor` ツールは、長時間動くスクリプト (PR のポーリング、`tail -F app.log | grep --line-buffered ERROR`、ビルド完了待ち等) を上流のシェル実行器で起動し、`ctx.jobs` にジョブとして登録します。stdout の各行が 1 イベントで、`<monitor-event description="..." job_id="...">` に包んで所有エージェントへ届けます。エージェントがターン実行中なら次ステップの文脈に注入し、待機中なら followup として起床させます (起床はユーザー入力までの連続回数を `maxConsecutiveWakes` で制限)。

- 行は 500 字、1 バッチは 3,000 字で打ち切り。イベントはトークンバケット (容量 10、2 秒に 1 件補充) で抑制し、再開時に `[N events suppressed ...]` を前置します。抑制が 30 秒続くとプロセスを停止し、フィルターを強めるよう伝えます。
- 既定の期限は 10 時間 (`timeout_ms` で短縮)。`persistent: true` は期限なしで、セッション終了か `job_kill` まで動きます。終了時は最後の行を 1 回注入し、完了通知は上流 `tool-jobs` に任せます (二重起床しない)。
- 一覧・未読行の取得・停止は上流の `job_list` / `job_output` / `job_kill`。ジョブは所有セッションにだけ見え、セッション破棄で取り消されます。sandbox が有効ならそのポリシーで実行し、`PYTHONUNBUFFERED=1` を渡します。

## Git worktree

`worktree_create` は `git rev-parse --show-toplevel` (リンク先 worktree からは主ツリーへ解決) で対象リポジトリを決め、`<repo>/.darask/worktrees/<name>` に `git worktree add -b wt/<name> <path> <base>` で作成します (`branch` に既存ブランチを渡すとチェックアウト)。`.darask/` は `.git/info/exclude` に登録するので主ツリーは clean のままです。`root` 設定で別の場所も指定できます。現在の Git アダプターは sandbox を適用できないため、read-only / workspace-write の制限付きポリシーでは作成・削除・GC を拒否します。制限を無効にする代わりに、DSH の標準 shell ツールを利用してください。

- レジストリ `$DSH_HOME/darask/worktrees/registry.json` には名前・パス・ブランチ・基点・所有セッション・時刻を残し、`worktree_list` / `/worktree list` は `git worktree list --porcelain` と `git status --porcelain` で dirty / missing / prunable / locked / stale を付けます。
- `worktree_remove` は dirty な worktree を `force` 無しでは消しません。`delete_branch` でブランチも削除。レジストリに無い worktree と呼び出し元セッションの現在のフォルダーを含む worktree は対象外です。
- レジストリの読み直し・Git 操作・保存を、プロセス間の排他ディレクトリで直列化します。取得待ちが10秒を超えると拒否します。クラッシュで `registry.json.lock` が残った場合は、同じ DSH_HOME を使う全ハーネスを停止してから、この空のロックディレクトリだけを削除してください。自動で期限切れ扱いにして他の書き込みを追い越す処理は行いません。
- `/worktree gc [--all]` は消失・prunable と (clean な) stale エントリを片付け、`git worktree prune` を実行します。名前は `[A-Za-z0-9._-]` 64 字まで、ブランチと基点は `git check-ref-format` 相当の検査で `-` 始まりや空白を拒否します。同一リポジトリの上限は `maxWorktrees` (既定 24)。

## エージェント ダッシュボード

サイドバーのパネル一覧 (`sidebar.panellist`) にダッシュボードを追加し、`main` パネルにこの PC と登録済みリモート PC の全セッションを 1 画面で表示します (grok-build の Agent Dashboard の設計を移植)。行は毎回、上流の `sessions` スナップショット (実行中 / 完了 / サブエージェント / ジョブ / 保留中の許可・質問 / モデル選択)、開いているリモートワークスペースの iframe が届ける状態、開いていないリモートワークスペースは読み取り専用一覧 (`/api/darask/sessions/dashboard`、既存の `darask_remote_sessions` と同じ上限・秘匿処理) から組み直します。セッションの複製保存はありません。

- 状態は `要対応` (許可・計画レビュー・質問待ち、ジョブ失敗) → `作業中` → `完了` → `待機` → `未接続` の優先順で 1 つに決め、状態別 / PC 別 / ワークスペース別のグループ化、すべて / 要対応 / 作業中 / 接続中 / トップレベルの絞り込み、状態 / 更新 / タイトル順の並べ替え、タイトル・PC・フォルダー・モデルの検索ができます。表示設定だけを `localStorage` (`darask-dashboard:prefs`) に検証付きで保存します。
- 行を選ぶと、ローカルは上流 `sessions.open`、開いているリモートワークスペースは既存の `darask-open-session` メッセージ、未接続のリモートはワークスペースを開いてから当該セッションへ移動します。「≡」で本文を読み取り専用で確認 (ユーザー・アシスタント本文のみ、推論・ツール・秘匿情報は除外、50 件ずつ)。リモートへの操作 (停止・送信) は行いません。

## ハブ更新の配布

dsh-darask の `host-update` はこの monorepo でも動作します。開発モードの PC はハーネスのチェックアウトを `git merge --ff-only` し、インストール済み PC には `packages/darask` を `npm pack` したアーカイブ (`dsh-darask-*.tgz`) を配布します。配布単位をハーネス全体にするのは今後の課題です (下記)。

## 今後の課題

- 配布単位を `darask-harness` パッケージにし、リモート PC のインストーラーもハーネスを導入する。
- ダッシュボードの使用量・コスト表示 (Status line と共有) とリモートセッションのタイトル取得 (現状は未接続のリモートは ID 表示)。Hunk tracker の全 dirty ファイル追跡と UI レビュー。Code graph のスコープ解決 (同名シンボルの絞り込み) と言語追加。
- worktree の CoW 複製 (Btrfs / APFS clonefile) と `node_modules` の共有 (現状は plain `git worktree add`)。
- Memory の埋め込み検索・クエリ拡張 (現状は語彙検索のみ)。
- dsh-darask 内で上流と重なる補助 UI の整理。

## ライセンス

MIT。取り込んだ第三者コードの出典とライセンスは [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) を参照。
