/** Wrap CJK-friendly dialogue into balloon lines. */

export function wrapBalloonText(text, maxCharsPerLine = 8) {
  const raw = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];
  if (raw.includes('\n')) return raw.split('\n').map(line => line.trim()).filter(Boolean);
  const chars = [...raw];
  const lines = [];
  for (let i = 0; i < chars.length; i += maxCharsPerLine) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(''));
  }
  return lines;
}

export function fitCharsPerLine(text, boxWidth, boxHeight) {
  const chars = [...String(text ?? '').replace(/\s+/g, '')];
  if (!chars.length) return 4;
  const aspect = Math.max(0.4, Number(boxWidth) / Math.max(1, Number(boxHeight)));
  const guess = aspect >= 1.6 ? Math.max(6, Math.ceil(chars.length / 2)) : aspect >= 1 ? 8 : 4;
  return Math.min(14, Math.max(3, guess));
}

/** Sort empty balloons: same row if vertical overlap > 40%, then left-to-right. Rows top-to-bottom. */
export function sortBalloons(boxes, { mangaRtl = false } = {}) {
  const list = [...boxes];
  list.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const box of list) {
    const row = rows.find(group => {
      const ref = group[0];
      const overlap = Math.min(ref.y + ref.h, box.y + box.h) - Math.max(ref.y, box.y);
      return overlap > Math.min(ref.h, box.h) * 0.4;
    });
    if (row) row.push(box);
    else rows.push([box]);
  }
  for (const row of rows) row.sort((a, b) => (mangaRtl ? b.x - a.x : a.x - b.x));
  return rows.flat();
}

export function assignLines(boxes, lines, options) {
  const ordered = sortBalloons(boxes, options);
  return ordered.map((box, index) => ({
    ...box,
    text: lines[index] == null ? '' : String(lines[index]),
  }));
}

const NAMED_COLORS = {
  black: '#000000',
  white: '#ffffff',
  red: '#c41e3a',
  orange: '#e67e22',
  pink: '#e91e8c',
  brown: '#5c3317',
  gray: '#444444',
  grey: '#444444',
};

export function parseColor(value, fallback = '#000000') {
  const raw = String(value ?? '').trim();
  if (!raw) return parseHex(fallback);
  const named = NAMED_COLORS[raw.toLowerCase()];
  if (named) return parseHex(named);
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return { r: clampByte(rgb[1]), g: clampByte(rgb[2]), b: clampByte(rgb[3]), hex: toHex(clampByte(rgb[1]), clampByte(rgb[2]), clampByte(rgb[3])) };
  return parseHex(raw.startsWith('#') ? raw : `#${raw}`, fallback);
}

function parseHex(value, fallback = '#000000') {
  let hex = String(value).replace('#', '').trim();
  if (hex.length === 3) hex = [...hex].map(ch => ch + ch).join('');
  if (!/^[0-9a-fA-F]{6}/.test(hex)) return parseHex(fallback, '#000000');
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return { r, g, b, hex: toHex(r, g, b) };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Number(value) || 0));
}

function toHex(r, g, b) {
  return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
}

export const DEFAULT_LETTER_FONT = 'Shippori Antique';
export const DEFAULT_LETTER_COLOR = '#000000';
