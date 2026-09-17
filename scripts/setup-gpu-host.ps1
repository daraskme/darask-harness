#requires -Version 5.1
param(
  [ValidateSet('local','pro')][string]$Role = 'local',
  [string]$Root = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Codex\DARASK-GPU'),
  [string]$ExistingComfyPath = '',
  [ValidateRange(1024,65535)][int]$ComfyPort = 8188,
  [switch]$NoStart
)
$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
if ($ExistingComfyPath) {
  $ExistingComfyPath = [IO.Path]::GetFullPath($ExistingComfyPath)
  if (!(Test-Path -LiteralPath $ExistingComfyPath -PathType Container)) { throw '既存 ComfyUI のフォルダーが見つかりません。-ExistingComfyPath を確認してください。' }
  if ($Root.TrimEnd('\') -eq $ExistingComfyPath.TrimEnd('\') -or $Root.StartsWith($ExistingComfyPath.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw '-Root には既存 ComfyUI の外側の管理用フォルダーを指定してください。' }
}
New-Item -ItemType Directory -Force -Path $Root | Out-Null
if (!$ExistingComfyPath -or $Role -eq 'pro') {
$gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
if (!$gitCommand) { throw 'Git が見つかりません。winget install --id Git.Git -e で導入し、PowerShell を開き直してください。' }
$gitExe = $gitCommand.Source
$pyCommand = Get-Command py.exe -ErrorAction SilentlyContinue
if (!$pyCommand) { throw 'Python 3.12 が見つかりません。winget install --id Python.Python.3.12 -e で導入し、PowerShell を開き直してください。' }
$pythonOutput = & $pyCommand.Source -3.12 -c 'import sys; print(sys.executable)'
if ($LASTEXITCODE -ne 0 -or !$pythonOutput) { throw 'Python 3.12 をインストールしてから実行してください。' }
$pythonExe = ($pythonOutput | Select-Object -Last 1).Trim()
if (!(Test-Path -LiteralPath $pythonExe)) { throw 'Python 3.12 の実行ファイルを確認してください。' }
}
$pwshExe = (Get-Process -Id $PID).Path

function Invoke-Checked([string]$Program, [string[]]$ProgramArgs) {
  & $Program @ProgramArgs | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "処理に失敗しました: $Program" }
}
function Initialize-Repository([string]$Name, [string]$Url, [string]$Revision) {
  $destination = Join-Path $Root $Name
  if (!(Test-Path -LiteralPath $destination)) {
    Invoke-Checked $gitExe @('clone','--no-checkout','--filter=blob:none',$Url,$destination)
    Invoke-Checked $gitExe @('-C',$destination,'checkout','--detach',$Revision)
  } else {
    $revisionNow = (& $gitExe -C $destination rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $revisionNow -ne $Revision) { throw "既存フォルダーの内容が異なります。別の -Root を指定してください: $destination" }
  }
  return $destination
}
function Start-Launcher([string]$Filename, [string]$Name) {
  $pidFile = Join-Path $Root "$Name.pid.json"
  if (Test-Path -LiteralPath $pidFile) {
    $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
    $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$($saved.pid)" -ErrorAction SilentlyContinue
    if ($existing -and $existing.CommandLine.Contains($Filename)) { Write-Host "$Name は実行中です。"; return }
  }
  $process = Start-Process -FilePath $pwshExe -ArgumentList @('-NoProfile','-File',('"' + $Filename + '"')) -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Root "$Name.out.log") -RedirectStandardError (Join-Path $Root "$Name.err.log") -PassThru
  @{pid=$process.Id; launcher=$Filename} | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding utf8
}
function Enable-PrivateService([int]$Port, [string]$Target) {
  $tailscale = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
  $state = (& $tailscale status --json | ConvertFrom-Json)
  if ($LASTEXITCODE -ne 0 -or $state.BackendState -ne 'Running') { throw 'Tailscale でこの PC を接続してください。' }
  $authority = $state.Self.DNSName.TrimEnd('.') + ":$Port"
  $existing = (& $tailscale serve status --json | ConvertFrom-Json)
  if ($LASTEXITCODE -ne 0) { throw 'Tailscale の共有設定を確認できません。' }
  if ($existing.AllowFunnel.$authority -eq $true) { throw "$Port は Funnel で公開されています。別ポートを指定してください。" }
  if ($existing.TCP."$Port") {
    $handlers = $existing.Web.$authority.Handlers
    if (!$existing.TCP."$Port".HTTPS -or !$handlers -or @($handlers.PSObject.Properties).Count -ne 1 -or $handlers.'/'.Proxy -ne $Target) { throw "既存の Tailscale 設定と競合します: $Port" }
  } else { Invoke-Checked $tailscale @('serve','--bg',"--https=$Port",'--set-path=/',$Target) }
  Write-Host "Tailscale 接続先: https://$authority"
}

if ($ExistingComfyPath) {
  Write-Host "既存 ComfyUI を使用します: $ExistingComfyPath"
  Write-Host "既存環境の起動方法でポート $ComfyPort に起動してください。再インストール・環境更新・モデル移動は行いません。"
} else {
Write-Host 'ComfyUI の実行環境を準備します。モデルはダウンロードしません。'
$comfyDirectory = Initialize-Repository 'ComfyUI' 'https://github.com/Comfy-Org/ComfyUI.git' '19e1058f4c445ef74047e77a23f9ca7684c1e4b6'
$comfyVenv = Join-Path $Root 'venv-comfy'
$comfyPython = Join-Path $comfyVenv 'Scripts\python.exe'
if (!(Test-Path -LiteralPath $comfyPython)) { Invoke-Checked $pythonExe @('-m','venv',$comfyVenv) }
Invoke-Checked $comfyPython @('-m','pip','install','--upgrade','pip')
Invoke-Checked $comfyPython @('-m','pip','install','torch','torchvision','torchaudio','--index-url','https://download.pytorch.org/whl/cu130')
Invoke-Checked $comfyPython @('-m','pip','install','-r',(Join-Path $comfyDirectory 'requirements.txt'))
$comfyLauncher = Join-Path $Root 'start-comfy.ps1'
@"
`$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath '$($comfyDirectory.Replace("'","''"))'
& '$($comfyPython.Replace("'","''"))' main.py --listen 127.0.0.1 --port $ComfyPort
"@ | Set-Content -LiteralPath $comfyLauncher -Encoding utf8
}

if ($Role -eq 'pro') {
  Write-Host '画像・動画 LoRA 用の AI Toolkit を準備します。学習モデルとデータセットはダウンロードしません。'
  $toolkitDirectory = Initialize-Repository 'ai-toolkit' 'https://github.com/ostris/ai-toolkit.git' '881143cbe895a9fe47a293e4cb2175d3c5342e49'
  Push-Location -LiteralPath $toolkitDirectory
  try {
    Invoke-Checked $pythonExe @('-X','utf8','-m','manager','sync')
    $runtimeCode = "import json,shutil; from manager.launch import build_env; from manager.util import venv_dir; env=build_env(); print(json.dumps({'venv':venv_dir(),'node':shutil.which('node.exe',path=env['PATH']),'path':env['PATH']}))"
    $runtimeJson = & $pythonExe -X utf8 -c $runtimeCode
    if ($LASTEXITCODE -ne 0) { throw 'AI Toolkit の実行環境を確認できません。' }
    $runtimeInfo = ($runtimeJson | Select-Object -Last 1) | ConvertFrom-Json
  } finally { Pop-Location }
  $toolkitVenv = $runtimeInfo.venv
  $nodeExe = $runtimeInfo.node
  if (!$nodeExe -or !(Test-Path -LiteralPath $nodeExe)) { throw 'AI Toolkit 用の Node.js を確認できません。' }
  $npmExe = Join-Path ([IO.Path]::GetDirectoryName($nodeExe)) 'npm.cmd'
  $uiDirectory = Join-Path $toolkitDirectory 'ui'
  $priorPath = $env:PATH
  $env:PATH = $runtimeInfo.path
  Push-Location -LiteralPath $uiDirectory
  try { Invoke-Checked $npmExe @('run','update_db'); Invoke-Checked $npmExe @('run','build') } finally { Pop-Location; $env:PATH = $priorPath }
  $tokenFile = Join-Path $Root 'toolkit-auth.txt'
  if (!(Test-Path -LiteralPath $tokenFile)) {
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant() | Set-Content -LiteralPath $tokenFile -Encoding utf8 -NoNewline
  }
  $toolkitLauncher = Join-Path $Root 'start-toolkit.ps1'
@"
`$ErrorActionPreference = 'Stop'
`$env:AI_TOOLKIT_AUTH = (Get-Content -LiteralPath '$($tokenFile.Replace("'","''"))' -Raw).Trim()
`$env:VIRTUAL_ENV = '$($toolkitVenv.Replace("'","''"))'
`$env:PATH = '$($runtimeInfo.path.Replace("'","''"))'
Set-Location -LiteralPath '$($uiDirectory.Replace("'","''"))'
`$worker = Start-Process -FilePath '$($nodeExe.Replace("'","''"))' -ArgumentList @('dist/cron/worker.js') -WorkingDirectory '$($uiDirectory.Replace("'","''"))' -WindowStyle Hidden -PassThru -RedirectStandardOutput '$((Join-Path $Root 'toolkit-worker.out.log').Replace("'","''"))' -RedirectStandardError '$((Join-Path $Root 'toolkit-worker.err.log').Replace("'","''"))'
try { & '$($nodeExe.Replace("'","''"))' node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 8675 } finally { if (!`$worker.HasExited) { Stop-Process -Id `$worker.Id } }
"@ | Set-Content -LiteralPath $toolkitLauncher -Encoding utf8
  Write-Host "DARASK の AI Toolkit 認証トークン欄には、このローカルファイルの内容を登録してください: $tokenFile"
}
if (!$NoStart) {
  if (!$ExistingComfyPath) { Start-Launcher $comfyLauncher 'comfy' }
  Enable-PrivateService 8444 "http://127.0.0.1:$ComfyPort"
  if ($Role -eq 'pro') { Start-Launcher $toolkitLauncher 'toolkit'; Enable-PrivateService 8445 'http://127.0.0.1:8675' }
}
Write-Host "準備が完了しました。実行ログと起動スクリプト: $Root"
