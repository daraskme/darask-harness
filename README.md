# darask-harness

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 0.1.5-rc.2を基盤に、AIアカウント、モデルルーティング、Jev評価、Grok検索、リモートPC、Cloudflare接続、開発・更新機能を一つのDSHプラグインとして提供します。

パッケージ名、DSHプラグインID、開発起動、更新アーカイブはすべて `darask-harness` に統一されています。別のDARASKプラグインを追加する必要はありません。

## 必要環境

- Node.js 24.19.0以上
- npm
- WindowsまたはmacOS（全機能の対象はWindows）
- リモートPC連携を使う場合はTailscale

## 構成

```text
darask-harness/
├─ src/                 DARASKホスト・UI・モデル・接続機能
├─ scripts/             起動、ビルド、導入、更新配布
├─ skills/              DSHから利用するスキル
├─ presets/darask/      既定エージェントプリセット
├─ vendor/              Grok providerとBridge Gateway
├─ packages/            Hashline、Rules、Status Line
├─ test/                統合テスト
└─ cordis.patch.yml     DSHプロファイル全体の合成
```

DSH上流が提供するPlan mode、Hooks、Sandbox、Jobs、Subagent、MCP、ACP、LSP、Browser/Computer use、セッション永続化、Skills、Workflows、AGENTS.mdローダーはそのまま利用します。

## 導入

```powershell
git clone https://github.com/daraskme/darask-harness.git
cd darask-harness
npm ci
npm run check
```

DSHのwebプロファイルへ登録する場合:

```powershell
npx dsh plugin --profile web add 'link:C:\path\to\darask-harness'
npx dsh --profile web
```

開発モードでは、チェックアウト直下から次を実行します。

```powershell
npm run dev
```

既定では `C:\Users\<ユーザー>\Documents\Codex\DSH` をDSHルートとして使い、`127.0.0.1:3080` で起動します。別の場所を使う場合:

```powershell
npm run dev -- --dsh-root "D:\Apps\DSH"
```

起動ログに表示される `token=` 付きURLを開いて認証してください。トークン付きURLやQRをGit、チャット、通常ログへ保存しないでください。

## アカウントとモデル

モデル設定は **設定 → アカウント** に統合されています。DSH標準の独立した「モデル」ページは表示せず、次の項目を同じ画面で管理します。

- AIサービスのログインとAPIキー
- 使用するモデルID
- プロバイダーの有効・無効
- 通常の優先順位
- 用途別ルーティング
- モデル選択に表示するモデル
- JevとVercel AI Gateway

使用量と残量は左サイドバーの **Usage** に表示します。取得できない使用量を0として扱わず、異なるアカウント・通貨・単位を合算しません。

## DeepSeek V4 Pro、Jev、Grok

既定の役割分担は次の通りです。

| 役割 | 経路 |
|---|---|
| 会話、計画、ツール選択、全体管理、コード、統合、最終回答 | Vercel AI Gatewayの `deepseek/deepseek-v4-pro` |
| 型付き分類、ルーティング、採点、検証 | `typesafe-ai/jev` |
| 最新Web検索、ページ調査、X検索 | Grok 4.6の `web_search` / `x_search` |

DeepSeek V4 Proが司令塔となり、必要な場合だけJevまたはGrokへ委任します。Jevは会話・ブラウザー操作・コード実装には使いません。Grok検索やJevが利用できない場合、DeepSeekが安全に処理を継続し、実行していない処理を実行済みとは報告しません。

### Vercel AI Gateway

1. [Vercel AI Gateway API Keys](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys) でキーを発行します。
2. **設定 → アカウント → AIアカウント → Jev評価** にキーを入力します。
3. 変更を保存します。

同じ `AI_GATEWAY_API_KEY` をJevとDeepSeek V4 Proが共有します。キーはDSHの資格情報ストアへ保存し、設定ファイルや画面の状態応答には含めません。Jev呼び出しはZero Data Retentionを要求します。

### Grok検索

Grokへログインし、Grok 4.6を利用可能にしてください。最新情報が必要な処理では、DeepSeekがGrokサブエージェントへ委任し、Grok側でWeb検索とX検索を実行します。検索結果や引用は外部入力として扱い、重要な操作の前に出典を確認してください。

## リモートWindows PC

PC間接続にはCloudflare Accessの公開URLではなく、同じTailscaleネットワークのURLを使います。

### 接続先PC

1. ハブPCと同じTailscaleへログインします。
2. このリポジトリを導入し、`npm ci` と `npm run dev` を実行します。
3. 認証URLでDSHを開きます。
4. **設定 → アカウント → PC・Tailscale** を開きます。
5. **Tailscale内でDSHを共有** を有効にします。
6. **このPCのQRを表示** を開きます。

### ハブPC

1. **設定 → アカウント → PC・Tailscale → PCの接続** を開きます。
2. **QRでPCを追加** を押します。
3. 接続先PCのQRをカメラ、画像、または接続リンクから読み取ります。
4. PC名を確認し、**接続を確認して保存** を押します。

手入力する場合は、接続先の `https://<Tailscale DNS名>:8443` と、その起動URLの `token=` 以降を使用します。保存後はワークスペース画面で作成先PCを選択できます。

## Cloudflare

DSHルートを新規作成した場合、以前のCloudflare資格情報は引き継がれないため再登録が必要です。

### Cloudflare Browser Run

**設定 → アカウント → ブラウザー・画面操作 → Cloudflare Browser Run** で以下を保存します。

- Cloudflare Account ID
- Browser Rendering — Edit権限を持つAPIトークン

Browser Runは明示的に選択された公開HTTPSページで使用します。通常の対話ブラウザーはKitesurfです。

### Cloudflare TunnelとZero Trust Access

同梱Bridge Gatewayの **設定 → リモートアクセス** で管理します。

- Cloudflare TunnelのTokenと固定ホスト名
- 自動起動
- アクセス認証モード
- Cloudflare Zero Trust Accessの有効・無効
- Team Domain
- Application Audience（AUD）

Origin、Host、DSHセッション、Cloudflare Accessの検証は無効化しないでください。対話ログインが必要なCloudflare公開URLは、PC間の自動更新配布には使いません。

## 開発・更新

**設定 → 開発・更新** では、Git状態、差分、再ビルド、GitHub更新、DSH再起動、登録済みPCへの配布を管理できます。

開発モードのPCは自身の `origin/main` をfast-forwardします。インストール済みPCには `darask-harness-<version>.tgz` を配布します。未コミット変更や分岐した履歴は自動で破棄しません。

## 検証

```powershell
npm run check
```

このコマンドはルートのクライアント、同梱Gateway、全テスト、独立ワークスペースを検証します。生成物である `dist/client.js`、`vendor/dsh-bridge-gateway/client/client.js`、`packages/dsh-status-line/dist/client.js` は直接編集しないでください。

## ライセンス

MIT。第三者成果物の出典とライセンスは [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) と `vendor/` 内の表示を参照してください。
