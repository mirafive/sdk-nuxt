/**
 * Builds the playground and checks the output: the client bundle carries exactly the configured
 * browser plugins and no server SDK, and `useServerMira()` events are flushed after the response.
 *
 *   bun scripts/verify-playground.ts [--skip-build]
 */
import { spawn, spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const output = "playground/.output"
const port = 3123
const failures: string[] = []
const check = (ok: boolean, message: string): void => {
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`)

  if (!ok) {
    failures.push(message)
  }
}

if (!process.argv.includes("--skip-build")) {
  const build = spawnSync("bunx", ["nuxt", "build", "playground"], { stdio: "inherit" })

  if (build.status !== 0) {
    process.exit(build.status ?? 1)
  }
}

const assets = join(output, "public/_nuxt")
const client = readdirSync(assets)
  .filter((file) => file.endsWith(".js"))
  .map((file) => readFileSync(join(assets, file), "utf8"))
  .join("\n")

// playground/nuxt.config.ts: mode "full", features ["autocapture"].
for (const plugin of ["pageviews", "identity", "autocapture"]) {
  check(client.includes(`name:\`${plugin}\``), `client bundle has ${plugin}()`)
}

for (const plugin of ["search"]) {
  check(!client.includes(`name:\`${plugin}\``), `client bundle has no ${plugin}()`)
}

check(!client.includes("mirafive-server"), "client bundle has no @mirafive/sdk-server")

const server = spawn("node", [join(output, "server/index.mjs")], {
  env: {
    ...process.env,
    PORT: String(port),
    NUXT_PUBLIC_MIRAFIVE_HOST: `http://localhost:${port}`,
    MIRAFIVE_SECRET_KEY: "sk_playground"
  },
  stdio: "ignore"
})

try {
  const base = `http://localhost:${port}`

  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await fetch(`${base}/v1/received`)
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  const signup = await (await fetch(`${base}/api/signup`, { method: "POST" })).json()

  check(signup.ok === true, "a server route answers")

  let received = ""

  // The client's own timer would send after 1 s; the flush after the response is faster.
  for (let attempt = 0; attempt < 8 && !received.includes('"name":"signup"'); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    received = JSON.stringify(await (await fetch(`${base}/v1/received`)).json())
  }

  check(received.includes('"name":"signup"'), "useServerMira() event is flushed after the response")
} finally {
  server.kill()
}

if (failures.length > 0) {
  process.exit(1)
}
