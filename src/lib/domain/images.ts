// Tamaño de imágenes JPEG/PNG sin dependencias (para colocarlas en el Word sin deformarlas).

export function imageSize(buf: Uint8Array): { width: number; height: number; type: "jpg" | "png" } | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // PNG: cabecera IHDR
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: view.getUint32(16), height: view.getUint32(20), type: "png" };
  }
  // JPEG: buscar el marcador SOF (C0–C3, C5–C7, C9–CB, CD–CF)
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = view.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7), type: "jpg" };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Escala (sin agrandar) para que quepa en maxW × maxH manteniendo la proporción. */
export function fitInside(width: number, height: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
