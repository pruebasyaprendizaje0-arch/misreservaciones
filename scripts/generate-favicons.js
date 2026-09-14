const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 calculation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function createPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with scanline filter bytes (filter 0 = None)
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);
  for (let y = 0; y < height; y++) {
    rawData[y * scanlineLen] = 0; // filter type 0
    rgbaBuffer.copy(rawData, y * scanlineLen + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createICO(pngBuffers) {
  // pngBuffers is array of { width, height, buffer }
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(count, 4); // number of images

  let offset = 6 + count * 16;
  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

// Render Calendar Icon with high quality supersampling
function renderCalendarIcon(size) {
  const SS = 4; // 4x supersampling
  const w = size * SS;
  const h = size * SS;
  const buf = Buffer.alloc(w * h * 4);

  // Color gradient: Indigo 600 (#4f46e5) -> Indigo 500 (#6366f1) -> Purple 600 (#9333ea)
  const c1 = [0x4f, 0x46, 0xe5];
  const c2 = [0x63, 0x66, 0xf1];
  const c3 = [0x93, 0x33, 0xea];

  function getGradientColor(t) {
    if (t < 0.5) {
      const f = t / 0.5;
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * f),
        Math.round(c1[1] + (c2[1] - c1[1]) * f),
        Math.round(c1[2] + (c2[2] - c1[2]) * f)
      ];
    } else {
      const f = (t - 0.5) / 0.5;
      return [
        Math.round(c2[0] + (c3[0] - c2[0]) * f),
        Math.round(c2[1] + (c3[1] - c2[1]) * f),
        Math.round(c2[2] + (c3[2] - c3[2]) * f)
      ];
    }
  }

  // Rounded rectangle parameters
  const pad = w * 0.04;
  const rw = w - pad * 2;
  const rh = h - pad * 2;
  const radius = w * 0.22;

  // Calendar stroke parameters
  // Calendar bounding box in normalized [0, 24] coordinate space
  // d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
  const scale = (w * 0.58) / 24;
  const offsetX = (w - 24 * scale) / 2;
  const offsetY = (h - 24 * scale) / 2;
  const strokeWidth = 2.0 * scale;

  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  function distToRoundedRect(px, py, rx, ry, width, height, r) {
    const qx = Math.abs(px - (rx + width / 2)) - (width / 2 - r);
    const qy = Math.abs(py - (ry + height / 2)) - (height / 2 - r);
    const outsideDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
    const insideDist = Math.min(Math.max(qx, qy), 0);
    return outsideDist + insideDist - r;
  }

  // Calendar segments:
  // Top left pin: (8, 3) to (8, 7)
  // Top right pin: (16, 3) to (16, 7)
  // Middle divider line: (7, 11) to (17, 11)
  // Outer body: rounded rect at x=5, y=5, w=14, h=16, r=2. Stroke of body is distance to outer boundary = 0
  const pin1 = [8 * scale + offsetX, 3 * scale + offsetY, 8 * scale + offsetX, 7 * scale + offsetY];
  const pin2 = [16 * scale + offsetX, 3 * scale + offsetY, 16 * scale + offsetX, 7 * scale + offsetY];
  const divider = [7 * scale + offsetX, 11 * scale + offsetY, 17 * scale + offsetX, 11 * scale + offsetY];
  const bodyX = 5 * scale + offsetX;
  const bodyY = 5 * scale + offsetY;
  const bodyW = 14 * scale;
  const bodyH = 16 * scale;
  const bodyR = 2 * scale;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Check rounded container
      const bgDist = distToRoundedRect(x, y, pad, pad, rw, rh, radius);
      if (bgDist > 0.5) {
        // Transparent
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      const bgAlpha = bgDist <= -0.5 ? 1 : 0.5 - bgDist;
      const t = (x + (h - y)) / (w + h); // gradient from bottom-left to top-right
      const bgCol = getGradientColor(t);

      // Check distance to calendar strokes
      const dPin1 = distToSegment(x, y, pin1[0], pin1[1], pin1[2], pin1[3]);
      const dPin2 = distToSegment(x, y, pin2[0], pin2[1], pin2[2], pin2[3]);
      const dDiv = distToSegment(x, y, divider[0], divider[1], divider[2], divider[3]);
      const dBodySigned = distToRoundedRect(x, y, bodyX, bodyY, bodyW, bodyH, bodyR);
      const dBody = Math.abs(dBodySigned);

      const minDist = Math.min(dPin1, dPin2, dDiv, dBody);
      const halfStroke = strokeWidth / 2;
      const strokeDist = minDist - halfStroke;

      let fgAlpha = 0;
      if (strokeDist <= -0.5) {
        fgAlpha = 1;
      } else if (strokeDist < 0.5) {
        fgAlpha = 0.5 - strokeDist;
      }

      // Blend foreground (white calendar) over background
      const finalR = Math.round(255 * fgAlpha + bgCol[0] * (1 - fgAlpha));
      const finalG = Math.round(255 * fgAlpha + bgCol[1] * (1 - fgAlpha));
      const finalB = Math.round(255 * fgAlpha + bgCol[2] * (1 - fgAlpha));
      const finalA = Math.round(bgAlpha * 255);

      buf[idx] = finalR;
      buf[idx + 1] = finalG;
      buf[idx + 2] = finalB;
      buf[idx + 3] = finalA;
    }
  }

  // Downsample to target size with area averaging
  const targetBuf = Buffer.alloc(size * size * 4);
  const ratio = SS;
  for (let ty = 0; ty < size; ty++) {
    for (let tx = 0; tx < size; tx++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      for (let dy = 0; dy < ratio; dy++) {
        for (let dx = 0; dx < ratio; dx++) {
          const sy = ty * ratio + dy;
          const sx = tx * ratio + dx;
          const sidx = (sy * w + sx) * 4;
          const a = buf[sidx + 3] / 255;
          sumR += buf[sidx] * a;
          sumG += buf[sidx + 1] * a;
          sumB += buf[sidx + 2] * a;
          sumA += buf[sidx + 3];
        }
      }
      const count = ratio * ratio;
      const avgA = sumA / count;
      const tidx = (ty * size + tx) * 4;
      if (avgA > 0) {
        targetBuf[tidx] = Math.round(sumR / (sumA / 255));
        targetBuf[tidx + 1] = Math.round(sumG / (sumA / 255));
        targetBuf[tidx + 2] = Math.round(sumB / (sumA / 255));
        targetBuf[tidx + 3] = Math.round(avgA);
      } else {
        targetBuf[tidx] = 0;
        targetBuf[tidx + 1] = 0;
        targetBuf[tidx + 2] = 0;
        targetBuf[tidx + 3] = 0;
      }
    }
  }

  return createPNG(size, size, targetBuf);
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="calGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#9333ea" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#calGrad)" />
  <g transform="translate(14, 14) scale(1.5)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </g>
</svg>`;

console.log('Generating images...');

const png16 = renderCalendarIcon(16);
const png32 = renderCalendarIcon(32);
const png48 = renderCalendarIcon(48);
const png64 = renderCalendarIcon(64);
const png192 = renderCalendarIcon(192);
const png512 = renderCalendarIcon(512);

const icoBuffer = createICO([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 }
]);

// Write SVG files
const svgTargets = [
  'public/icon.svg',
  'public/favicon.svg',
  'app/icon.svg'
];
svgTargets.forEach(file => {
  fs.writeFileSync(path.resolve(file), svgContent, 'utf8');
  console.log('Wrote SVG:', file);
});

// Write ICO files
const icoTargets = [
  'public/favicon.ico',
  'app/favicon.ico',
  'app/[locale]/favicon.ico'
];
icoTargets.forEach(file => {
  fs.writeFileSync(path.resolve(file), icoBuffer);
  console.log('Wrote ICO:', file);
});

// Write PNG files
fs.writeFileSync(path.resolve('public/favicon-32x32.png'), png32);
fs.writeFileSync(path.resolve('app/favicon-32x32.png'), png32);
fs.writeFileSync(path.resolve('public/favicon-64x64.png'), png64);
fs.writeFileSync(path.resolve('public/favicon.png'), png192);
fs.writeFileSync(path.resolve('public/icon.png'), png192);
fs.writeFileSync(path.resolve('app/icon.png'), png192);
fs.writeFileSync(path.resolve('public/apple-icon.png'), png192);
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), png192);
fs.writeFileSync(path.resolve('app/apple-icon.png'), png192);
fs.writeFileSync(path.resolve('public/logo.png'), png512);

console.log('All icons generated successfully!');
