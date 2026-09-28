import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";

type LoginEmail = { to: string; code: string; url: string };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function renderHtml({ code, url }: LoginEmail) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:420px;background:#fff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:18px;font-weight:600;padding-bottom:8px">Your car-log sign-in code</td></tr>
<tr><td style="font-size:14px;color:#57534e;padding-bottom:24px">Enter this code in the app. It expires in 10 minutes.</td></tr>
<tr><td style="font-size:34px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,monospace;padding-bottom:24px">${escapeHtml(code)}</td></tr>
<tr><td style="font-size:13px;color:#78716c">Using a browser instead of the installed app? <a href="${escapeHtml(url)}" style="color:#1d4ed8">Sign in with this link</a>.</td></tr>
<tr><td style="font-size:12px;color:#a8a29e;padding-top:24px">If you didn't ask for this, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}

/** Sends the sign-in email via Resend, or (outside production) writes it to .dev/ for local use and e2e tests. */
export async function sendLoginEmail(email: LoginEmail) {
  if (env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: email.to,
        subject: `${email.code} is your car-log code`,
        html: renderHtml(email),
        text: `Your car-log sign-in code is ${email.code}. It expires in 10 minutes.\n\nOr sign in with this link: ${email.url}`,
      }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("RESEND_API_KEY is required in production to send sign-in emails");
  }
  const dir = path.join(process.cwd(), ".dev");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "last-login.json"), JSON.stringify(email, null, 2));
  console.info(`\n[dev] Sign-in code for ${email.to}: ${email.code}\n[dev] ${email.url}\n`);
}
