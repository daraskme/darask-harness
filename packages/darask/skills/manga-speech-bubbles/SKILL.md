---
name: manga-speech-bubbles
description: Put specified dialogue into empty manga speech balloons without redrawing the page. Use when the user wants 吹き出し埋め, lettering, or filling blank comic balloons.
whenToUse: The user attached or named a manga/comic page with empty white balloons and wants specific strings placed neatly inside them.
---

# manga-speech-bubbles

Fill **empty** speech balloons with the user's exact lines. Do **not** regenerate the page with GPT Image / Grok Imagine unless they explicitly ask for a full redraw (that usually wrecks lineart).

## Inputs

1. The page image (attachment path or workspace file).
2. Dialogue lines in order. One line per balloon. Extra `\n` inside a line is a forced wrap.
3. Reading order: default **left-to-right, top-to-bottom** (scanlation boxes). If they say 右から / 本誌順, set `--rtl`.
4. Color (optional). Default `#000000`. `--color` for all balloons, or `--colors` one value per balloon (`#c41e3a`, `red`, `rgb(196,30,58)`).
5. Font (optional). Default **しっぽりアンチック / Shippori Antique** from `skills/manga-speech-bubbles/fonts/ShipporiAntique-Regular.ttf`. Override with `--font` (installed family) or `--font-file`.

Number balloons before drawing. If the count of lines ≠ empty balloons, stop and ask which box maps to which line. Do not invent dialogue.

## How to letter

```text
node skills/manga-speech-bubbles/letter.mjs --image <page.png> --out <page-lettered.png> --lines "台詞1" "台詞2" --boxes 40,40,180,120 820,40,180,120 --color #000000
```

Per-balloon colors:

```text
--colors "#000000" red "#1a1a1a"
```

The helper wraps CJK from box aspect, centers Shippori Antique (regular, not bold), and leaves existing SFX alone. If boxes are wrong, inspect `read_image` and pass explicit `--boxes`.

## Do not

- Do not inpaint the whole page.
- Do not translate unless asked.
- Do not fill SFX bursts or the picture frame; only empty dialogue rectangles.
- No sexual content of minors; if a page is that, refuse.

## After

Show the output path, font, and colors used. Mention balloon count vs line count.
