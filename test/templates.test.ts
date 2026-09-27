import { describe, expect, it } from "vitest"

import { servedFromCache } from "../src/runtime/cache.ts"
import { clientTemplate, type Feature, resolveFeatures, serverTemplate } from "../src/templates.ts"

const client = (features: Feature[], full = false, hash = false): string =>
  clientTemplate({
    full,
    hash,
    features: resolveFeatures({ mode: full ? "full" : "consentless", features }),
    resolve: (id) => `/abs/${id}`
  })

describe("the client template", () => {
  it("imports only pageviews by default, consentless", () => {
    expect(client([])).toBe(
      [
        'import { createMira } from "/abs/@mirafive/sdk-browser"',
        'import { pageviews } from "/abs/@mirafive/sdk-browser/pageviews"',
        "export { createMira }",
        'export const mode = "consentless"',
        "export const plugins = () => [pageviews()]",
        ""
      ].join("\n")
    )
  })

  it("adds identity in full mode and exactly the listed features, flags before experiments", () => {
    const source = client(["experiments", "autocapture", "search"], true)

    expect(source.match(/sdk-browser\/\w+/g)).toEqual([
      "sdk-browser/pageviews",
      "sdk-browser/identity",
      "sdk-browser/autocapture",
      "sdk-browser/search",
      "sdk-browser/flags",
      "sdk-browser/experiments"
    ])
    expect(source).toContain("[pageviews(), identity(), autocapture(), siteSearch(), flags(), experiments()]")
    expect(source).toContain('mode = "full"')
  })

  it("leaves out what is not listed", () => {
    const source = client(["flags"])

    expect(source).toContain("sdk-browser/flags")
    expect(source).not.toMatch(/identity|autocapture|search|experiments/)
  })

  it("follows hash routing", () => {
    expect(client([], false, true)).toContain("pageviews({ hash: true })")
  })
})

describe("options", () => {
  it("refuses an unknown mode or feature, a host without a scheme, and full-only features", () => {
    expect(() => resolveFeatures({ mode: "Full" })).toThrow(/unknown mode "Full"/)
    expect(() => resolveFeatures({ features: ["flag"] })).toThrow(/unknown feature "flag"/)
    expect(() => resolveFeatures({ host: "events.example.eu" })).toThrow(/host needs a scheme/)
    expect(() => resolveFeatures({ features: ["search"] })).toThrow(/"search" needs mode "full"/)
    expect(() => resolveFeatures({ features: ["experiments"] })).toThrow(/"experiments" needs mode "full"/)
  })

  it("brings flags with experiments and turns the server bootstrap on", () => {
    const features = resolveFeatures({ mode: "full", features: ["experiments"] })

    expect([...features]).toEqual(["experiments", "flags"])
    expect(serverTemplate(features)).toBe("export const flags = true\n")
    expect(serverTemplate(resolveFeatures({ features: ["autocapture"] }))).toBe(
      "export const flags = false\n"
    )
  })
})

describe("shared caches", () => {
  it("treats swr, isr, cache and prerender rules and Nitro's cached handlers as shared", () => {
    for (const rule of ["swr", "isr", "cache", "prerender"]) {
      expect(servedFromCache({}, { [rule]: rule === "cache" ? { maxAge: 60 } : 60 })).toBe(true)
    }

    expect(servedFromCache({ cache: { options: {} } }, {})).toBe(true)
    expect(servedFromCache({}, { cache: false, swr: false, headers: {} })).toBe(false)
  })
})
