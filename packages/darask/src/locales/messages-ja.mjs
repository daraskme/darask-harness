const messages = {
  'Complete login in the browser opened by the official Grok CLI on the DSH host.': '本機の公式 Grok CLI が開いたブラウザでログインを完了してください。',
  'The official Grok CLI login did not complete.': '公式 Grok CLI のログインを完了できませんでした。',
  'Complete Codex authorization in the browser.': 'ブラウザで Codex の認証を完了してください。',
  'Open the authorization URL, then complete Codex sign-in.': '認証ページを開いて Codex のログインを完了してください。',
  'Complete sign-in in the provider browser flow.': 'サービスのブラウザ認証でログインを完了してください。',
  'Login cancelled.': 'ログインを中止しました。',
  'Login did not complete. Start sign-in again.': 'ログインを完了できませんでした。もう一度ログインしてください。',
  'A Grok authentication operation is already running.': 'Grok の認証処理が実行中です。',
  'The official Grok CLI authentication driver is unavailable.': '公式 Grok CLI の認証機能を利用できません。',
  'No observed Grok login is running. Refresh status before cancelling.': '実行中の Grok ログインがありません。状態を更新してください。',
  'Grok logout also signs out the official Grok CLI. Click Sign out again within 30 seconds to confirm.': '公式 Grok CLI からもログアウトします。続ける場合は 30 秒以内にもう一度押してください。',
  'Quota has not been retrieved.': '利用枠をまだ取得していません。',
  'Sign in to read Grok usage.': 'Grok の使用状況を確認するにはログインしてください。',
  'Grok quota is unavailable.': 'Grok の利用枠を取得できません。',
  'Grok did not disclose a remaining quota or credit balance.': 'Grok から残りの利用枠やクレジットが提供されていません。',
  'Codex is signed in, but usage could not be retrieved.': 'Codex はログイン済みですが、使用状況を取得できませんでした。',
  'Codex did not disclose a remaining quota or credit balance.': 'Codex から残りの利用枠やクレジットが提供されていません。',
  'Codex is signed in, but returned invalid usage data.': 'Codex はログイン済みですが、使用状況の応答を読み取れませんでした。',
  'Codex authorization must be renewed.': 'Codex の再認証が必要です。',
  'Sign in to read Codex usage.': 'Codex の使用状況を確認するにはログインしてください。',
  'The Codex provider could not read account status.': 'Codex のアカウント状態を取得できませんでした。',
  'The bundled provider endpoint is unavailable.': '統合元プラグインの接続先を利用できません。',
  'The DSH session or browser origin is not authorized for this provider.': 'DSH のログイン状態またはブラウザの接続元が、このサービスで許可されていません。',
  'Provider returned an invalid response.': 'サービスの応答を読み取れませんでした。',
  'The Grok provider operation failed.': 'Grok の操作に失敗しました。',
  'Provider request was cancelled; check status before retrying.': 'リクエストを中止しました。再試行前に状態を更新してください。',
  'Provider request timed out; check status before retrying.': 'リクエストがタイムアウトしました。再試行前に状態を更新してください。',
  'Provider request could not be completed.': 'サービスへのリクエストを完了できませんでした。',
  'Account credits require a separate management key; API key limits are shown when available.': 'アカウント残高の取得には別途管理キーが必要です。取得できる場合は API キーの上限残額を表示します。',
  'Management-key credits request failed; API-key usage remains available.': '管理キーで残高を取得できませんでした。API キーの使用状況は表示できます。',
  'Organization usage requires an admin key. Complimentary remaining is unknown until that key can be read.': '無料トークンの使用量には管理キーが必要です。残量は取得できるまで未確認のままです。',
  'Admin-key usage request failed; the project API key remains usable.': '管理キーで使用量を取得できませんでした。プロジェクトの API キーは使えます。',
  'Complimentary remaining percent needs a usage tier; used tokens are shown when the admin key can read organization usage.': '残量のパーセント表示には usage tier の指定が必要です。管理キーが読める場合は使用トークンだけを示します。',
  'OpenAI request failed; check the connection and retry.': 'OpenAI へのリクエストに失敗しました。接続を確認して再試行してください。',
  'Claude Code has not supplied subscription limits.': 'Claude Code から契約の利用枠がまだ提供されていません。',
  'Claude statusLine snapshot is invalid or unreadable.': 'Claude のステータス表示連携ファイルを読み取れません。',
  'The action failed. Check the connection or executable path.': '操作に失敗しました。接続状態または CLI の実行ファイルを確認してください。',
  'DARASK status is unavailable.': 'DARASK の状態を取得できません。',
  'Tailscale: connect this device first.': '先に Tailscale アプリでこの端末を接続してください。',
  'Tailscale: this HTTPS port belongs to another configuration.': 'この HTTPS ポートには別の Tailscale 設定があります。',
  'Tailscale: this Serve configuration was not created by DARASK.': 'この共有設定は DARASK が作成したものではありません。Tailscale 側で管理してください。',
  'Tailscale: Serve failed. Check HTTPS enablement and permissions in the Tailscale app.': 'Tailscale の共有を開始できませんでした。HTTPS の有効化と権限を Tailscale 側で確認してください。',
  'Tailscale: Serve state could not be verified.': 'Tailscale の共有状態を確認できませんでした。',
  'Browser Run: account ID must have 32 hexadecimal characters.': 'Cloudflare のアカウント ID は 32 桁の英数字で入力してください。',
  'Browser Run: invalid API token.': 'Browser Run の API トークンを確認してください。',
  'Browser Run: request failed. Check the API token and connection.': 'Browser Run の処理に失敗しました。API トークンと接続状態を確認してください。',
  'Computer: enable PC screen control in Settings → Accounts → PCs & Tailscale.': '設定 → アカウント → PC・Tailscale で画面操作を有効にしてください。',
  'Computer: PC screen control is available on Windows.': 'PC 画面の操作は Windows で利用できます。',
  'Computer: integration unavailable.': 'PC 画面の操作を利用できません。',
  'Computer: take a screenshot before using screenshot coordinates.': 'クリックする前に画面のスクリーンショットを取得してください。',
  'Computer: desktop host timed out.': 'PC 画面の操作がタイムアウトしました。',
  'Computer: cancelled.': 'PC 画面の操作を中止しました。',
};
export function messageJa(value, fallback = '処理を完了できませんでした。接続状態と設定を確認してください。') {
  if (!value) return fallback;
  if (messages[value]) return messages[value];
  if (/[ぁ-んァ-ヶ]/u.test(value)) return value;
  if (/Cursor.*(?:quota|usage)|individual.*(?:quota|balance)/i.test(value)) return 'Cursor の個人アカウント用の使用量・残高取得 API は提供されていません。';
  if (/Claude.*statusLine/i.test(value)) return 'Claude Code のステータス表示連携を設定すると、取得できる利用枠を表示します。';
  if (/^Priority/.test(value)) return '優先順位には全サービスを一度ずつ指定してください。';
  if (/absolute.*path/.test(value)) return '実行ファイルは絶対パスで指定してください。';
  if (/Cursor cannot|Grok cannot|Cursor and Grok/.test(value)) return 'Cursor と Grok には、それぞれ別の正しい実行ファイルを指定してください。';
  if (/^Computer:/.test(value)) return 'PC 画面の操作を完了できませんでした。設定と対象ウィンドウを確認してください。';
  if (/^Invalid|^Unknown/.test(value)) return '設定値を確認してください。';
  const status = /(?:HTTP\s+|failed \()(\d{3})/.exec(value)?.[1];
  if (status) return `接続先へのリクエストに失敗しました（HTTP ${status}）。`;
  return fallback;
}
export function labelJa(value) {
  const exact = { 'API key limit': 'API キーの利用上限', 'Account credits': 'アカウントのクレジット', 'API key remaining limit': 'API キーの上限残額', 'Grok weekly': 'Grok の週間利用枠', 'Grok monthly': 'Grok の月間利用枠', 'Grok billing': 'Grok の現在の利用枠', 'Complimentary large models': '無料枠・大型モデル', 'Complimentary small models': '無料枠・小型モデル', '5 hours': '5 時間', '7 days': '7 日' };
  return exact[value] ?? String(value ?? '').replace(/(\d+) (weeks?|days?|hours?|minutes?|seconds?)\b/g, (_, n, unit) => `${n} ${{ week: '週間', day: '日', hour: '時間', minute: '分', second: '秒' }[unit.replace(/s$/, '')]}`);
}
