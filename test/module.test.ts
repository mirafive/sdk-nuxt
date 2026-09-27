import { fileURLToPath } from "node:url"

import { loadNuxt } from "@nuxt/kit"
import type { Nuxt } from "@nuxt/schema"
import { describe, expect, it } from "vitest"

import mirafive, { type ModuleOptions } from "../src/module.ts"

const secret = "sk_test_never_public"
const dir = fileURLToPath(new URL("fixture", import.meta.url))

const load = async (options: ModuleOptions): Promise<Nuxt> =>
  loadNuxt({
    cwd: dir,
    ready: true,
    overrides: Object.assign({ modules: [mirafive], telemetry: false }, { mirafive: options })
  })

const template = async (nuxt: Nuxt, filename: string): Promise<string> => {
  const found = nuxt.options.build.templates.find((candidate) => candidate.filename === filename)

  return String(await found?.getContents?.({ nuxt, app: nuxt.apps["default"], options: {} } as never))
}

describe("module setup", () => {
  it("fails the build on an invalid mode or feature", async () => {
    await expect(load({ key: "mf_test", features: ["search"] })).rejects.toThrow(/"search" needs mode "full"/)
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a mistyped config from JavaScript
    await expect(load({ key: "mf_test", mode: "Full" as "full" })).rejects.toThrow(/unknown mode/)
  })

  it("keeps the secret key in private runtime config and out of every template", async () => {
    const nuxt = await load({ key: "mf_test", secretKey: secret, mode: "full", features: ["flags"] })

    expect(nuxt.options.runtimeConfig.public["mirafive"]).toEqual({ key: "mf_test", host: "" })
    expect(nuxt.options.runtimeConfig["mirafive"]).toEqual({ secretKey: secret })
    expect(JSON.stringify(nuxt.options.runtimeConfig.public)).not.toContain(secret)
    expect(await template(nuxt, "mirafive/client.mjs")).not.toContain(secret)
    expect(await template(nuxt, "mirafive/server.mjs")).toBe("export const flags = true\n")

    await nuxt.close()
  })

  it("generates the client template for exactly the listed features", async () => {
    const nuxt = await load({ key: "mf_test", mode: "full", features: ["autocapture"] })
    const source = await template(nuxt, "mirafive/client.mjs")

    expect(source.match(/sdk-browser\/dist\/\w+/g)).toEqual([
      "sdk-browser/dist/index",
      "sdk-browser/dist/pageviews",
      "sdk-browser/dist/identity",
      "sdk-browser/dist/autocapture"
    ])

    await nuxt.close()
  })

  it("registers the plugins, auto-imports, server utils and the Nitro plugin", async () => {
    const nuxt = await load({ key: "mf_test" })
    const imports: { name: string }[] = []
    const nitro = { imports: { imports: [] as { name: string }[] }, virtual: {} }

    await nuxt.callHook("imports:extend", imports as never)
    // Nitro augments NuxtHooks only when its types are loaded.
    await (nuxt.hooks as unknown as { callHook: (name: string, value: unknown) => Promise<void> }).callHook(
      "nitro:config",
      nitro
    )

    expect(nuxt.options.plugins.map((plugin) => (typeof plugin === "string" ? plugin : plugin.src))).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/runtime\/plugin\.client\./),
        expect.stringMatching(/runtime\/plugin\.server\./)
      ])
    )
    expect(imports.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["useMira", "useFlag", "useFlagConfig"])
    )
    expect(nitro.imports.imports.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["useServerMira", "miraFlagsFor"])
    )
    expect((nuxt.options as { nitro?: { plugins?: string[] } }).nitro?.plugins).toEqual(
      expect.arrayContaining([expect.stringMatching(/runtime\/server\/nitro$/)])
    )

    await nuxt.close()
  })
})
