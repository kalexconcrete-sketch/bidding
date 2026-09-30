#!/usr/bin/env node
/**
 * fix-openclaw-dataclone.mjs
 *
 * Hot-patch for OpenClaw on Windows:
 *   "WorkerTaskError: DataCloneError: #<Object> could not be cloned"
 *
 * Root cause (OpenClaw 2026.9.6 / 2026.9.7, Windows only):
 *   cloneEnvWithPlatformSemantics() wraps the environment in a Proxy on win32
 *   (to keep case-insensitive env lookups). Some session-history readers pass
 *   that Proxy inside the message they hand to worker.postMessage(), and the
 *   structured-clone algorithm cannot serialize a Proxy. The worker pool wraps
 *   the failure as WorkerTaskError(..., "unavailable") and every chat turn dies
 *   before the model is even called.
 *   Upstream issues: openclaw/openclaw#159758, #161654, #161828, #161872.
 *   Upstream fixed the readers on main after v2026.9.7 (not yet on npm).
 *
 * What this script does:
 *   Injects a tiny helper into the worker-task-pool chunk(s) of the installed
 *   OpenClaw dist and copies every `env` object into a plain object right
 *   before worker.postMessage(). That is the single host->worker boundary all
 *   worker task pools share, so it covers chat, cron, heartbeat and status.
 *   A `.dataclone-hotfix.bak` backup is written next to each patched file.
 *
 * Usage (run on the PC that hosts the OpenClaw gateway):
 *   node fix-openclaw-dataclone.mjs            # apply the patch
 *   node fix-openclaw-dataclone.mjs --check    # report only, change nothing
 *   node fix-openclaw-dataclone.mjs --revert   # restore the backups
 *   node fix-openclaw-dataclone.mjs --restart  # apply, then `openclaw gateway restart`
 *   node fix-openclaw-dataclone.mjs --dir "C:\\path\\to\\node_modules\\openclaw"
 *
 * Then restart the gateway so the patched files are loaded:
 *   openclaw gateway restart
 *
 * Re-run after any OpenClaw update that still lacks the upstream fix; the
 * script is idempotent and reports "already patched" when nothing is needed.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "/* openclaw-dataclone-hotfix v1 */";
const BACKUP_SUFFIX = ".dataclone-hotfix.bak";

const HELPER = `${MARKER}
function __openclawPlainEnv(value, depth) {
	depth = depth || 0;
	if (value === null || typeof value !== "object" || depth > 8) return value;
	if (Array.isArray(value)) {
		let copy = null;
		for (let i = 0; i < value.length; i++) {
			const next = __openclawPlainEnv(value[i], depth + 1);
			if (next !== value[i]) {
				if (!copy) copy = value.slice();
				copy[i] = next;
			}
		}
		return copy || value;
	}
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) return value;
	let copy = null;
	for (const key of Object.keys(value)) {
		const current = value[key];
		let next = current;
		if (current !== null && typeof current === "object") {
			if (key === "env" && !Array.isArray(current)) {
				next = {};
				for (const envKey of Object.keys(current)) next[envKey] = current[envKey];
			} else {
				next = __openclawPlainEnv(current, depth + 1);
			}
		}
		if (next !== current) {
			if (!copy) copy = Object.assign({}, value);
			copy[key] = next;
		}
	}
	return copy || value;
}
`;

// Host -> worker dispatch inside WorkerTaskPoolCore.sendInput().
const SEND_INPUT_RE = /(\.postMessage\(\{\s*)input,(\s*taskId:\s*task\.id,)/g;
// Host -> worker reply to an interactive worker request (exchange response).
const EXCHANGE_RE = /(taskId:\s*task\.id,\s*responseId:\s*exchange\.id,\s*)input:\s*response\.input(\s*\})/g;
// Presence of the upstream reader-level fix (main after v2026.9.7).
const UPSTREAM_FIX_RE = /captureSessionTranscriptStorageEnvironment\(request\.env\)/;

const args = new Set(process.argv.slice(2));
const flag = (name) => args.has(name);
const option = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function isOpenClawPackageDir(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return pkg.name === "openclaw" && fs.existsSync(path.join(dir, "dist")) ? pkg.version : null;
  } catch {
    return null;
  }
}

function npmGlobalRoot() {
  try {
    const result = spawnSync("npm root -g", { shell: true, encoding: "utf8", timeout: 60_000 });
    if (result.status === 0) {
      const line = String(result.stdout).trim().split(/\r?\n/).pop();
      if (line) return line;
    }
  } catch {
    // npm not on PATH; fall through to the well-known locations.
  }
  return null;
}

function candidateDirs() {
  const dirs = [];
  const explicit = option("--dir") ?? process.env.OPENCLAW_PACKAGE_DIR;
  if (explicit) dirs.push(path.resolve(explicit));
  const globalRoot = npmGlobalRoot();
  if (globalRoot) dirs.push(path.join(globalRoot, "openclaw"));
  if (process.env.APPDATA) dirs.push(path.join(process.env.APPDATA, "npm", "node_modules", "openclaw"));
  const home = os.homedir();
  dirs.push(
    path.join(home, ".npm-global", "lib", "node_modules", "openclaw"),
    "/usr/local/lib/node_modules/openclaw",
    "/usr/lib/node_modules/openclaw",
    "/opt/homebrew/lib/node_modules/openclaw",
  );
  return [...new Set(dirs)];
}

function locateOpenClaw() {
  for (const dir of candidateDirs()) {
    const version = isOpenClawPackageDir(dir);
    if (version) return { dir, version };
  }
  return null;
}

function listModuleFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && /\.(mjs|cjs|js)$/.test(entry.name)) files.push(full);
    }
  }
  return files;
}

function applyPatch(source) {
  let sendInputHits = 0;
  let exchangeHits = 0;
  let patched = source.replace(SEND_INPUT_RE, (_, before, after) => {
    sendInputHits += 1;
    return `${before}input: __openclawPlainEnv(input),${after}`;
  });
  patched = patched.replace(EXCHANGE_RE, (_, before, after) => {
    exchangeHits += 1;
    return `${before}input: __openclawPlainEnv(response.input)${after}`;
  });
  if (sendInputHits === 0) return null;
  // A function declaration hoists, so the helper can sit above the chunk's imports.
  return { source: `${HELPER}${patched}`, sendInputHits, exchangeHits };
}

function main() {
  const check = flag("--check");
  const revert = flag("--revert");
  const restart = flag("--restart");
  const force = flag("--force");

  const found = locateOpenClaw();
  if (!found) {
    fail(
      "Could not find an installed OpenClaw package. Pass --dir <path to node_modules/openclaw> " +
        "(on Windows this is usually %APPDATA%\\npm\\node_modules\\openclaw).",
    );
  }
  const { dir, version } = found;
  log(`OpenClaw ${version} at ${dir}`);

  const distDir = path.join(dir, "dist");
  const files = listModuleFiles(distDir);
  let alreadyPatched = 0;
  let patchable = 0;
  let restored = 0;
  let upstreamFixed = false;
  const touched = [];

  for (const file of files) {
    const backup = `${file}${BACKUP_SUFFIX}`;
    if (revert) {
      if (fs.existsSync(backup)) {
        if (!check) fs.copyFileSync(backup, file);
        restored += 1;
        touched.push(path.relative(dir, file));
      }
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    if (!upstreamFixed && UPSTREAM_FIX_RE.test(source)) upstreamFixed = true;
    if (source.startsWith(MARKER)) {
      alreadyPatched += 1;
      touched.push(path.relative(dir, file));
      continue;
    }
    if (!source.includes("taskId: task.id")) continue;
    const result = applyPatch(source);
    if (!result) continue;
    patchable += 1;
    touched.push(path.relative(dir, file));
    log(
      `${check ? "would patch" : "patching"} ${path.relative(dir, file)} ` +
        `(${result.sendInputHits} dispatch site${result.sendInputHits === 1 ? "" : "s"}, ` +
        `${result.exchangeHits} exchange site${result.exchangeHits === 1 ? "" : "s"})`,
    );
    if (check) continue;
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
    fs.writeFileSync(file, result.source, "utf8");
  }

  if (revert) {
    log(restored ? `${check ? "Would restore" : "Restored"} ${restored} file(s) from backups.` : "Nothing to revert.");
    return;
  }

  if (upstreamFixed && !force) {
    log("This OpenClaw build already contains the upstream reader fix; the hot-patch is only a safety net here.");
  }

  if (alreadyPatched && !patchable) {
    log(`Already patched (${alreadyPatched} file(s)). Nothing to do.`);
  } else if (!patchable && !alreadyPatched) {
    fail(
      "No worker-task-pool dispatch site matched. This OpenClaw version has a different layout; " +
        "update OpenClaw (npm i -g openclaw@latest) or open an issue with the version above.",
    );
  } else if (check) {
    log(`Check only: ${patchable} file(s) would be patched, ${alreadyPatched} already patched.`);
  } else {
    log(`Patched ${patchable} file(s); backups written with suffix ${BACKUP_SUFFIX}.`);
  }

  if (!check && (patchable || restart)) {
    if (restart) {
      log("Restarting the gateway: openclaw gateway restart");
      const result = spawnSync("openclaw gateway restart", { shell: true, stdio: "inherit", timeout: 180_000 });
      if (result.status !== 0) {
        log(
          "Gateway restart reported a problem. On Windows, run these instead:\n" +
            '  schtasks /End /TN "OpenClaw Gateway"\n' +
            '  schtasks /Run /TN "OpenClaw Gateway"',
        );
      }
    } else {
      log("Now restart the gateway so it loads the patched files:  openclaw gateway restart");
    }
  }
}

main();
