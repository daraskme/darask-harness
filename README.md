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
| 会話、計画、ツール選択、全体管理、コード、統合、最終回答 | DeepSeek公式APIの `deepseek-v4-pro` |
| 型付き分類、ルーティング、採点、検証 | Vercel AI Gatewayの `typesafe-ai/jev` |
| 最新Web検索、ページ調査、X検索 | Grok 4.6の `web_search` / `x_search` |

DeepSeek V4 Proが司令塔となり、必要な場合だけJevまたはGrokへ委任します。Jevは会話・ブラウザー操作・コード実装には使いません。Grok検索やJevが利用できない場合、DeepSeekが安全に処理を継続し、実行していない処理を実行済みとは報告しません。

### DeepSeek公式API

1. DeepSeek Platformで公式APIキーを発行します。
2. **設定 → アカウント → AIアカウント → DeepSeek API** の「DeepSeek公式APIキー」に入力します。
3. モデルが `deepseek-v4-pro` であることを確認し、変更を保存します。

キーは `DEEPSEEK_API_KEY` としてDSHの資格情報ストアへ保存します。Vercel AI Gatewayを経由せず、DSH標準の `deepseek-official` プロバイダーから `https://api.deepseek.com` を使用します。

### Vercel AI Gateway（Jev専用）

1. [Vercel AI Gateway API Keys](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys) でキーを発行します。
2. **設定 → アカウント → AIアカウント → Jev評価** にキーを入力します。
3. 変更を保存します。

`AI_GATEWAY_API_KEY` はJev評価にだけ使用し、DeepSeekの会話リクエストには使用しません。キーはDSHの資格情報ストアへ保存し、設定ファイルや画面の状態応答には含めません。Jev呼び出しはZero Data Retentionを要求します。

### Bitwarden Secrets Manager

無料のBitwarden Secrets Managerから、許可したAPIキーを起動時または手動操作で同期できます。

1. Bitwarden Secrets ManagerにDARASK専用Projectを作成します。
2. ProjectへAPIキーをSecretとして登録します。
3. 読み取り専用Machine Accountを作成し、そのProjectだけを割り当てます。
4. Machine AccountのAccess Tokenを発行します。
5. `bws` CLIをインストールします。
6. **設定 → アカウント → AIアカウント → Bitwarden Secrets Manager** を開きます。
7. `bws.exe`の絶対パス、Machine Account Access Token、各APIキーに対応するSecret UUIDを入力します。
8. **起動時に自動同期**を有効にして保存するか、**今すぐ同期**を押します。

対応先には `DEEPSEEK_API_KEY`、Jev専用の `AI_GATEWAY_API_KEY`、OpenAI、OpenRouter、xAI、Cloudflare Browser Run、R2があります。DARASKは指定されたUUIDに対して `bws secret get <UUID> --output json` だけを実行し、Secret一覧や通常のPassword Manager保管庫を検索しません。Access Tokenと取得値は資格情報ストアへ保存し、preferences.json、画面応答、ログ、モデル入力へ出しません。

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

同梱Bridge Gatewayの **設定 → リモートアクセス** で管理します。公開TunnelはDSHの3080番へ直結せず、Access JWTとDSHセッションを検証するBridgeの `http://127.0.0.1:3082` へ接続します。

#### 1. GoogleをAccessのログイン方法にする

1. Cloudflare Zero TrustでTeam Domainを決めます（例: `darask.cloudflareaccess.com`）。
2. Google CloudでWeb application型のOAuth Clientを作ります。
3. Authorized JavaScript originsへ `https://<Team Domain>` を追加します。
4. Authorized redirect URIへ `https://<Team Domain>/cdn-cgi/access/callback` を追加します。
5. Zero Trustの **Integrations → Identity providers → Google** へClient IDとClient Secretを保存します。
6. PKCEを有効にしてTestを実行します。Clientless Web Isolation、ブラウザRDP/SSH/VNC、Cloudflare One Client認証は通常のDSHブラウザー接続では無効のままにします。

#### 2. Self-hosted Access Applicationを作る

1. **Access controls → Applications → Create new application → Self-hosted and private** を選びます。
2. Public hostname（例: `dsh.darask.me`）を登録します。
3. GoogleだけをIdentity Providerにし、Instant authenticationを有効にします。
4. Allowポリシーは利用者本人のGoogleメールアドレスだけに限定します。`Everyone`や`Bypass`は使用しません。
5. 保存後、**Additional settings → Application Audience (AUD) Tag**をコピーします。

#### 3. Named Tunnelを作る

1. **Networks → Tunnels → Create a tunnel → Cloudflared** を選びます。
2. Tunnel名を付け、Windows Connectorのコマンドを表示します。
3. コマンドの `--token` 以降にあるTunnel Tokenだけをコピーします。コマンド全体、Tunnel ID、画面のマスク値`******`はTokenではありません。
4. Public HostnameにAccess Applicationと同じホスト名を追加し、Serviceを `HTTP` / `127.0.0.1:3082` にします。

#### 4. DSHへ保存する

1. **設定 → リモートアクセス → Cloudflare Tunnel**でTunnel Tokenと固定ホスト名を保存します。
2. 自動起動を有効にし、Tunnelを開始します。
3. **セキュリティ → Cloudflare Zero Trust Access**でTeam Domain（`https://`なし）とAUD Tagを保存し、有効にします。
4. 公開URLを開き、Googleログイン後にDSHが表示されることを確認します。

| 値 | 取得場所 | 用途 |
| --- | --- | --- |
| Tunnel Token | Zero Trust → Networks → Tunnels → Connector setup | `cloudflared`のNamed Tunnel接続 |
| Team Domain | Zero TrustのTeam設定 | Access JWTのIssuer検証 |
| Application Audience (AUD) | Access Application → Additional settings | Access JWTのAudience検証 |
| Google OAuth Client ID / Secret | Google Cloud OAuth Client | Cloudflare AccessのGoogleログイン |
| Browser Run API Token | Cloudflare API Tokens、Browser Rendering — Edit | Cloudflare Browser Run。Tunnel Tokenとは別 |
| R2 Access Key ID / Secret Access Key | R2 → Manage R2 API Tokens | R2のS3互換保存。通常のAPI Tokenとは別 |

`Error 1033`はAccessポリシーではなく接続中のTunnel Connectorがない状態です。DSHのTunnel開始状態、Token、`cloudflared`プロセス、Originの3082番を確認します。Origin、Host、DSHセッション、Cloudflare Accessの検証は無効化しないでください。対話ログインが必要なCloudflare公開URLは、PC間の自動更新配布には使いません。

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
