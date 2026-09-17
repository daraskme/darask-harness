---
name: grok-imagine-video
description: darask_imagine_video で Grok Imagine の動画を生成する。静止画の動画化にも対応する。
whenToUse: Grok Imagine の動画生成や、GPT Image などで作った静止画の動画化を頼まれたとき。
---

# grok-imagine-video

`darask_imagine_video` で `grok-imagine-video-1.5` を使う。`DARASK_XAI_API_KEY` が設定済みなら、そのキーを優先する。未設定なら本機の Grok Build のログイン情報を使う。Grok / SuperGrok の認証が Imagine API に受理されることを確認し、契約の残量や利用可能性を推測しない。

GPT Image 2 の静止画生成は `gpt-image-2` スキルを使う。

## 引数

`darask_imagine_video`:

- `prompt`: 動き・カメラ・照明。画像を指定する場合は省略できる。
- `imagePath`: この DSH を動かす PC 上の JPEG・PNG・WebP の絶対パス。12 MB 以下。別 PC のパスや不明な `assetId` を渡さない。
- `imageUrl`: 公開 HTTPS URL または画像の data URI。`imagePath` と同時に指定しない。
- `duration`: 1〜15 秒。
- `resolution`: `480p`・`720p`・`1080p`。
- `aspectRatio`: `16:9`・`9:16`・`1:1` など。元画像の縦横比を保ちたい場合は省略する。
- `model`: 初期値は `grok-imagine-video-1.5`。
- `requestId`: 既存の生成を再確認する受付 ID。再確認時はこの引数だけを渡す。

画像から生成する場合は `imagePath` または `imageUrl`、文章から生成する場合は `prompt` を指定する。ツールに `image` という引数はない。

生成には数分かかる。待機中は同じ内容を再送しない。通信切断や待機終了後は、返された `requestId` で確認を再開する。受付 ID は `addons-output/xai-video-<ID>.json` にも保存される。受付 ID を受け取る前に接続が切れた場合は、生成開始の成否が不明なので自動再送しない。

## GPT Image 2 の動画化

1. `codex_connect_image_generate` の完了を待つ。
2. 実在する原本ファイルのパスまたは公開 URL を確認する。原本の `assetId` をパスに置き換えて推測しない。
3. 動かす部分・カメラ・時間を指定する。

## 結果の確認

- 実際に保存されたファイルまたは返された動画 URL を提示する。エラー時に成功したと報告しない。
- 認証エラーは「設定 → アカウント」で確認する。残量・課金方式の変更を勝手に行わない。
- コンテンツ判定で生成されなかった場合は、その結果を伝える。判定の回避は行わない。
