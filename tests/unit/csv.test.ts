import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("writes a header row and CRLF-separated rows", () => {
    expect(toCsv(["a", "b"], [[1, "x"], [2, null]])).toBe("a,b\r\n1,x\r\n2,\r\n");
  });
  it("quotes fields containing commas, quotes or newlines", () => {
    expect(toCsv(["note"], [['Oil, "5W-30"\nsynthetic']])).toBe('note\r\n"Oil, ""5W-30""\nsynthetic"\r\n');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(toCsv(["w"], [["=HYPERLINK(1)"], ["+1"], ["-x"], ["@a"]])).toBe("w\r\n'=HYPERLINK(1)\r\n'+1\r\n'-x\r\n'@a\r\n");
  });
  it("leaves negative numbers alone", () => {
    expect(toCsv(["n"], [[-5]])).toBe("n\r\n-5\r\n");
  });
});
