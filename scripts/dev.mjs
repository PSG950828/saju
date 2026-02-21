import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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
const frontendHost = getArg("--host", getArg("--hostname", "localhost"));

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
	"npm",
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

// Keep parent alive (so children keep running)
process.stdin.resume();

