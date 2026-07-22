/**
 * Generate placeholder PWA icons (no external deps) as valid PNGs.
 * Draws a charcoal background with a warm forge-orange flame mark.
 * Run: node scripts/generate-icons.mjs
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(OUT, { recursive: true });

const BG = [15, 13, 11]; // #0f0d0b charcoal
const ORANGE = [242, 118, 28]; // forge orange
const ORANGE_DK = [201, 90, 18];

function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/** Simple flame silhouette test: is (x,y) inside a stylized flame centered in [0..1]? */
function inFlame(nx, ny) {
  // nx,ny in [-1,1], y up. Flame: teardrop — wide bottom, pointed top.
  const x = nx;
  const y = ny;
  // width envelope narrows toward the top
  const top = 0.92;
  const bottom = -0.82;
  if (y > top || y < bottom) return false;
  const t = (y - bottom) / (top - bottom); // 0 bottom -> 1 top
  const halfWidth = 0.62 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.05)) * (1 - 0.25 * t);
  // add an inner curl notch
  const wobble = 0.05 * Math.sin(t * 6);
  return Math.abs(x + wobble * 0.4) <= halfWidth;
}

function drawIcon(size, { maskable = false } = {}) {
  const scale = maskable ? 0.62 : 0.78; // maskable keeps mark inside safe zone
  const raw = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // background with a subtle radial vignette
      const dx = (x - cx) / (size / 2);
      const dy = (y - cy) / (size / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      let color = lerp(BG, [24, 20, 16], Math.max(0, 1 - dist));

      // map to flame local coords
      const nx = (x - cx) / r;
      const ny = (cy - y) / r;
      if (inFlame(nx, ny)) {
        const t = (ny + 0.82) / 1.74; // vertical gradient
        color = lerp(ORANGE_DK, ORANGE, Math.min(1, Math.max(0, t)));
      }

      raw[idx] = color[0];
      raw[idx + 1] = color[1];
      raw[idx + 2] = color[2];
      raw[idx + 3] = 255;
    }
  }
  return encodePng(size, size, raw);
}

function encodePng(width, height, rgba) {
  // Add filter byte (0) at the start of each scanline.
  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// CRC32 (PNG)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

fs.writeFileSync(path.join(OUT, "icon-192.png"), drawIcon(192));
fs.writeFileSync(path.join(OUT, "icon-512.png"), drawIcon(512));
fs.writeFileSync(path.join(OUT, "maskable-512.png"), drawIcon(512, { maskable: true }));
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), drawIcon(180));
console.log("Icons written to", OUT);
