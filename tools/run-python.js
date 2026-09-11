import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const executable =
  process.platform === "win32"
    ? "python"
    : existsSync(join(".venv", "bin", "python"))
      ? join(".venv", "bin", "python")
      : "python3";
const result = spawnSync(executable, process.argv.slice(2), {
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
