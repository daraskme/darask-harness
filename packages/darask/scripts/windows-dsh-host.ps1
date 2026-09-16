param(
  [Parameter(Mandatory = $true)][string]$DshRoot,
  [Parameter(Mandatory = $true)][string]$NodeExe
)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath $DshRoot).Path
$taskNode = (Resolve-Path -LiteralPath $NodeExe).Path
$taskEntry = Join-Path $taskRoot 'start-dsh.mjs'
if (-not (Test-Path -LiteralPath $taskEntry -PathType Leaf)) { throw 'DSH launcher is missing.' }
$taskLogDir = Join-Path $taskRoot 'data\darask'
[IO.Directory]::CreateDirectory($taskLogDir) | Out-Null
$taskHash = [Security.Cryptography.SHA256]::Create()
try { $taskKey = [BitConverter]::ToString($taskHash.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskRoot.ToLowerInvariant()))).Replace('-', '').Substring(0, 24) } finally { $taskHash.Dispose() }
$taskMutex = [Threading.Mutex]::new($false, "Local\DSH-DARASK-$taskKey")
$taskOwned = $false
try {
  try { $taskOwned = $taskMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $taskOwned = $true }
  if (-not $taskOwned) { exit 0 }
  while ($true) {
    # Adopt a manually started DSH. Never launch a second server on its port.
    $taskPorts = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if (@($taskPorts | Where-Object Port -eq 3080).Count -gt 0) { Start-Sleep -Seconds 15; continue }
    foreach ($taskName in @('dsh.out.log', 'dsh.err.log')) {
      $taskLog = Join-Path $taskLogDir $taskName
      if (Test-Path -LiteralPath $taskLog) { Copy-Item -LiteralPath $taskLog -Destination ($taskLog + '.previous') -Force }
    }
    $taskChild = Start-Process -FilePath $taskNode -ArgumentList ('"' + $taskEntry + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLogDir 'dsh.out.log') -RedirectStandardError (Join-Path $taskLogDir 'dsh.err.log')
    @{ pid = $taskChild.Id; entry = $taskEntry } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskLogDir 'dsh.pid.json') -Encoding UTF8
    $taskChild.WaitForExit()
    # Avoid a busy restart loop if a saved edit or a dependency prevents boot.
    Start-Sleep -Seconds 30
  }
} finally {
  if ($taskOwned) { $taskMutex.ReleaseMutex() }
  $taskMutex.Dispose()
}
