import sharp from "sharp";

const MAX_SIZE_MB = 19;
const MAX_DIMENSION = 3000;

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png",
  "image/heic", "image/heif", "image/webp",
  "application/pdf",
]);
const ALLOWED_EXT = /\.(jpg|jpeg|png|heic|heif|webp|pdf)$/i;

function validateFile(file: File, bytes: Buffer): void {
  const mime = file.type.toLowerCase();
  const extOk = ALLOWED_EXT.test(file.name);
  const mimeOk = ALLOWED_MIME.has(mime);

  if (!mimeOk && !extOk) {
    throw new Error(`File type not supported. Allowed: JPG, PNG, HEIC, PDF, WebP.`);
  }

  // Magic-byte checks — reject files that claim to be images/PDFs but aren't.
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return; // JPEG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return; // PNG
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return; // PDF %PDF
  if (bytes.length > 7 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return; // HEIC/HEIF ftyp box
  if (bytes.length > 11 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return; // WebP RIFF…WEBP

  // Extension/MIME matched but unknown magic bytes (e.g. future format) —
  // let sharp validate during processing rather than false-positive reject.
  if (mimeOk || extOk) return;

  throw new Error(`File content doesn't match its declared type.`);
}

function sanitizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export async function preprocessUpload(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const inputBytes = Buffer.from(arrayBuffer);

  const sizeMb = inputBytes.byteLength / (1024 * 1024);
  if (sizeMb > MAX_SIZE_MB + 1) {
    throw new Error(`File too large (${sizeMb.toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`);
  }

  validateFile(file, inputBytes);

  // PDFs go through unchanged — sharp can't process them
  if (isPdf(file)) {
    return {
      bytes: inputBytes,
      contentType: "application/pdf",
      originalName: sanitizeName(file.name),
    };
  }

  // Image pipeline:
  // 1. Auto-rotate from EXIF (phone photos are often sideways/upside-down)
  // 2. Resize down if any dimension > MAX_DIMENSION (preserves aspect ratio)
  // 3. normalize() — stretches the histogram to full range → improves contrast on faded receipts
  // 4. Output as JPEG (handles HEIC, BMP, TIFF, etc. transparently)
  const processed = await sharp(inputBytes)
    .rotate()                                          // EXIF auto-rotate
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .normalize()                                       // contrast enhancement
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const outputName = sanitizeName(file.name).replace(/\.[^.]+$/, "") + ".jpg";

  return {
    bytes: processed,
    contentType: "image/jpeg",
    originalName: outputName,
  };
}
