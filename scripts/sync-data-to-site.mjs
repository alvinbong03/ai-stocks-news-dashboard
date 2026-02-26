import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "data"); //data: where generated data is stored (copied to targetDir for site to read)
const targetDir = path.join(repoRoot, "site", "public", "data"); //site/public/data: where copied data will be placed for the site to read

function ensureExists(p) {
  if (!fs.existsSync(p)) {
    console.error(`Missing folder: ${p}`);
    process.exit(1);
  }
}

ensureExists(sourceDir);

// Clean target so removed dates do not linger
fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

// Node 18+ supports fs.cpSync
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Synced ${sourceDir} -> ${targetDir}`);