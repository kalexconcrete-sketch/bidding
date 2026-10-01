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
 *   Upstream issues: openclaw/openclaw#157067, #159339, #159758, #161654,
 *   #161828, #161872. Upstream fix: PR #160075 (commit a181c3f1d, on main since
 *   2026-09-29) - not part of the 2026.9.7 release and not on npm yet.
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
 *   node fix-openclaw-dataclone.mjs --dir "%APPDATA%\npm\node_modules\openclaw"   (no trailing backslash)
 *
 * Then restart the gateway so the patched files are loaded:
 *   openclaw gateway restart
 *
 * Notes:
 *   - Idempotent: re-running reports "already patched" when nothing is needed.
 *   - Re-run after any OpenClaw update that still lacks the upstream fix. If the
 *     installed build already contains the upstream fix, the script says so and
 *     does nothing unless you pass --force.
 *   - `openclaw update` may report the patched chunks as "local changes preserved
 *     but not reapplied"; that is expected and harmless.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "/* openclaw-dataclone-hotfix v1 */";
const HELPER_NAME = "__openclawPlainEnv";
const BACKUP_SUFFIX = ".dataclone-hotfix.bak";
const TEMP_SUFFIX = ".dataclone-hotfix.tmp";

const HELPER = `${MARKER}
function ${HELPER_NAME}(value, depth) {
	depth = depth || 0;
	if (value === null || typeof value !== "object" || depth > 8) return value;
	if (Array.isArray(value)) {
		let copy = null;
		for (let i = 0; i < value.length; i++) {
			const next = ${HELPER_NAME}(value[i], depth + 1);
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
			const currentProto = Object.getPrototypeOf(current);
			if (key === "env" && !Array.isArray(current) && (currentProto === Object.prototype || currentProto === null)) {
				// A Windows env Proxy reports Object.prototype here, so it is copied; Maps etc. fall through untouched.
				next = {};
				for (const envKey of Object.keys(current)) next[envKey] = current[envKey];
			} else {
				next = ${HELPER_NAME}(current, depth + 1);
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
// Presence of the upstream reader-level fix (PR #160075, main after v2026.9.7).
const UPSTREAM_FIX_RE = /captureSessionTranscriptStorageEnvironment\(request\.env\)/;

const RESTART_HELP =
  "If the restart fails or Luciano still shows the error, the OLD gateway process is most likely still\n" +
  "running the unpatched code. On Windows, in a normal (non-admin) prompt as the user who installed it:\n" +
  "  1. openclaw gateway status     -> note whether a Scheduled Task or a Startup-folder login item runs it, and the port\n" +
  "  2. openclaw gateway stop       -> if it refuses: netstat -ano | findstr :18789  then  taskkill /F /T /PID <pid>\n" +
  '  3. Scheduled Task install:  schtasks /Run /TN "OpenClaw Gateway"\n' +
  '     Login-item install:      "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\OpenClaw Gateway.cmd"\n' +
  "                              (or the .vbs next to it), or simply sign out and back in\n" +
  "  4. openclaw gateway status     -> confirm the gateway started AFTER this patch ran";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : undefined;
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

function warn(message) {
  process.stderr.write(`WARNING: ${message}\n`);
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

function fileStartsWithMarker(file) {
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(Buffer.byteLength(MARKER));
    const read = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read).toString("utf8") === MARKER;
  } finally {
    fs.closeSync(fd);
  }
}

function isPatchedSource(source) {
  return source.startsWith(MARKER) || source.includes(`function ${HELPER_NAME}(`);
}

function applyPatch(source) {
  let sendInputHits = 0;
  let exchangeHits = 0;
  let patched = source.replace(SEND_INPUT_RE, (_, before, after) => {
    sendInputHits += 1;
    return `${before}input: ${HELPER_NAME}(input),${after}`;
  });
  patched = patched.replace(EXCHANGE_RE, (_, before, after) => {
    exchangeHits += 1;
    return `${before}input: ${HELPER_NAME}(response.input)${after}`;
  });
  if (sendInputHits === 0) return null;
  // A function declaration hoists, so the helper can sit above the chunk's imports.
  return { source: `${HELPER}${patched}`, sendInputHits, exchangeHits };
}

function writeAtomically(file, content) {
  const temp = `${file}${TEMP_SUFFIX}`;
  fs.writeFileSync(temp, content, "utf8");
  fs.renameSync(temp, file);
}

function revertBackups({ dir, files, check, force }) {
  let restored = 0;
  let skipped = 0;
  for (const file of files) {
    const backup = `${file}${BACKUP_SUFFIX}`;
    if (!fs.existsSync(backup)) continue;
    const relative = path.relative(dir, file);
    if (!fileStartsWithMarker(file) && !force) {
      warn(`skipping ${relative}: the file is not patched, so its backup is stale (older OpenClaw build?). Pass --force to restore anyway.`);
      skipped += 1;
      continue;
    }
    if (!check) {
      fs.copyFileSync(backup, file);
      // A consumed backup must never be replayed onto a future OpenClaw version.
      fs.unlinkSync(backup);
    }
    restored += 1;
    log(`${check ? "would restore" : "restored"} ${relative}`);
  }
  if (restored) log(`${check ? "Would restore" : "Restored"} ${restored} file(s) from backups.`);
  else log("Nothing to revert.");
  if (skipped) log(`${skipped} stale backup(s) left untouched.`);
  if (restored && !check) log("Restart the gateway so it reloads the original files:  openclaw gateway restart");
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

  const files = listModuleFiles(path.join(dir, "dist"));
  if (revert) {
    revertBackups({ dir, files, check, force });
    return;
  }

  // Pass 1: find out what is there before touching anything.
  const candidates = [];
  let alreadyPatched = 0;
  let upstreamFixed = false;
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (!upstreamFixed && UPSTREAM_FIX_RE.test(source)) upstreamFixed = true;
    if (isPatchedSource(source)) {
      alreadyPatched += 1;
      continue;
    }
    if (!/taskId:\s*task\.id/.test(source)) continue;
    const result = applyPatch(source);
    if (result) candidates.push({ file, result });
  }

  if (upstreamFixed) {
    log("This OpenClaw build already contains the upstream reader fix (PR #160075); the hot-patch is not needed.");
    if (!force && !alreadyPatched) {
      log("Nothing to do. Pass --force to apply the hot-patch anyway.");
      return;
    }
  }

  if (!candidates.length && !alreadyPatched) {
    fail(
      "No worker-task-pool dispatch site matched. This OpenClaw version has a different layout; " +
        "update OpenClaw (npm i -g openclaw@latest) or open an issue with the version above.",
    );
  }

  // Pass 2: patch.
  let patched = 0;
  let failed = 0;
  for (const { file, result } of candidates) {
    const relative = path.relative(dir, file);
    log(
      `${check ? "would patch" : "patching"} ${relative} ` +
        `(${result.sendInputHits} dispatch site${result.sendInputHits === 1 ? "" : "s"}, ` +
        `${result.exchangeHits} exchange site${result.exchangeHits === 1 ? "" : "s"})`,
    );
    if (check) continue;
    try {
      // The current file is known to be unpatched, so it is always the right baseline:
      // refresh any older backup instead of keeping it.
      fs.copyFileSync(file, `${file}${BACKUP_SUFFIX}`);
      writeAtomically(file, result.source);
      patched += 1;
    } catch (error) {
      failed += 1;
      process.stderr.write(`ERROR: could not patch ${relative}: ${error?.message ?? error}\n`);
    }
  }

  if (check) {
    log(`Check only: ${candidates.length} file(s) would be patched, ${alreadyPatched} already patched.`);
    return;
  }
  if (failed) {
    fail(
      `${failed} file(s) could not be patched (antivirus lock? permissions?). ` +
        "Re-run this script (it is idempotent) or run it with --revert.",
    );
  }
  if (patched) log(`Patched ${patched} file(s); backups written with suffix ${BACKUP_SUFFIX}.`);
  else log(`Already patched (${alreadyPatched} file(s)). Nothing to do.`);

  if (restart) {
    log("Restarting the gateway: openclaw gateway restart");
    const result = spawnSync("openclaw gateway restart", { shell: true, stdio: "inherit", timeout: 180_000 });
    if (result.status !== 0) log(`Gateway restart reported a problem.\n${RESTART_HELP}`);
  } else if (patched) {
    log(`Now restart the gateway so it loads the patched files:  openclaw gateway restart\n${RESTART_HELP}`);
  }
}

main();
