import { defineConfig, devices } from "@playwright/test";

const PORT = 3300;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://carlog:carlog_local_dev@127.0.0.1:5433/carlog_e2e";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // sign-in codes are read from a shared file
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      // iPhone 15 viewport, touch and user agent. WebKit needs extra system libraries; switch
      // `defaultBrowserType` to "webkit" where they're installed.
      name: "iphone",
      use: { ...devices["iPhone 15"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { DATABASE_URL, LOGIN_EMAIL_SINK: "file" },
  },
});
