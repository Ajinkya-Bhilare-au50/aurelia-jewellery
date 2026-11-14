// `npm run dev:local` — start a local Postgres (data in .data/pg) and the Next dev server together.
// Ctrl+C stops both. `npm run db:stop` stops a database left running (e.g. terminal closed).
// Only for local testing; use Neon (DATABASE_URL in .env) for real data.
import EmbeddedPostgres from "embedded-postgres";
import { spawn, spawnSync } from "child_process";
import { existsSync } from "fs";
import net from "net";
import path from "path";

const PORT = 54329;
const URL = `postgresql://postgres:pw@localhost:${PORT}/aurelia`;
const dir = path.join(process.cwd(), ".data", "pg");

// `node scripts/dev-local.mjs stop` → clean shutdown via pg_ctl
const binDir = path.join(process.cwd(), "node_modules", "@embedded-postgres", "windows-x64", "native", "bin");
function pgCtlStop() {
  if (!existsSync(path.join(dir, "postmaster.pid"))) return false;
  spawnSync(path.join(binDir, "pg_ctl"), ["stop", "-D", dir, "-m", "fast", "-s"], { stdio: "inherit" });
  return true;
}
const portOpen = () =>
  new Promise((resolve) => {
    const s = net.connect(PORT, "127.0.0.1", () => (s.destroy(), resolve(true)));
    s.on("error", () => resolve(false));
  });

if (process.argv[2] === "stop") {
  console.log((await portOpen()) && pgCtlStop() ? "Local database stopped." : "Local database is not running.");
  process.exit(0);
}

const fresh = !existsSync(dir);
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "pw",
  port: PORT,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

const env = { ...process.env, DATABASE_URL: URL, DIRECT_URL: URL };
const npx = (args) => spawnSync("npx", args, { stdio: "inherit", env, shell: true });

let stopping = false;
let startedHere = false; // only stop a database this process started (another dev server may be using it)
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (startedHere) {
    console.log("\nStopping local database…");
    pgCtlStop();
  } else {
    console.log("\nLeaving the local database running (it was started by another process).");
  }
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (await portOpen()) {
  console.log(`Local Postgres already running on port ${PORT} — reusing it.`);
} else {
  if (fresh) await pg.initialise();
  await pg.start();
  startedHere = true;
  console.log(`Local Postgres running on port ${PORT}`);
  if (fresh) await pg.createDatabase("aurelia");
}

npx(["prisma", "migrate", "deploy"]);
if (fresh) npx(["prisma", "db", "seed"]);

const next = spawn("npx", ["next", "dev", "--turbo"], { stdio: "inherit", env, shell: true });
next.on("exit", (code) => stop(code ?? 0));
