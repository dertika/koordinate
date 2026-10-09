/** Fügt einen pHYs-Chunk ein, damit Bildprogramme die richtige Druckauflösung (dpi) erkennen. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export async function withDpi(png: Blob, dpi: number): Promise<Blob> {
  const src = new Uint8Array(await png.arrayBuffer());
  // Signatur (8) + IHDR (4 Länge + 4 Typ + 13 Daten + 4 CRC) = 33 Bytes
  const ihdrEnd = 33;
  if (src.length < ihdrEnd || String.fromCharCode(...src.subarray(12, 16)) !== 'IHDR') return png;

  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // Einheit: Meter
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  return new Blob([src.subarray(0, ihdrEnd), chunk, src.subarray(ihdrEnd)], { type: 'image/png' });
}
