import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: "http://localhost:5173",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    // Local runs use installed Chrome; CI uses Playwright Chromium after `playwright install`.
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" } }],
    webServer: [
        {
            command: "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
            cwd: "../backend",
            url: "http://127.0.0.1:8000/health",
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
        },
        {
            command: "npm.cmd run dev -- --host 127.0.0.1",
            cwd: ".",
            url: "http://localhost:5173",
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
        },
    ],
});
