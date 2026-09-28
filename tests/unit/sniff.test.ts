import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/sniff";

const bytes = (...b: number[]) => Buffer.from(b);
const ascii = (s: string) => Buffer.from(s, "latin1");

describe("sniffImageType", () => {
  it("recognises JPEG, PNG, WebP and HEIC by signature", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(Buffer.concat([ascii("RIFF"), bytes(0, 0, 0, 0), ascii("WEBPVP8 ")]))).toBe("image/webp");
    expect(sniffImageType(Buffer.concat([bytes(0, 0, 0, 0x18), ascii("ftypheic"), bytes(0, 0)]))).toBe("image/heic");
  });
  it("rejects anything else, whatever it claims to be", () => {
    expect(sniffImageType(ascii("%PDF-1.7 ..."))).toBeNull();
    expect(sniffImageType(ascii("<svg xmlns=..."))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });
});
