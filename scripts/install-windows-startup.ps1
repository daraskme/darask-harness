param(
  [string]$DshRoot = (Join-Path $env:USERPROFILE 'Documents\Codex\DSH'),
  [string]$NodeExe = (Get-Command node.exe -ErrorAction Stop).Source,
  [string]$StartupDirectory = [Environment]::GetFolderPath('Startup'),
  [switch]$Plan
)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath $DshRoot).Path
$taskNode = (Resolve-Path -LiteralPath $NodeExe).Path
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'start-dsh.mjs') -PathType Leaf)) { throw 'DSH launcher is missing.' }
if ($taskRoot -match '["\r\n]' -or $taskNode -match '["\r\n]') { throw 'Unsupported path.' }
$taskStartup = (Resolve-Path -LiteralPath $StartupDirectory).Path
$taskLink = Join-Path $taskStartup 'DSH DARASK.lnk'
$taskRunner = Join-Path $taskRoot 'windows-dsh-host.ps1'
$taskPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$taskArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $taskRunner + '" -DshRoot "' + $taskRoot + '" -NodeExe "' + $taskNode + '"'
if ($Plan) {
  [pscustomobject]@{ Shortcut = $taskLink; Trigger = 'User logon'; Root = $taskRoot; Node = $taskNode; Runner = $taskRunner; Ports = '3080 local DSH / 3082 authenticated Gateway; existing Tailscale and Cloudflare' } | ConvertTo-Json
  exit 0
}
$taskShell = New-Object -ComObject WScript.Shell
$taskShortcut = $taskShell.CreateShortcut($taskLink)
if ((Test-Path -LiteralPath $taskLink) -and ($taskShortcut.TargetPath -ne $taskPowerShell -or $taskShortcut.Arguments -ne $taskArguments)) {
  throw 'A different DSH DARASK startup shortcut exists. Inspect it before changing its configuration.'
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'windows-dsh-host.ps1') -Destination $taskRunner -Force
$taskShortcut.TargetPath = $taskPowerShell
$taskShortcut.Arguments = $taskArguments
$taskShortcut.WorkingDirectory = $taskRoot
$taskShortcut.WindowStyle = 7
$taskShortcut.Description = 'Start the existing DSH after user logon and restart it after an unexpected exit.'
$taskShortcut.Save()
[pscustomobject]@{ Installed = $true; Shortcut = $taskLink; Trigger = 'User logon' } | ConvertTo-Json
