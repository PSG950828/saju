import { spawn } from "node:child_process";

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
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PID_DIR = resolve(ROOT, ".pids");
mkdirSync(PID_DIR, { recursive: true });

const spawnProc = (name, command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  writeFileSync(resolve(PID_DIR, `${name}.pid`), String(child.pid ?? ""), "utf8");
  return child;
};

// Backend
const backend = spawnProc(
  "backend",
  "/Users/psg/saju/.venv/bin/python",
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

// Frontend
const frontendArgs = [
  "run",
  "dev",
  "--",
  "--port",
  String(frontendPort),
  "--hostname",
  String(frontendHost),
];

const frontend = spawnProc("frontend", "npm", frontendArgs, {
  cwd: resolve(ROOT, "frontend"),
  env: {
    ...process.env,
  },
});

const shutdown = (signal = "SIGINT") => {
  try {
    backend.kill(signal);
  } catch {
    // ignore
  }
  try {
    frontend.kill(signal);
  } catch {
    // ignore
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

backend.on("exit", (code) => {
  if (code && code !== 0) {
    // If backend dies, stop frontend too.
    shutdown("SIGTERM");
  }
});

frontend.on("exit", (code) => {
  if (code && code !== 0) {
    // If frontend dies, stop backend too.
    shutdown("SIGTERM");
  }
});
