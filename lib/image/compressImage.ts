const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// Chat photos are frequently full-resolution phone camera shots (several MB,
// 3000px+ per side) despite only ever being displayed at a few hundred px in
// the bubble grid or ~80vh in the lightbox - uploading them as-is means every
// future load (for every group member, every time) pays for bytes nobody can
// see. Downscaling + re-encoding once at upload time fixes that at the source.
export async function compressImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const originalExt = file.name.split(".").pop()?.toLowerCase() || "jpg";

  // Animated GIFs would be flattened to a single frame by the canvas
  // round-trip below, so they're uploaded untouched.
  if (file.type === "image/gif") {
    return { blob: file, ext: "gif" };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) throw new Error("Canvas encoding failed");

    // Small, already-well-compressed images (e.g. screenshots) can end up
    // larger after a JPEG re-encode - keep the original in that case.
    if (blob.size >= file.size) {
      return { blob: file, ext: originalExt };
    }

    return { blob, ext: "jpg" };
  } catch {
    // Formats the browser can't decode into a canvas (e.g. HEIC in
    // non-Safari browsers) throw in createImageBitmap/drawImage - upload
    // the original rather than blocking the send entirely.
    return { blob: file, ext: originalExt };
  }
}
