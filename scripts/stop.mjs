import { readFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PID_DIR = resolve(ROOT, ".pids");

const stopByName = (name) => {
  const pidFile = resolve(PID_DIR, `${name}.pid`);
  if (!existsSync(pidFile)) return;

  const raw = readFileSync(pidFile, "utf8").trim();
  const pid = Number(raw);
  if (!pid || Number.isNaN(pid)) return;

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already stopped
  }
};

stopByName("frontend");
stopByName("backend");

try {
  rmSync(PID_DIR, { recursive: true, force: true });
} catch {
  // ignore
}

console.log("Stopped dev processes (if any).\n");
