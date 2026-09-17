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
   ├─ dsh-hashline/        @darask/dsh-hashline — grok-build の hashline read/edit/grep 移植
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

## リモート PC と対人ゲーム

`darask_computer` はハブ PC (`node: local`) と、認証済みの登録済み PC を同じ操作経路から扱います。ゲームは各 PC の「設定 → アカウント → ブラウザーと画面操作」で、実行ファイル・引数・作業フォルダーを起動プロファイルとして保存します。モデルやリモート要求から任意のコマンドやパスは指定できず、保存済みプロファイルだけを `shell: false` で起動します。

二台での検証は `pcs → launch_game_pair → pair_screenshot` の順に開始します。`pair_screenshot` が返す画像と `snapshotId` は PC ごとに分かれるため、その後の操作では同じ node と `snapshotId` を組み合わせます。片方だけ起動した場合も自動再送しません。ロビー表示だけでは成功とせず、一方の入力が相手側へ反映されることを両方向の画面で確認して、対人動作の成功と判定します。

実機検証には、Computer Use を有効にしたログイン済み Windows PC 二台、双方で動く同じゲーム、接続済み Tailscale、ゲーム固有のロビー／参加手順が必要です。Linux ではゲームプロファイルの設定画面を検証できますが、ネイティブ画面操作は実行できません。

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

## ハブ更新の配布

dsh-darask の `host-update` はこの monorepo でも動作します。開発モードの PC はハーネスのチェックアウトを `git merge --ff-only` し、インストール済み PC には `packages/darask` を `npm pack` したアーカイブ (`dsh-darask-*.tgz`) を配布します。配布単位をハーネス全体にするのは今後の課題です (下記)。

## dsh-darask の移行状況

移設時点の `daraskme/dsh-darask` の既定ブランチと照合し、ソース、テスト、スキル、vendor、生成物、ライセンス、固定依存は `packages/darask` とルート lockfile へ移行済みです。開発起動、更新制御、ロケール検査、画面 bundle は monorepo 配置に合わせて調整しています。パッケージ名 `dsh-darask` は、既存プロファイル、更新アーカイブ、インストーラーとの互換性のため意図的に維持します。

リポジトリ運用まで完全に一本化した状態ではありません。インストール済みリモート PC への配布とセットアップは現在も `dsh-darask` パッケージ単位で、パッケージ内の移行スクリプト・メタデータ・一部の単体導入ドキュメントは旧リポジトリを参照します。旧コミット履歴とリリースタグも `darask-harness` の履歴へは移さず、旧リポジトリ側に保持しています。

## 今後の課題

- 配布単位を `darask-harness` パッケージにし、リモート PC のインストーラーもハーネスを導入する。
- grok-build の Memory v2、Hunk tracker、Codebase graph、Agent Dashboard の DSH プラグイン化。
- dsh-darask 内で上流と重なる補助 UI の整理。

## ライセンス

MIT。取り込んだ第三者コードの出典とライセンスは [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) を参照。
