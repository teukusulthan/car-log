import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

describe("isAllowedPushEndpoint", () => {
  it("accepts the real browser push services over https", () => {
    for (const url of [
      "https://web.push.apple.com/QGy2...",
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(isAllowedPushEndpoint(url)).toBe(true);
    }
  });

  it("rejects anything else, so the cron can't be pointed at arbitrary hosts", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost:5432/",
      "https://evil.com/?fcm.googleapis.com",
      "https://fcm.googleapis.com.evil.com/x",
      "not a url",
    ]) {
      expect(isAllowedPushEndpoint(url)).toBe(false);
    }
  });
});
