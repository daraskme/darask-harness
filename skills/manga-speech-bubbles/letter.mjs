#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LETTER_COLOR,
  DEFAULT_LETTER_FONT,
  assignLines,
  fitCharsPerLine,
  parseColor,
  wrapBalloonText,
} from '../../src/manga-letter.mjs';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
export const SHIPPORI_FONT_FILE = resolve(SKILL_DIR, 'fonts/ShipporiAntique-Regular.ttf');

export function parseArgs(argv) {
  const out = {
    lines: [],
    boxes: [],
    colors: [],
    rtl: false,
    image: '',
    output: '',
    color: DEFAULT_LETTER_COLOR,
    font: DEFAULT_LETTER_FONT,
    fontFile: SHIPPORI_FONT_FILE,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--image') out.image = argv[++i];
    else if (arg === '--out' || arg === '--output') out.output = argv[++i];
    else if (arg === '--rtl') out.rtl = true;
    else if (arg === '--color') out.color = argv[++i];
    else if (arg === '--font') out.font = argv[++i];
    else if (arg === '--font-file') out.fontFile = argv[++i];
    else if (arg === '--lines') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.lines.push(argv[++i]);
    } else if (arg === '--colors') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.colors.push(argv[++i]);
    } else if (arg === '--boxes') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        const [x, y, w, h] = argv[++i].split(',').map(Number);
        out.boxes.push({ x, y, w, h });
      }
    }
  }
  return out;
}

function psLetterScript() {
  return `
param([string]$Image,[string]$Output,[string]$Json,[string]$FontFile,[string]$FontName)
Add-Type -AssemblyName System.Drawing
$data = $Json | ConvertFrom-Json
$bmp = [System.Drawing.Bitmap]::FromFile($Image)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$collection = New-Object System.Drawing.Text.PrivateFontCollection
$family = $null
if ($FontFile -and (Test-Path -LiteralPath $FontFile)) {
  $collection.AddFontFile((Resolve-Path -LiteralPath $FontFile).Path)
  $family = $collection.Families[0]
}
if (-not $family) {
  $names = @($FontName, 'Shippori Antique', 'しっぽりアンチック', 'Yu Gothic UI', 'Meiryo')
  foreach ($name in $names) {
    try { $family = New-Object System.Drawing.FontFamily $name; break } catch {}
  }
}
if (-not $family) { $family = [System.Drawing.FontFamily]::GenericSansSerif }
foreach ($item in $data) {
  $text = [string]$item.text
  if (-not $text) { continue }
  $pad = [Math]::Max(6, [Math]::Min($item.w, $item.h) * 0.08)
  $rect = New-Object System.Drawing.RectangleF (($item.x + $pad), ($item.y + $pad), ($item.w - 2*$pad), ($item.h - 2*$pad))
  $size = [Math]::Max(10, [Math]::Min(36, [Math]::Floor($item.h / ([Math]::Max(1, $item.lines.Count) + 1.2))))
  $font = $null
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $body = ($item.lines -join [Environment]::NewLine)
  $color = [System.Drawing.Color]::FromArgb(255, [int]$item.color.r, [int]$item.color.g, [int]$item.color.b)
  $brush = New-Object System.Drawing.SolidBrush $color
  for ($s = $size; $s -ge 9; $s--) {
    if ($font) { $font.Dispose() }
    $font = New-Object System.Drawing.Font($family, $s, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $measured = $g.MeasureString($body, $font, $rect.Size, $sf)
    if ($measured.Width -le $rect.Width -and $measured.Height -le $rect.Height) { break }
  }
  $g.DrawString($body, $font, $brush, $rect, $sf)
  $font.Dispose()
  $brush.Dispose()
}
$g.Dispose()
$dir = Split-Path -Parent $Output
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$bmp.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output $Output
`;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.image || !args.output) {
    console.error('usage: letter.mjs --image page.png --out out.png --lines "a" "b" [--boxes x,y,w,h ...] [--color #000] [--colors #000 red] [--font "Shippori Antique"] [--font-file path.ttf] [--rtl]');
    process.exit(2);
  }
  if (!args.boxes.length) {
    console.error('Pass --boxes x,y,w,h for each empty balloon (image pixels).');
    process.exit(2);
  }
  const assigned = assignLines(args.boxes, args.lines, { mangaRtl: args.rtl });
  const fallback = parseColor(args.color, DEFAULT_LETTER_COLOR);
  const payload = assigned.map((box, index) => {
    const max = fitCharsPerLine(box.text, box.w, box.h);
    const lines = wrapBalloonText(box.text, max);
    const color = parseColor(args.colors[index] ?? args.color, fallback.hex);
    return { ...box, lines, color };
  });
  const script = resolve(tmpdir(), `dsh-manga-letter-${Date.now()}.ps1`);
  writeFileSync(script, psLetterScript(), 'utf8');
  mkdirSync(dirname(resolve(args.output)), { recursive: true });
  const fontFile = existsSync(args.fontFile) ? resolve(args.fontFile) : '';
  const result = spawnSync('pwsh', [
    '-NoProfile', '-File', script,
    '-Image', resolve(args.image),
    '-Output', resolve(args.output),
    '-Json', JSON.stringify(payload),
    '-FontFile', fontFile,
    '-FontName', args.font,
  ], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'lettering failed');
    process.exit(result.status || 1);
  }
  console.log(JSON.stringify({
    output: resolve(args.output),
    balloons: payload.length,
    font: args.font,
    fontFile: fontFile || null,
    color: fallback.hex,
  }, null, 2));
}
