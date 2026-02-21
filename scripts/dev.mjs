import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import http from "node:http";

const ROOT = resolve(process.cwd());
const PID_DIR = resolve(ROOT, ".pids");

const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
	const idx = argv.findIndex((x) => x === name || x.startsWith(`${name}=`));
	if (idx === -1) return fallback;
	const token = argv[idx];
	if (token.includes("=")) return token.split("=").slice(1).join("=") || fallback;
	return argv[idx + 1] ?? fallback;
};

const frontendPort = Number(getArg("--port", "3001"));
// Default to 127.0.0.1 to avoid IPv6 (::1) / localhost binding confusion.
const frontendHost = getArg("--host", getArg("--hostname", "127.0.0.1"));

const isWindows = process.platform === "win32";

const waitForHttp = (url, { timeoutMs = 10_000, intervalMs = 300 } = {}) =>
	new Promise((resolvePromise, rejectPromise) => {
		const start = Date.now();
		const tick = () => {
			const req = http.get(url, (res) => {
				res.resume();
				resolvePromise(res.statusCode ?? 0);
			});
			req.on("error", () => {
				if (Date.now() - start > timeoutMs) {
					rejectPromise(new Error(`Timeout waiting for ${url}`));
					return;
				}
				setTimeout(tick, intervalMs);
			});
			req.setTimeout(1_000, () => req.destroy(new Error("timeout")));
		};
		tick();
	});

mkdirSync(PID_DIR, { recursive: true });

const spawnProc = (name, cmd, args, options) => {
	const child = spawn(cmd, args, {
		stdio: "inherit",
		shell: false,
		...options,
	});

	if (child.pid) {
		writeFileSync(resolve(PID_DIR, `${name}.pid`), String(child.pid), "utf8");
	}

	child.on("exit", (code, signal) => {
		if (signal) {
			console.log(`[${name}] exited (signal ${signal})`);
		} else {
			console.log(`[${name}] exited (code ${code})`);
		}

		// If either dev server exits unexpectedly, exit parent so CI/terminal sees failure.
		// (This prevents the “looks like it’s running but it isn’t” confusion.)
		if (code && code !== 0) {
			process.exitCode = code;
			// Give stdout a breath, then exit.
			setTimeout(() => process.exit(code), 50);
		}
	});

	return child;
};

// Backend (local FastAPI)
spawnProc(
	"backend",
	resolve(ROOT, ".venv/bin/python"),
	[
		"-m",
		"uvicorn",
		"app.main:app",
		"--reload",
		"--host",
		"127.0.0.1",
		"--port",
		"8000",
	],
	{
		cwd: resolve(ROOT, "backend"),
		env: {
			...process.env,
			PYTHONPATH: resolve(ROOT, "backend"),
		},
	}
);

// Frontend (Next dev)
spawnProc(
	"frontend",
	isWindows ? "npm.cmd" : "npm",
	[
		"run",
		"dev",
		"--",
		"--port",
		String(frontendPort),
		"--hostname",
		String(frontendHost),
	],
	{
		cwd: resolve(ROOT, "frontend"),
		env: {
			...process.env,
		},
	}
);

// Smoke logs (helps diagnose “UI 깨짐=서버 미기동” cases)
(async () => {
	try {
		const frontendUrl = `http://${frontendHost}:${frontendPort}/`;
		const backendUrl = "http://127.0.0.1:8000/health";
		const [b, f] = await Promise.all([
			waitForHttp(backendUrl, { timeoutMs: 12_000 }),
			waitForHttp(frontendUrl, { timeoutMs: 12_000 }),
		]);
		console.log(`[smoke] backend ${b} (${backendUrl})`);
		console.log(`[smoke] frontend ${f} (${frontendUrl})`);
	} catch (e) {
		console.warn(`[smoke] ${String(e?.message || e)}`);
	}
})();

// Keep parent alive (so children keep running)
process.stdin.resume();

