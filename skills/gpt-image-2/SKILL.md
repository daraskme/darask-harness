---
name: gpt-image-2
description: Codex Connect の GPT Image 2 で静止画を生成する。GPT Image、gpt-image-2、Codex の画像生成を指定されたときに使う。
whenToUse: GPT / ChatGPT のサブスクリプションで静止画を生成したいとき。
---

# gpt-image-2

`codex_connect_image_generate` で静止画を生成する。`darask_image_gen` は Grok の画像生成なので、GPT の画像生成として代用しない。独自の OpenAI API クライアントや API キーを要求しない。

## 呼び出し

`codex_connect_image_generate` に、生成内容をまとめた `prompt` を渡す。サイズ・枚数など、ツールに存在しない引数は追加しない。Codex Connect の `imageModelHint` の初期値は `gpt-image-2`。

「設定 → アカウント → Codex」で使用中の ChatGPT / Codex アカウントを使う。課金 API キーへの自動切り替えはしない。

ツールが見つからない場合:

1. 「設定 → アカウント → Codex → GPT の画像生成」を有効にする。保存設定の `llm-openai-codex.enableImageGeneration` が実際に使われる。配布時の初期値を変更するだけでは起動中の設定は変わらない。
2. 同じ画面で「画像生成ツールを使用できます。」と表示されることと、Codex のログインを確認する。状態は認証済みの `GET /api/darask/media` でも確認できる。
3. DSH が `run_code` だけを直接呼べるモードの場合は、現在の生成済み SDK に載っている `codex_connect_image_generate` をその中から呼ぶ。直接呼べないことと未登録を混同しない。
4. 未登録のままなら問題を報告する。生成できたとは言わない。

## プロンプト

被写体・構図・照明・画風・除外したい要素を一つにまとめ、ユーザーが使った言語で書く。ツールの文字数制限を守る。

## 生成後

返された添付画像を表示する。原本は `$DSH_HOME/dsh-codex-connect/images/v1` に保存され、結果には `assetId` などの情報が含まれる。`assetId` はファイルパスではない。返された絶対パスが存在しない場合、パスを推測して動画ツールに渡さない。

動画化を頼まれたら `grok-imagine-video` を読み、実在する原本の絶対パス、または利用可能な公開 URL を確認してから渡す。小さいプレビューを原本として扱わず、ユーザーの指定なく Grok で静止画を作り直さない。
