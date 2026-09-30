# Luciano (OpenClaw) – "WorkerTaskError: DataCloneError: #<Object> could not be cloned"

## What is happening

Luciano is the OpenClaw agent running on the Windows PC (Telegram bot `@Luciano_Dsc_Bot`, Claude CLI backend).
The error is **not** in this repo's code and not in Claude. It is a known OpenClaw bug on Windows
that breaks every chat turn before the model is even called:

- OpenClaw wraps the process environment in a JavaScript `Proxy` on Windows (to keep case-insensitive
  env lookups).
- A few session-history readers hand that Proxy to a worker thread through `worker.postMessage()`.
- Structured cloning cannot serialize a Proxy, so the worker pool fails with
  `WorkerTaskError: DataCloneError: #<Object> could not be cloned` and the turn ends with no reply.

Upstream tracking: openclaw/openclaw issues #157067, #159339, #159758, #161654, #161828, #161872.
Affected: OpenClaw 2026.9.6 and 2026.9.7 (the current npm `latest`, published 2026-09-30).
The reader-level fix is PR #160075 (commit a181c3f1d, merged to `main` on 2026-09-29). It is not in
the 2026.9.7 release and not on npm yet; the next release cut from `main` should include it.

## The fix (run on the PC that hosts the gateway)

`fix-openclaw-dataclone.mjs` hot-patches the installed OpenClaw so every `env` object is copied into a
plain object right before it is posted to a worker. It writes a `.dataclone-hotfix.bak` backup next
to each patched file and is safe to re-run.

Open PowerShell on the PC and run:

```powershell
cd $env:TEMP
Invoke-WebRequest https://raw.githubusercontent.com/kalexconcrete-sketch/bidding/claude/datacloneerror-worker-task-0is2pe/fix-openclaw-dataclone.mjs -OutFile fix-openclaw-dataclone.mjs
node fix-openclaw-dataclone.mjs
openclaw gateway restart
```

If `openclaw gateway restart` complains about the startup-folder launcher (it did on this PC before),
restart the scheduled task instead:

```powershell
schtasks /End /TN "OpenClaw Gateway"
schtasks /Run /TN "OpenClaw Gateway"
```

Then message Luciano on Telegram. Expected: a normal reply, and no new `DataCloneError` lines in
`openclaw logs --follow`.

## Useful variants

```powershell
node fix-openclaw-dataclone.mjs --check     # dry run, changes nothing
node fix-openclaw-dataclone.mjs --revert    # restore the backups
node fix-openclaw-dataclone.mjs --dir "C:\Users\maste\AppData\Roaming\npm\node_modules\openclaw"
```

## After OpenClaw updates itself

OpenClaw auto-updates. A release newer than 2026.9.7 should contain the upstream fix, in which case
the script reports that and is not needed. If an update brings the error back, just run the script again.
