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
   └─ dsh-hashline/        @darask/dsh-hashline — grok-build の hashline read/edit/grep 移植
```

### どこから何を採ったか

| 領域 | 採用元 | 実装 |
|---|---|---|
| ランタイム・プラグイン基盤・Plan mode・Hooks・Sandbox・Jobs・Subagent・MCP・ACP・LSP・Browser/Computer use・セッション永続化・Skills/Workflows・AGENTS.md ローダー | DSH (上流) | そのまま使用。再実装しない |
| 日本語 UI、OpenAI/OpenRouter/Grok/Cursor/Codex/Claude/ローカルモデルの Usage・認証、リモート PC / ワークスペース、Cloudflare Access 対応 Bridge Gateway、GPU / LoRA、ハブ→リモート更新配布 | dsh-darask | `packages/darask` |
| Hashline 行アンカー編集 (`hashline_read` / `hashline_edit` / `hashline_grep`): FNV-1a 正規化ハッシュ、stale/shift/ambiguous 検出、範囲・重複検証、bottom-up 一括適用 | grok-build `GrokBuildHashline` | `packages/dsh-hashline` (JS 再実装、`ctx.fs` + sandbox policy 経由) |
| プロジェクト指示ファイル名 (`AGENTS.md` / `AGENT.md` / `GROK.md` / `CLAUDE.md` と `.local` 版) | grok-build | `presets/darask` で上流 `@deepseek-ai/dsh-agent-instructions` を設定 (独自ローダーは持たない) |
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

## ハブ更新の配布

dsh-darask の `host-update` はこの monorepo でも動作します。開発モードの PC はハーネスのチェックアウトを `git merge --ff-only` し、インストール済み PC には `packages/darask` を `npm pack` したアーカイブ (`dsh-darask-*.tgz`) を配布します。配布単位をハーネス全体にするのは今後の課題です (下記)。

## 今後の課題

- 配布単位を `darask-harness` パッケージにし、リモート PC のインストーラーもハーネスを導入する。
- `.grok/rules/*.md` / `.claude/rules/*.md` / `.cursor/rules/*.md` のディレクトリ型ルール (上流ローダーは同一ディレクトリのファイル名のみ対応)。
- grok-build の Memory v2、Codebase graph、Agent Dashboard、Status line の DSH プラグイン化。
- dsh-darask 内で上流と重なる補助 UI の整理。

## ライセンス

MIT。取り込んだ第三者コードの出典とライセンスは [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) を参照。
