const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load .env dari root monorepo ke process.env
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

module.exports = {
  apps: [
    {
      name: "jalamandala",
      cwd: "./apps/web",
      script: "bun",
      args: "run start",
      env: { ...process.env },
    },
  ],
};
