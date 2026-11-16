import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerDirectory = resolve(root, "backend", "neon", "worker");
const templatePath = resolve(workerDirectory, "wrangler.toml");
const generatedConfigPath = resolve(workerDirectory, `.wrangler.generated.${process.pid}.toml`);
const wranglerCliPath = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
const hyperdriveId = process.env.HYPERDRIVE_ID;
const deploy = process.argv.includes("--deploy");
const dryRun = process.argv.includes("--dry-run") || !deploy;

if (deploy && process.argv.includes("--dry-run")) {
  throw new Error("Choose either --deploy or --dry-run, not both.");
}
if (!hyperdriveId || !/^[A-Za-z0-9_-]{8,128}$/u.test(hyperdriveId)) {
  throw new Error("Set HYPERDRIVE_ID to the configured Cloudflare Hyperdrive resource ID.");
}
if (!existsSync(wranglerCliPath)) {
  throw new Error("Wrangler is missing; install the repository dependencies before deployment.");
}

const template = readFileSync(templatePath, "utf8");
const placeholder = 'id = "REPLACE_WITH_HYPERDRIVE_ID"';
if (template.split(placeholder).length !== 2) {
  throw new Error("Expected exactly one Hyperdrive ID placeholder in the Worker config.");
}
writeFileSync(
  generatedConfigPath,
  template.replace(placeholder, `id = "${hyperdriveId}"`),
  { encoding: "utf8", flag: "wx" },
);

try {
  const args = ["deploy", "--config", generatedConfigPath];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync(process.execPath, [wranglerCliPath, ...args], {
    cwd: workerDirectory,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  unlinkSync(generatedConfigPath);
}
