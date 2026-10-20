const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:4173" },
  projects: [
    { name: "desktop", use: { browserName: "chromium" } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    stderr: "ignore", // http.server logs every request to stderr
  },
});
