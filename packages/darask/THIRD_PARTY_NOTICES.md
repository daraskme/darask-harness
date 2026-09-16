# 第三者ソフトウェアとライセンス

DARASK 独自の統合コードは `LICENSE` の MIT License で配布します。依存・同梱するソフトウェアの権利とライセンスは各作者に帰属します。各パッケージに含まれる LICENSE / NOTICE 原文を正式な条件として保持しています。

| 部品 | 版・配布元 | ライセンス・著作権 | 配布方法 |
|---|---|---|---|
| DeepSeek Harness | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 0.1.5-rc.2 | MIT / Copyright 2026 DeepSeek | 実行環境・共有 UI と API |
| 日本語辞書 | [fang2hou/dsh-locale-ja](https://github.com/fang2hou/dsh-locale-ja) 0.5.0 | MIT / Copyright 2026 fang2hou | npm 依存 |
| Grok プロバイダー | [yoshino-xiao7/dsh-grok-provider](https://github.com/yoshino-xiao7/dsh-grok-provider) 1.0.5 | MIT / Copyright 2026 YukiRyou | npm 依存 |
| Codex Connect | [franksong2702/dsh-codex-connect](https://github.com/franksong2702/dsh-codex-connect) 0.1.0-alpha.4.35 | Apache-2.0 / Copyright 2026 Frank Song。Yan-Zero の著作物を含む | npm 依存。元の LICENSE、NOTICE、`docs/licenses/pi-ai-oauth.txt` を保持 |
| Bridge Gateway | [daraskme/dsh-bridge-gateway](https://github.com/daraskme/dsh-bridge-gateway/tree/9c53f3982ffd1337a59ba240b8f4dadd2b726178) 0.1.7 | MIT / Copyright 2024 wenbin-wb | `vendor/dsh-bridge-gateway` と bundled dependency。元の LICENSE を保持 |
| Chrome DevTools MCP | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) 1.9.0 | Apache-2.0。元の配布物の LICENSE / NOTICE を参照 | npm 依存。Kitesurf / Browser Run 接続に使用 |
| jsQR | [cozmo/jsQR](https://github.com/cozmo/jsQR) 1.4.0 | Apache-2.0 / Copyright 2017 Cozmo | QR 読み取り用のクライアントバンドルに組み込み。原文は `vendor/licenses/jsqr-LICENSE` |
| qrcode | [soldair/node-qrcode](https://github.com/soldair/node-qrcode) 1.5.4 | MIT / Copyright 2012 Ryan Day | npm 依存。DSH の接続 QR をローカルで生成 |
| oh-my-deepseek-harness | [yuanchenglu/oh-my-deepseek-harness](https://github.com/yuanchenglu/oh-my-deepseek-harness) | MIT / Copyright 2026 yuanchenglu | 意図ルーティング・認知ゲート・計画/記憶/チェックポイントを DSH 向けに再実装 |
| Cognition Fusion method | [Cognition, Introducing Fusion](https://cognition.com/blog/local-fusion) | 公開されたハーネス手順の再実装。Devin のソースではない | Codex / Claude 系リード時の計画・レビューと別コンテキスト実行 |
| Hermes Agent plugins | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | 上流プラグインの LICENSE に従う | disk-cleanup、security-guidance、kanban、Langfuse、Spotify、Achievements、image_gen などを DSH ツールとして移植 |
| security-guidance patterns | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Apache-2.0 / Copyright Anthropic, PBC | Hermes 経由でフォークした危険パターン定義 |

Gateway の元コミットは `9c53f3982ffd1337a59ba240b8f4dadd2b726178` です。DARASK では Cloudflare トンネルの引数・環境変数・接続成立判定・プロセス状態管理、DSH 公式 Connection を使う HTTP/WebSocket 認証、日本語表示を変更しました。npm 版や SSH 経由の GitHub 依存を参照せず、付属の実行用成果物を `file:vendor/dsh-bridge-gateway` から導入するようビルドフックも省いています。

ブラウザ用コードはホストの React と DSH 標準 UI 部品を共有します。Cordis、Schemastery、qrcode、ws、pi-ai などの依存関係についても、インストールされた各配布物のライセンスが適用されます。開発時の解決バージョンは `package-lock.json` に記録しています。

Codex Connect は Yan-Zero/dsh-codex（Copyright 2026 Yan-Zero）由来のコードを含み、Apache License 2.0 で配布されています。また earendil-works/pi の `@earendil-works/pi-ai` 0.84.4 に由来する OAuth ログイン・更新処理を含み、その MIT License は同パッケージの `docs/licenses/pi-ai-oauth.txt` に収録されています。この説明は元の NOTICE を置き換えません。

## 別途導入する実行環境

ComfyUI、AI Toolkit、llama.cpp、モデルの重みは、この npm パッケージに同梱しません。GPU セットアップスクリプトが取得する [ComfyUI](https://github.com/Comfy-Org/ComfyUI) は GPL-3.0、[AI Toolkit](https://github.com/ostris/ai-toolkit) は MIT（Copyright 2024 Ostris, LLC）、[llama.cpp](https://github.com/ggml-org/llama.cpp) は MIT です。取得先の原文と依存ソフトウェアの条件を参照してください。

Tailscale、Kitesurf、Cloudflare Browser Run、各 AI サービス・CLI はそれぞれの提供者の製品です。本プラグインはコミュニティによる統合であり、それらの公式製品ではありません。

## Shippori Antique

The bundled ShipporiAntique-Regular.ttf is licensed under SIL Open Font License 1.1. See skills/manga-speech-bubbles/fonts/OFL.txt for the original copyright and license.

Grok integration: `vendor/dsh-grok-provider` is a source fork of dsh-grok-provider 1.0.5 (MIT, YukiRyou). Changes: `vendor/dsh-grok-provider/DARASK_CHANGES.md`.
