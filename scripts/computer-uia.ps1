# Included lazily by computer-host.ps1. UI Automation never falls back to mouse input.
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName UIAutomationClientsideProviders
# A compiled caller is required by .NET Framework's proxy assembly discovery.
# A PowerShell dynamic call has no ReflectedType and breaks LoadDefaultProxies.
Add-Type -ReferencedAssemblies ([System.Windows.Automation.AutomationElement].Assembly.Location) -TypeDefinition @'
public static class DaraskUiaBootstrap {
  [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
  public static void Initialize() {
    System.Windows.Automation.ClientSettings.RegisterClientSideProviderAssembly(
      new System.Reflection.AssemblyName("UIAutomationClientsideProviders, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35"));
  }
}
'@
[DaraskUiaBootstrap]::Initialize()
$script:UiaElements = @{}
$script:UiaSnapshot = ''
$script:UiaCaptured = [datetime]::MinValue

function Assert-UiaWindow($element) {
  $name = [Diagnostics.Process]::GetProcessById($element.Current.ProcessId).ProcessName
  if ($name -match '^(chrome|msedge|firefox|brave|opera|vivaldi|iexplore)$') { throw 'ブラウザ操作には Kitesurf を使ってください。' }
}
function Get-UiaSnapshot($op) {
  $handle = [int64](Get-Prop $op 'hwnd' 0)
  if ($handle -eq 0) { throw 'windows で取得した hwnd を指定してください。' }
  $root = [System.Windows.Automation.AutomationElement]::FromHandle([intptr]$handle)
  if ($null -eq $root -or $root.Current.IsOffscreen) { throw '対象ウィンドウを取得できません。' }
  Assert-UiaWindow $root
  $script:UiaElements = @{}
  $script:UiaSnapshot = [guid]::NewGuid().ToString()
  $script:UiaCaptured = [datetime]::UtcNow
  $script:UiaHwnd = [string]$handle
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $queue = New-Object System.Collections.Queue
  $queue.Enqueue(@{element=$root; depth=0})
  $items = New-Object System.Collections.Generic.List[object]
  $timer = [Diagnostics.Stopwatch]::StartNew()
  $count = 0
  while ($queue.Count -gt 0 -and $count -lt 300 -and $timer.ElapsedMilliseconds -lt 3000) {
    $entry = $queue.Dequeue(); $element = $entry.element; $count++
    try {
      $info = $element.Current
      if (-not $info.IsOffscreen) {
        $id = [string]$items.Count
        $patterns = @(); $value = $null
        if (-not $info.IsPassword) {
          foreach ($pair in @(@('invoke',[System.Windows.Automation.InvokePattern]::Pattern),@('set_value',[System.Windows.Automation.ValuePattern]::Pattern),@('select',[System.Windows.Automation.SelectionItemPattern]::Pattern),@('toggle',[System.Windows.Automation.TogglePattern]::Pattern))) {
            $pattern = $null
            if ($element.TryGetCurrentPattern($pair[1],[ref]$pattern)) { $patterns += $pair[0]; if($pair[0] -eq 'set_value'){$value=[string]$pattern.Current.Value} }
          }
        }
        $label = if($info.IsPassword){'保護された入力欄'}else{[string]$info.Name}
        $bounds = $info.BoundingRectangle
        $item = [ordered]@{id=$id;role=$info.ControlType.ProgrammaticName.Replace('ControlType.','');name=$label.Substring(0,[Math]::Min(200,$label.Length));enabled=$info.IsEnabled;password=$info.IsPassword;actions=@($patterns);depth=$entry.depth}
        if($null -ne $value){$item.value=$value.Substring(0,[Math]::Min(500,$value.Length))}
        if(-not $bounds.IsEmpty){$item.bounds=@{x=[int]$bounds.X;y=[int]$bounds.Y;width=[int]$bounds.Width;height=[int]$bounds.Height}}
        $items.Add($item)
        $script:UiaElements[$id] = @{element=$element;runtime=($element.GetRuntimeId() -join ',')}
      }
      if($entry.depth -lt 12 -and -not $info.IsPassword){
        $child=$walker.GetFirstChild($element)
        while($null -ne $child -and $queue.Count -lt 300 -and $timer.ElapsedMilliseconds -lt 3000){$queue.Enqueue(@{element=$child;depth=$entry.depth+1});$child=$walker.GetNextSibling($child)}
      }
    } catch [System.Windows.Automation.ElementNotAvailableException] { continue }
  }
  return [pscustomobject]@{ok=$true;op='inspect';snapshotId=$script:UiaSnapshot;hwnd=$script:UiaHwnd;title=[string]$root.Current.Name;elements=@($items.ToArray());truncated=($queue.Count -gt 0)}
}
function Invoke-UiaAction($op) {
  if($op.op -eq 'inspect'){return Get-UiaSnapshot $op}
  if([string]$op.snapshotId -ne $script:UiaSnapshot -or ([datetime]::UtcNow-$script:UiaCaptured).TotalSeconds -gt 60){throw '画面情報が古くなりました。inspect で再取得してください。'}
  $entry=$script:UiaElements[[string]$op.elementId]
  if($null -eq $entry){throw '要素 ID がありません。inspect で再取得してください。'}
  $element=$entry.element
  Assert-UiaWindow $element
  if(($element.GetRuntimeId() -join ',') -ne $entry.runtime -or -not $element.Current.IsEnabled -or $element.Current.IsOffscreen -or $element.Current.IsPassword){throw '対象要素は現在操作できません。inspect で再取得してください。'}
  $pattern=$null; $effect='unverified'
  # Consume the snapshot before dispatch: an uncertain result must never be replayed blindly.
  $script:UiaSnapshot=''
  switch([string]$op.op){
    'invoke' {if(-not $element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)){throw 'この要素は invoke 非対応です。'};$pattern.Invoke()}
    'set_value' {if(-not $element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern) -or $pattern.Current.IsReadOnly){throw 'この要素は値を変更できません。'};$pattern.SetValue([string]$op.text);if($pattern.Current.Value -ceq [string]$op.text){$effect='confirmed'}}
    'select' {if(-not $element.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$pattern)){throw 'この要素は select 非対応です。'};$pattern.Select();if($pattern.Current.IsSelected){$effect='confirmed'}}
    'toggle' {if(-not $element.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern,[ref]$pattern)){throw 'この要素は toggle 非対応です。'};$before=$pattern.Current.ToggleState;$pattern.Toggle();if($pattern.Current.ToggleState -ne $before){$effect='confirmed'}}
    default {throw '未対応の要素操作です。'}
  }
  $result=Get-UiaSnapshot ([pscustomobject]@{hwnd=$script:UiaHwnd})
  $result | Add-Member -NotePropertyName effect -NotePropertyValue $effect
  return $result
}
