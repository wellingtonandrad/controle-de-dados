import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(root, ".env")
const prodUrl = "https://erp-controle-dados.vercel.app"
const npx = process.platform === "win32" ? "npx.cmd" : "npx"

if (!existsSync(envPath)) {
  console.error("Missing .env")
  process.exit(1)
}

const parsed = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=")
      return [line.slice(0, i), line.slice(i + 1)]
    }),
)

const vars = {
  AUTH_SECRET: parsed.AUTH_SECRET,
  DATABASE_URL: parsed.DATABASE_URL,
  BETTER_AUTH_SECRET: parsed.BETTER_AUTH_SECRET,
  CRON_SECRET: parsed.CRON_SECRET,
  AUTH_GITHUB_ID: parsed.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: parsed.AUTH_GITHUB_SECRET,
  AUTH_GOOGLE_ID: parsed.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: parsed.AUTH_GOOGLE_SECRET,
  NEXTAUTH_URL: prodUrl,
  AUTH_URL: prodUrl,
  NEXT_PUBLIC_URL: prodUrl,
  STRIPE_SUCCESS_URL: `${prodUrl}/dashboard`,
  STRIPE_CANCEL_URL: `${prodUrl}/dashboard`,
  STRIPE_SUCESSS_URL: `${prodUrl}/dashboard`,
}

function run(args, input) {
  return spawnSync(npx, ["vercel", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    input,
    stdio: ["pipe", "pipe", "pipe"],
  })
}

for (const [name, value] of Object.entries(vars)) {
  if (!value?.trim()) {
    console.log(`SKIP ${name} (empty)`)
    continue
  }

  run(["env", "rm", name, "production", "-y"])
  const res = run(["env", "add", name, "production", "--yes"], value)

  if (res.status !== 0) {
    console.log(`FAIL ${name}: ${(res.stderr || res.stdout || "").trim()}`)
  } else {
    console.log(`OK ${name} (${value.length} chars)`)
  }
}

console.log("\nDone. Redeploy production on Vercel.")
