import { describe, expect, it } from "vitest"

import { clientTemplate, type Feature, resolveFeatures } from "../src/templates.ts"

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

  it("adds identity in full mode and exactly the listed features", () => {
    const source = client(["search", "autocapture"], true)

    expect(source.match(/sdk-browser\/\w+/g)).toEqual([
      "sdk-browser/pageviews",
      "sdk-browser/identity",
      "sdk-browser/autocapture",
      "sdk-browser/search"
    ])
    expect(source).toContain("[pageviews(), identity(), autocapture(), siteSearch()]")
    expect(source).toContain('mode = "full"')
  })

  it("leaves out what is not listed", () => {
    const source = client(["search"], true)

    expect(source).toContain("sdk-browser/search")
    expect(source).not.toMatch(/autocapture/)
  })

  it("follows hash routing", () => {
    expect(client([], false, true)).toContain("pageviews({ hash: true })")
  })
})

describe("options", () => {
  it("refuses an unknown mode or feature, a host without a scheme, and full-only features", () => {
    expect(() => resolveFeatures({ mode: "Full" })).toThrow(/unknown mode "Full"/)
    expect(() => resolveFeatures({ features: ["flags"] })).toThrow(/unknown feature "flags"/)
    expect(() => resolveFeatures({ host: "events.example.eu" })).toThrow(/host needs a scheme/)
    expect(() => resolveFeatures({ features: ["search"] })).toThrow(/"search" needs mode "full"/)
  })
})
