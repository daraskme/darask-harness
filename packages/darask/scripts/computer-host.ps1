# DARASK desktop host. Line-delimited JSON on stdin/stdout. No secrets, no shell.
param(
  [string]$InputJson = ''
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$desktopSource = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class DaraskDesktop {
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
  public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
  public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
  public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
  public const uint MOUSEEVENTF_WHEEL = 0x0800;
  public const uint KEYEVENTF_KEYUP = 0x0002;
  public const uint KEYEVENTF_UNICODE = 0x0004;
  public const uint INPUT_KEYBOARD = 1;
  public const int SW_RESTORE = 9;

  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT {
    public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct MOUSEINPUT {
    public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo;
  }
  [StructLayout(LayoutKind.Explicit)]
  public struct InputUnion {
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct INPUT { public uint type; public InputUnion U; }

  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);

  public static void EnsureDpi() { try { SetProcessDPIAware(); } catch { } }

  public static string CursorJson() {
    POINT p;
    if (!GetCursorPos(out p)) throw new InvalidOperationException("cursor position is unavailable");
    return "{\"x\":" + p.X + ",\"y\":" + p.Y + "}";
  }

  public static void Move(int x, int y) {
    if (!SetCursorPos(x, y)) throw new InvalidOperationException("SetCursorPos failed");
  }

  public static void Click(int x, int y, string button, int count) {
    Move(x, y);
    System.Threading.Thread.Sleep(40);
    uint down; uint up;
    if (button == "right") { down = MOUSEEVENTF_RIGHTDOWN; up = MOUSEEVENTF_RIGHTUP; }
    else if (button == "middle") { down = MOUSEEVENTF_MIDDLEDOWN; up = MOUSEEVENTF_MIDDLEUP; }
    else { down = MOUSEEVENTF_LEFTDOWN; up = MOUSEEVENTF_LEFTUP; }
    for (int i = 0; i < count; i++) {
      mouse_event(down, 0, 0, 0, UIntPtr.Zero);
      System.Threading.Thread.Sleep(30);
      mouse_event(up, 0, 0, 0, UIntPtr.Zero);
      if (i + 1 < count) System.Threading.Thread.Sleep(80);
    }
  }

  public static void Drag(int x1, int y1, int x2, int y2) {
    Move(x1, y1);
    System.Threading.Thread.Sleep(40);
    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
    int steps = 12;
    for (int i = 1; i <= steps; i++) {
      int x = x1 + (int)Math.Round((x2 - x1) * (double)i / steps);
      int y = y1 + (int)Math.Round((y2 - y1) * (double)i / steps);
      Move(x, y);
      System.Threading.Thread.Sleep(16);
    }
    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
  }

  public static void Scroll(int x, int y, int delta) {
    Move(x, y);
    System.Threading.Thread.Sleep(30);
    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, unchecked((uint)delta), UIntPtr.Zero);
  }

  static void SendVk(ushort vk, bool up) {
    INPUT[] input = new INPUT[1];
    input[0].type = INPUT_KEYBOARD;
    input[0].U.ki.wVk = vk;
    input[0].U.ki.dwFlags = up ? KEYEVENTF_KEYUP : 0;
    if (SendInput(1, input, Marshal.SizeOf(typeof(INPUT))) == 0) throw new InvalidOperationException("SendInput failed");
  }

  static void SendUnicode(char c) {
    INPUT[] input = new INPUT[2];
    input[0].type = INPUT_KEYBOARD;
    input[0].U.ki.wScan = c;
    input[0].U.ki.dwFlags = KEYEVENTF_UNICODE;
    input[1].type = INPUT_KEYBOARD;
    input[1].U.ki.wScan = c;
    input[1].U.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
    if (SendInput(2, input, Marshal.SizeOf(typeof(INPUT))) == 0) throw new InvalidOperationException("SendInput failed");
  }

  public static void TypeText(string text) {
    foreach (char c in text) {
      if (c == '\r') continue;
      if (c == '\n') { SendVk(0x0D, false); SendVk(0x0D, true); }
      else SendUnicode(c);
      System.Threading.Thread.Sleep(8);
    }
  }

  public static ushort VirtualKey(string name) {
    switch (name.ToLowerInvariant()) {
      case "enter": case "return": return 0x0D;
      case "tab": return 0x09;
      case "esc": case "escape": return 0x1B;
      case "backspace": return 0x08;
      case "delete": case "del": return 0x2E;
      case "space": return 0x20;
      case "home": return 0x24;
      case "end": return 0x23;
      case "pageup": case "pgup": return 0x21;
      case "pagedown": case "pgdn": return 0x22;
      case "left": return 0x25;
      case "up": return 0x26;
      case "right": return 0x27;
      case "down": return 0x28;
      case "ctrl": case "control": return 0x11;
      case "alt": return 0x12;
      case "shift": return 0x10;
      case "win": case "meta": case "super": return 0x5B;
      case "caps": case "capslock": return 0x14;
      case "insert": return 0x2D;
      default:
        if (name.Length == 2 && (name[0] == 'f' || name[0] == 'F') && name[1] >= '1' && name[1] <= '9')
          return (ushort)(0x70 + (name[1] - '1'));
        if (name.Length == 3 && (name[0] == 'f' || name[0] == 'F') && name.Substring(1) == "10") return 0x79;
        if (name.Length == 3 && (name[0] == 'f' || name[0] == 'F') && name.Substring(1) == "11") return 0x7A;
        if (name.Length == 3 && (name[0] == 'f' || name[0] == 'F') && name.Substring(1) == "12") return 0x7B;
        if (name.Length == 1) {
          char ch = name.ToUpperInvariant()[0];
          if (ch >= 'A' && ch <= 'Z') return (ushort)ch;
          if (ch >= '0' && ch <= '9') return (ushort)ch;
        }
        throw new ArgumentException("unsupported key");
    }
  }

  public static void Key(string[] names) {
    ushort[] vks = new ushort[names.Length];
    for (int i = 0; i < names.Length; i++) vks[i] = VirtualKey(names[i]);
    for (int i = 0; i < vks.Length; i++) SendVk(vks[i], false);
    System.Threading.Thread.Sleep(20);
    for (int i = vks.Length - 1; i >= 0; i--) SendVk(vks[i], true);
  }

  public static string ListWindowsJson() {
    List<string> items = new List<string>();
    EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
      if (!IsWindowVisible(hWnd)) return true;
      StringBuilder sb = new StringBuilder(512);
      if (GetWindowText(hWnd, sb, sb.Capacity) <= 0) return true;
      string title = sb.ToString();
      if (string.IsNullOrWhiteSpace(title)) return true;
      RECT r;
      if (!GetWindowRect(hWnd, out r)) return true;
      int w = r.Right - r.Left; int h = r.Bottom - r.Top;
      if (w < 8 || h < 8) return true;
      uint pid;
      GetWindowThreadProcessId(hWnd, out pid);
      string escaped = title.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", " ").Replace("\n", " ");
      if (escaped.Length > 200) escaped = escaped.Substring(0, 200);
      items.Add("{\"hwnd\":\"" + hWnd.ToInt64() + "\",\"title\":\"" + escaped + "\",\"x\":" + r.Left + ",\"y\":" + r.Top + ",\"width\":" + w + ",\"height\":" + h + ",\"pid\":" + pid + "}");
      return items.Count < 80;
    }, IntPtr.Zero);
    return "[" + string.Join(",", items.ToArray()) + "]";
  }

  public static bool FocusHwnd(long hwndValue) {
    IntPtr hWnd = new IntPtr(hwndValue);
    if (!IsWindow(hWnd)) return false;
    if (IsIconic(hWnd)) ShowWindow(hWnd, SW_RESTORE);
    IntPtr foreground = GetForegroundWindow();
    uint fgPid;
    uint fgThread = GetWindowThreadProcessId(foreground, out fgPid);
    uint self = GetCurrentThreadId();
    AttachThreadInput(self, fgThread, true);
    BringWindowToTop(hWnd);
    bool ok = SetForegroundWindow(hWnd);
    AttachThreadInput(self, fgThread, false);
    return ok;
  }
}
'@

Add-Type -TypeDefinition $desktopSource -Language CSharp
[DaraskDesktop]::EnsureDpi()

function Write-Result($object) {
  $json = $object | ConvertTo-Json -Compress -Depth 6
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

function Fail($message) {
  Write-Result ([pscustomobject]@{ ok = $false; error = [string]$message })
}

function Get-Prop($object, $name, $default = $null) {
  if ($null -eq $object) { return $default }
  $prop = $object.PSObject.Properties[$name]
  if ($null -eq $prop) { return $default }
  return $prop.Value
}

. (Join-Path $PSScriptRoot 'computer-uia.ps1')

function Invoke-Op($op) {
  if ([string]$op.op -in @('inspect','invoke','set_value','select','toggle')) {
    return Invoke-UiaAction $op
  }
  $name = [string](Get-Prop $op 'op')
  if ($name -eq 'ping') {
    return [pscustomobject]@{ ok = $true; op = 'ping' }
  }
  if ($name -eq 'cursor') {
    $cursor = [DaraskDesktop]::CursorJson() | ConvertFrom-Json
    return [pscustomobject]@{ ok = $true; op = 'cursor'; x = [int]$cursor.x; y = [int]$cursor.y }
  }
  if ($name -eq 'screenshot') {
    $path = [string](Get-Prop $op 'path')
    $maxDimension = [int](Get-Prop $op 'maxDimension' 1280)
    if ([string]::IsNullOrWhiteSpace($path)) { throw 'screenshot path is required' }
    if ($maxDimension -lt 320 -or $maxDimension -gt 2560) { throw 'maxDimension is out of range' }
    $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $bitmap = New-Object System.Drawing.Bitmap ([int]$vs.Width), ([int]$vs.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CopyFromScreen([int]$vs.Left, [int]$vs.Top, 0, 0, $bitmap.Size)
    } finally {
      $graphics.Dispose()
    }
    $originX = [int]$vs.Left
    $originY = [int]$vs.Top
    $width = [int]$bitmap.Width
    $height = [int]$bitmap.Height
    $scale = 1.0
    $longest = [Math]::Max($width, $height)
    $imageWidth = $width
    $imageHeight = $height
    $scaleX = 1.0
    $scaleY = 1.0
    try {
      if ($longest -gt $maxDimension) {
        $scale = $maxDimension / $longest
        $imageWidth = [Math]::Max(1, [int][Math]::Round($width * $scale))
        $imageHeight = [Math]::Max(1, [int][Math]::Round($height * $scale))
        $scaled = New-Object System.Drawing.Bitmap $imageWidth, $imageHeight
        $g2 = [System.Drawing.Graphics]::FromImage($scaled)
        try {
          $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $g2.DrawImage($bitmap, 0, 0, $imageWidth, $imageHeight)
        } finally { $g2.Dispose() }
        $scaled.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $scaled.Dispose()
        $scaleX = $width / $imageWidth
        $scaleY = $height / $imageHeight
      } else {
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
      }
    } finally { $bitmap.Dispose() }
    $cursor = [DaraskDesktop]::CursorJson() | ConvertFrom-Json
    return [pscustomobject]@{
      ok = $true
      op = 'screenshot'
      originX = $originX
      originY = $originY
      width = $width
      height = $height
      imageWidth = $imageWidth
      imageHeight = $imageHeight
      scaleX = $scaleX
      scaleY = $scaleY
      cursorX = [int]$cursor.x
      cursorY = [int]$cursor.y
      path = $path
    }
  }
  if ($name -eq 'move') {
    [DaraskDesktop]::Move([int](Get-Prop $op 'x'), [int](Get-Prop $op 'y'))
    return [pscustomobject]@{ ok = $true; op = 'move' }
  }
  if ($name -eq 'click') {
    $button = [string](Get-Prop $op 'button' 'left')
    $count = [int](Get-Prop $op 'clicks' 1)
    [DaraskDesktop]::Click([int](Get-Prop $op 'x'), [int](Get-Prop $op 'y'), $button, $count)
    return [pscustomobject]@{ ok = $true; op = 'click' }
  }
  if ($name -eq 'drag') {
    [DaraskDesktop]::Drag([int](Get-Prop $op 'x'), [int](Get-Prop $op 'y'), [int](Get-Prop $op 'x2'), [int](Get-Prop $op 'y2'))
    return [pscustomobject]@{ ok = $true; op = 'drag' }
  }
  if ($name -eq 'scroll') {
    [DaraskDesktop]::Scroll([int](Get-Prop $op 'x'), [int](Get-Prop $op 'y'), [int](Get-Prop $op 'delta'))
    return [pscustomobject]@{ ok = $true; op = 'scroll' }
  }
  if ($name -eq 'type') {
    [DaraskDesktop]::TypeText([string](Get-Prop $op 'text'))
    return [pscustomobject]@{ ok = $true; op = 'type' }
  }
  if ($name -eq 'key') {
    $keys = @(Get-Prop $op 'keys')
    $names = @()
    foreach ($item in $keys) { $names += [string]$item }
    [DaraskDesktop]::Key($names)
    return [pscustomobject]@{ ok = $true; op = 'key' }
  }
  if ($name -eq 'windows') {
    $raw = [DaraskDesktop]::ListWindowsJson()
    if ([string]::IsNullOrWhiteSpace($raw)) { $raw = '[]' }
    return [pscustomobject]@{ ok = $true; op = 'windows'; windowsJson = $raw }
  }
  if ($name -eq 'focus') {
    $hwnd = Get-Prop $op 'hwnd'
    $title = [string](Get-Prop $op 'title')
    $raw = [DaraskDesktop]::ListWindowsJson()
    $windows = @()
    if ($raw -and $raw -ne '[]') { $windows = @(ConvertFrom-Json $raw) }
    $target = $null
    if ($null -ne $hwnd -and [string]$hwnd -ne '') {
      foreach ($window in $windows) {
        if ([string]$window.hwnd -eq [string]$hwnd) { $target = $window; break }
      }
    } elseif ($title) {
      $needle = $title.ToLowerInvariant()
      foreach ($window in $windows) {
        $current = [string]$window.title
        if ($current.ToLowerInvariant() -eq $needle) { $target = $window; break }
      }
      if ($null -eq $target) {
        $best = -1
        foreach ($window in $windows) {
          $current = [string]$window.title
          if ($current.ToLowerInvariant().Contains($needle) -and $current.Length -gt $best) {
            $target = $window
            $best = $current.Length
          }
        }
      }
    }
    if ($null -eq $target) { throw 'no matching visible window' }
    $ok = [DaraskDesktop]::FocusHwnd([int64]$target.hwnd)
    if (-not $ok) { throw 'the window could not be focused (Windows may block background focus)' }
    return [pscustomobject]@{ ok = $true; op = 'focus'; hwnd = [string]$target.hwnd; title = [string]$target.title }
  }
  throw "unsupported op"
}

function Invoke-Safe($line) {
  try {
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    $op = $line | ConvertFrom-Json
    Write-Result (Invoke-Op $op)
  } catch {
    $text = [string]$_.Exception.Message
    if ([string]::IsNullOrWhiteSpace($text)) { $text = 'desktop host failed' }
    Fail ($text.Substring(0, [Math]::Min(180, $text.Length)))
  }
}

if ($InputJson) {
  Invoke-Safe $InputJson
  exit 0
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  Invoke-Safe $line
}
