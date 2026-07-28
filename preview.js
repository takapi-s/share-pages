const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '_': ['00000','00000','00000','00000','00000','00000','11111'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'],
  '/': ['00001','00010','00100','01000','10000','00000','00000'],
  '(': ['00010','00100','01000','01000','01000','00100','00010'],
  ')': ['01000','00100','00010','00010','00010','00100','01000'],
  '#': ['01010','11111','01010','01010','11111','01010','00000'],
  '?': ['01110','10001','00001','00010','00100','00000','00100'],
  '!': ['00100','00100','00100','00100','00100','00000','00100'],
  ',': ['00000','00000','00000','00000','01100','01100','01000'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'], '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'], '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'], '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'], '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'], '9': ['01110','10001','10001','01111','00001','00001','01110'],
};
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const upper = ['01110,10001,10001,11111,10001,10001,10001','11110,10001,10001,11110,10001,10001,11110','01110,10001,10000,10000,10000,10001,01110','11110,10001,10001,10001,10001,10001,11110','11111,10000,10000,11110,10000,10000,11111','11111,10000,10000,11110,10000,10000,10000','01110,10001,10000,10111,10001,10001,01110','10001,10001,10001,11111,10001,10001,10001','01110,00100,00100,00100,00100,00100,01110','00111,00010,00010,00010,00010,10010,01100','10001,10010,10100,11000,10100,10010,10001','10000,10000,10000,10000,10000,10000,11111','10001,11011,10101,10101,10001,10001,10001','10001,11001,10101,10011,10001,10001,10001','01110,10001,10001,10001,10001,10001,01110','11110,10001,10001,11110,10000,10000,10000','01110,10001,10001,10001,10101,10010,01101','11110,10001,10001,11110,10100,10010,10001','01111,10000,10000,01110,00001,00001,11110','11111,00100,00100,00100,00100,00100,00100','10001,10001,10001,10001,10001,10001,01110','10001,10001,10001,10001,10001,01010,00100','10001,10001,10101,10101,10101,11011,10001','10001,10001,01010,00100,01010,10001,10001','10001,10001,01010,00100,00100,00100,00100','11111,00001,00010,00100,01000,10000,11111'];
for (let i = 0; i < alphabet.length; i++) FONT[alphabet[i]] = upper[i].split(',');
function glyph(ch) { return FONT[ch] || FONT[ch.toUpperCase()] || FONT['?']; }
export function youtubeThumbnailUrl(source) {
  const value = String(source);
  const match = value.match(/(?:youtube\.com\/(?:watch\?[^\s"'<>]*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function excerpt(source, type) {
  let text = String(source);
  if (type === 'text/html') {
    text = text.replace(/<(style|script|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
    text = text.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"');
  } else {
    text = text.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~|-]/g, ' ');
  }
  return text.replace(/https?:\/\/\S+/g, 'LINK').replace(/\s+/g, ' ').trim().slice(0, 150);
}
function asciiText(value, fallback) {
  const text = String(value).replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim();
  return text || fallback;
}
function drawText(pixels, width, text, x, y, scale, color) {
  let cursor = x;
  for (const ch of String(text).slice(0, Math.floor((width - x) / (6 * scale)))) {
    const rows = glyph(ch);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) if (rows[row][col] === '1') for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = cursor + col * scale + dx, py = y + row * scale + dy;
      if (px >= 0 && px < width && py >= 0 && py < pixels.length / 3) { const i = (py * width + px) * 3; pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; }
    }
    cursor += 6 * scale;
  }
}
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const bytes = new Uint8Array(12 + data.length), view = new DataView(bytes.buffer); view.setUint32(0, data.length); bytes.set(type.split('').map(ch => ch.charCodeAt(0)), 4); bytes.set(data, 8); view.setUint32(8 + data.length, crc32(bytes.subarray(4, 8 + data.length))); return bytes; }
function png(width, height, pixels) {
  const palette = [[11,16,32],[52,69,111],[247,248,255],[198,208,232],[130,148,198]];
  const raw = new Uint8Array(height * (1 + width));
  for (let y = 0; y < height; y++) { raw[y * (1 + width)] = 0; for (let x = 0; x < width; x++) { const i = (y * width + x) * 3; let color = 0; for (let p = 1; p < palette.length; p++) if (pixels[i] === palette[p][0] && pixels[i + 1] === palette[p][1] && pixels[i + 2] === palette[p][2]) color = p; raw[y * (1 + width) + x + 1] = color; } }
  const blocks = []; let offset = 0; while (offset < raw.length) { const size = Math.min(65535, raw.length - offset), block = new Uint8Array(5 + size); block[0] = offset + size >= raw.length ? 1 : 0; block[1] = size & 255; block[2] = size >>> 8; block[3] = (~size) & 255; block[4] = (~size) >>> 8; block.set(raw.subarray(offset, offset + size), 5); blocks.push(block); offset += size; }
  const deflate = new Uint8Array(2 + blocks.reduce((n, b) => n + b.length, 0) + 4); deflate.set([0x78, 0x01]); let p = 2; for (const block of blocks) { deflate.set(block, p); p += block.length; } let a = 1, b = 0; for (const value of raw) { a = (a + value) % 65521; b = (b + a) % 65521; } new DataView(deflate.buffer).setUint32(p, (b << 16) | a);
  const header = new Uint8Array(13); new DataView(header.buffer).setUint32(0, width); new DataView(header.buffer).setUint32(4, height); header[8] = 8; header[9] = 3; const plte = new Uint8Array(palette.flat()); const signature = new Uint8Array([137,80,78,71,13,10,26,10]); const ihdr = chunk('IHDR', header), paletteChunk = chunk('PLTE', plte), idat = chunk('IDAT', deflate), iend = chunk('IEND', new Uint8Array()); const out = new Uint8Array(signature.length + ihdr.length + paletteChunk.length + idat.length + iend.length); out.set(signature); out.set(ihdr, signature.length); out.set(paletteChunk, signature.length + ihdr.length); out.set(idat, signature.length + ihdr.length + paletteChunk.length); out.set(iend, signature.length + ihdr.length + paletteChunk.length + idat.length); return out;
}
export function previewPng(page, source) {
  const width = 1200, height = 630, pixels = new Uint8Array(width * height * 3); pixels.fill(0); for (let i = 0; i < pixels.length; i += 3) { pixels[i] = 11; pixels[i + 1] = 16; pixels[i + 2] = 32; } for (let y = 48; y < 582; y++) for (let x = 48; x < 1152; x++) if (x < 52 || x > 1147 || y < 52 || y > 577) { const i = (y * width + x) * 3; pixels[i] = 52; pixels[i + 1] = 69; pixels[i + 2] = 111; }
  const isHtml = page.mime === 'text/html' || page.contentType === 'text/html'; const title = asciiText(page.originalName || 'SHARE-PAGES', 'SHARE-PAGES').slice(0, 52); const body = asciiText(excerpt(source, page.mime || page.contentType), isHtml ? 'HTML PAGE - OPEN LINK TO VIEW' : 'MARKDOWN PAGE'); drawText(pixels, width, title, 72, 112, 5, [247, 248, 255]); for (let i = 0; i < 3; i++) drawText(pixels, width, body.slice(i * 62, (i + 1) * 62), 72, 270 + i * 52, 3, [198, 208, 232]); drawText(pixels, width, `share-pages / ${isHtml ? 'HTML' : 'MARKDOWN'}`, 72, 520, 2, [130, 148, 198]); return png(width, height, pixels);
}
