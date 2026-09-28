/** Detects an image's real type from its first bytes (never trust the browser-supplied MIME type). */
export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

export function sniffImageType(buf: Uint8Array): ImageMime | null {
  const at = (i: number, ...sig: number[]) => sig.every((b, j) => buf[i + j] === b);
  const text = (i: number, s: string) => at(i, ...Array.from(s, (c) => c.charCodeAt(0)));
  if (buf.length < 3) return null;
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (text(0, "RIFF") && text(8, "WEBP")) return "image/webp";
  if (text(4, "ftyp") && ["heic", "heix", "hevc", "mif1", "msf1"].some((brand) => text(8, brand))) return "image/heic";
  return null;
}
