/** Browser-only: shrink photos before upload so receipts stay small and fast on mobile data. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** All photos in one form submission must fit under the host request limit (Vercel: 4.5 MB). */
export const MAX_FORM_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // e.g. a format this browser can't decode; the server still validates size and type
  }
}
