import { createRequire } from "node:module"

import {
  addImports,
  addPlugin,
  addServerImports,
  addServerPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit"

import { clientTemplate, type Feature, resolveFeatures, serverTemplate } from "./templates"

export type { Feature }

export interface ModuleOptions {
  /** The source's public website key (`mf_…`). `NUXT_PUBLIC_MIRAFIVE_KEY` sets it at runtime. */
  key?: string
  /** Default `https://events.mirafive.io`. `NUXT_PUBLIC_MIRAFIVE_HOST` sets it at runtime. */
  host?: string
  /** The browser's mode, default `"consentless"`. `"full"` adds `identity()` and needs a consent answer. */
  mode?: "consentless" | "full"
  /** Browser plugins besides pageviews; nothing else is bundled. */
  features?: Feature[]
  /** Server only, for `useServerMira()` and `miraFlagsFor()`. Prefer `MIRAFIVE_SECRET_KEY` at runtime. */
  secretKey?: string
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? { ...value } : {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@mirafive/sdk-nuxt",
    configKey: "mirafive",
    compatibility: { nuxt: ">=4.0.0" }
  },
  defaults: {
    mode: "consentless",
    features: []
  },
  setup(options, nuxt) {
    const logger = useLogger("mirafive")
    const resolver = createResolver(import.meta.url)
    const require = createRequire(import.meta.url)
    const features = resolveFeatures(options)
    const full = options.mode === "full"
    const config = nuxt.options.runtimeConfig
    const key = options.key ?? ""

    if (key === "" && !process.env["NUXT_PUBLIC_MIRAFIVE_KEY"]) {
      logger.warn(
        "No website key: set mirafive.key or NUXT_PUBLIC_MIRAFIVE_KEY. Nothing is sent without one."
      )
    }

    // Written even when empty: Nuxt applies NUXT_* overrides only to keys that exist.
    config.public["mirafive"] = {
      key,
      host: options.host ?? process.env["MIRAFIVE_HOST"] ?? "",
      ...record(config.public["mirafive"])
    }
    config["mirafive"] = { secretKey: options.secretKey ?? "", ...record(config["mirafive"]) }

    addTemplate({
      filename: "mirafive/client.mjs",
      getContents: () =>
        clientTemplate({
          full,
          hash: nuxt.options.router.options.hashMode === true,
          features,
          resolve: (id) => require.resolve(id)
        })
    })
    addTemplate({ filename: "mirafive/server.mjs", getContents: () => serverTemplate(features) })

    addPlugin({ src: resolver.resolve("./runtime/plugin.client"), mode: "client" })
    addPlugin({ src: resolver.resolve("./runtime/plugin.server"), mode: "server" })
    addImports(
      ["useMira", "useFlag", "useFlagConfig"].map((name) => ({
        name,
        from: resolver.resolve("./runtime/composables")
      }))
    )
    addServerImports(
      ["useServerMira", "miraFlagsFor"].map((name) => ({
        name,
        from: resolver.resolve("./runtime/server/mira")
      }))
    )
    addServerPlugin(resolver.resolve("./runtime/server/nitro"))
  }
})
