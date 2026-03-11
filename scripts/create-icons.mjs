/**
 * Icon generator for NotebookLM Companion.
 *
 * Creates 16×16, 48×48, and 128×128 PNG icons in the assets/ directory.
 * Uses pure Node.js (no external dependencies) with a minimal PNG encoder.
 *
 * The icons are simple blue rounded-square book emojis.
 * Replace the PNG files in assets/ with your own artwork for production.
 *
 * Run: node scripts/create-icons.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { createDeflate } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, Writable } from 'stream';

// ─── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── PNG chunk writer ─────────────────────────────────────────────────────────

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBytes.length, 0);
  const crcInput = Buffer.concat([typeBytes, dataBytes]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, dataBytes, crcBuf]);
}

// ─── Deflate helper ───────────────────────────────────────────────────────────

function deflate(input) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const deflater = createDeflate({ level: 6 });
    deflater.on('data', (c) => chunks.push(c));
    deflater.on('end', () => resolve(Buffer.concat(chunks)));
    deflater.on('error', reject);
    deflater.write(input);
    deflater.end();
  });
}

// ─── PNG builder ──────────────────────────────────────────────────────────────

async function createPNG(size, drawFn) {
  // Raw RGBA scanlines (each starts with a filter byte = 0)
  const raw = Buffer.alloc(size * (1 + size * 4), 0);

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawFn(x, y, size);
      const off = y * (1 + size * 4) + 1 + x * 4;
      raw[off]     = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  const idat = await deflate(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);    // width
  ihdr.writeUInt32BE(size, 4);    // height
  ihdr[8]  = 8;                   // bit depth
  ihdr[9]  = 6;                   // color type: RGBA
  ihdr[10] = 0;                   // compression
  ihdr[11] = 0;                   // filter
  ihdr[12] = 0;                   // interlace: none

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon design ──────────────────────────────────────────────────────────────

/**
 * Draws a blue rounded-square icon with a white "book" symbol.
 * Returns [r, g, b, a] for each pixel.
 */
function iconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.18; // corner radius as fraction of size
  const margin = size * 0.08;

  // Rounded rectangle test
  const rx = Math.max(0, Math.abs(x - cx + 0.5) - (size / 2 - margin - radius));
  const ry = Math.max(0, Math.abs(y - cy + 0.5) - (size / 2 - margin - radius));
  const dist = Math.sqrt(rx * rx + ry * ry);

  const inShape = dist <= radius;

  if (!inShape) return [0, 0, 0, 0]; // transparent outside

  // Background: Google Blue gradient (top = lighter, bottom = darker)
  const t = y / size;
  const bgR = Math.round(26  + t * 10);  // #1a73e8 → #2461d4
  const bgG = Math.round(115 - t * 20);
  const bgB = Math.round(232 - t * 30);

  // Book lines (white stripes) — only at larger sizes
  if (size >= 32) {
    const relY = (y - margin) / (size - margin * 2);
    const relX = (x - margin * 1.5) / (size - margin * 3);

    // Vertical spine line
    if (relX >= 0.45 && relX <= 0.55 && relY >= 0.15 && relY <= 0.85) {
      return [255, 255, 255, 200];
    }

    // Horizontal page lines
    const linePositions = [0.3, 0.45, 0.6, 0.72];
    for (const lp of linePositions) {
      if (Math.abs(relY - lp) < (size >= 48 ? 0.04 : 0.05) && relX > 0.15 && relX < 0.43) {
        return [255, 255, 255, 180];
      }
      if (Math.abs(relY - lp) < (size >= 48 ? 0.04 : 0.05) && relX > 0.57 && relX < 0.85) {
        return [255, 255, 255, 180];
      }
    }
  }

  return [bgR, bgG, bgB, 255];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync('assets', { recursive: true });

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const png = await createPNG(size, iconPixel);
    const path = `assets/icon${size}.png`;
    writeFileSync(path, png);
    console.log(`[icons] Created ${path} (${png.length} bytes)`);
  }

  console.log('[icons] Done. Replace assets/icon*.png with custom artwork for production.');
}

main().catch((err) => {
  console.error('[icons] Failed:', err);
  process.exit(1);
});
