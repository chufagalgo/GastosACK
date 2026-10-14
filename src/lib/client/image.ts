// Preparación de tickets en el navegador antes de subirlos.
// pdf.js "legacy": la versión normal usa funciones de JavaScript que aún no tienen todos los móviles.

const MAX_SIDE = 1600;
const QUALITY = 0.8;

/** Reduce una foto a máx. 1600 px por lado y la convierte a JPEG (respeta la orientación EXIF). */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    return await drawToJpeg(bitmap, Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  } finally {
    bitmap.close();
  }
}

/** Primera página de un PDF como JPEG (para el Word, que no admite PDF incrustados). */
export async function pdfFirstPageToJpeg(file: Blob): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(base.width, base.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return await canvasToJpeg(canvas);
  } finally {
    await task.destroy();
  }
}

async function drawToJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // PNG con transparencia → fondo blanco
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToJpeg(canvas);
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se ha podido procesar la imagen"))), "image/jpeg", QUALITY),
  );
}
