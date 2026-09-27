export type Feature = "autocapture" | "search" | "flags" | "experiments"

export interface ClientTemplateOptions {
  readonly full: boolean
  readonly hash: boolean
  readonly features: ReadonlySet<Feature>
  /** Maps `@mirafive/sdk-browser…` to the file the module resolves, so the app need not resolve the peer itself. */
  readonly resolve: (id: string) => string
}

const known: readonly Feature[] = ["autocapture", "search", "flags", "experiments"]

const fail = (message: string): never => {
  throw new TypeError(`[@mirafive/sdk-nuxt] ${message}`)
}

/** Checks the options at build time; `experiments` brings `flags`. */
export const resolveFeatures = (options: {
  mode?: unknown
  features?: readonly unknown[] | undefined
  host?: unknown
}): Set<Feature> => {
  const { mode = "consentless", host } = options
  const features = new Set<Feature>()

  if (mode !== "consentless" && mode !== "full") {
    fail(`unknown mode "${String(mode)}"`)
  }

  if (host !== undefined && (typeof host !== "string" || !/^https?:\/\/./.test(host))) {
    fail("host needs a scheme")
  }

  for (const feature of options.features ?? []) {
    const found =
      known.find((candidate) => candidate === feature) ?? fail(`unknown feature "${String(feature)}"`)

    if (mode !== "full" && (found === "search" || found === "experiments")) {
      fail(`"${found}" needs mode "full"`)
    }

    features.add(found)
  }

  if (features.has("experiments")) {
    features.add("flags")
  }

  return features
}

/** The browser plugins in `createMira` order, as `[subpath, export, options]`. Only these are imported. */
export const browserPlugins = ({
  full,
  hash,
  features
}: Omit<ClientTemplateOptions, "resolve">): (readonly [string, string, string])[] =>
  (
    [
      [true, "pageviews", "pageviews", hash ? "{ hash: true }" : ""],
      [full, "identity", "identity", ""],
      [features.has("autocapture"), "autocapture", "autocapture", ""],
      [features.has("search"), "search", "siteSearch", ""],
      [features.has("flags"), "flags", "flags", ""],
      [features.has("experiments"), "experiments", "experiments", ""]
    ] as const
  ).flatMap(([on, ...plugin]) => (on ? [plugin] : []))

/** `#build/mirafive/client.mjs`: `createMira`, the mode and exactly the plugins asked for. */
export const clientTemplate = (options: ClientTemplateOptions): string => {
  const plugins = browserPlugins(options)
  const from = (subpath?: string): string =>
    JSON.stringify(options.resolve(subpath ? `@mirafive/sdk-browser/${subpath}` : "@mirafive/sdk-browser"))

  return [
    `import { createMira } from ${from()}`,
    ...plugins.map(([subpath, name]) => `import { ${name} } from ${from(subpath)}`),
    "export { createMira }",
    `export const mode = ${JSON.stringify(options.full ? "full" : "consentless")}`,
    `export const plugins = () => [${plugins.map(([, name, given]) => `${name}(${given})`).join(", ")}]`,
    ""
  ].join("\n")
}

/** `#build/mirafive/server.mjs`: whether the server render writes a flag bootstrap. */
export const serverTemplate = (features: ReadonlySet<Feature>): string =>
  `export const flags = ${features.has("flags")}\n`
