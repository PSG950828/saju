import { execSync } from "node:child_process";

const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = argv.findIndex((x) => x === name || x.startsWith(`${name}=`));
  if (idx === -1) return fallback;
  const token = argv[idx];
  if (token.includes("=")) return token.split("=").slice(1).join("=") || fallback;
  return argv[idx + 1] ?? fallback;
};

const portsRaw = getArg("--ports", "3001,8000,3000");
const ports = portsRaw
  .split(",")
  .map((p) => Number(p.trim()))
  .filter((p) => Number.isFinite(p) && p > 0);

const listPids = (port) => {
  try {
    const out = execSync(`lsof -n -t -iTCP:${port} -sTCP:LISTEN || true`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return out
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
};

const killPid = (pid, signal) => {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const killed = [];
  for (const port of ports) {
    const pids = Array.from(new Set(listPids(port)));
    if (pids.length === 0) continue;

    for (const pid of pids) {
      if (killPid(pid, "SIGTERM")) killed.push({ port, pid, signal: "SIGTERM" });
    }
  }

  if (killed.length) await sleep(400);

  // Escalate if still listening
  for (const port of ports) {
    const pids = Array.from(new Set(listPids(port)));
    for (const pid of pids) {
      if (killPid(pid, "SIGKILL")) {
        killed.push({ port, pid, signal: "SIGKILL" });
      }
    }
  }

  if (killed.length === 0) {
    console.log("No listening processes found on target ports.");
    return;
  }

  const lines = killed.map((k) => `- port ${k.port}: pid ${k.pid} (${k.signal})`);
  console.log("Cleaned ports:\n" + lines.join("\n"));
};

await main();
