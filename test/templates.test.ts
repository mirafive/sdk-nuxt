import { describe, expect, it } from "vitest"

import { clientTemplate, type Feature, resolveFeatures, serverTemplate } from "../src/templates.ts"

const client = (features: Feature[], full = false, hash = false): string =>
  clientTemplate({
    full,
    hash,
    features: resolveFeatures(features, full).features,
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

describe("features", () => {
  it("drops search and experiments without full mode", () => {
    const { features, dropped } = resolveFeatures(["search", "experiments", "autocapture"], false)

    expect([...features]).toEqual(["autocapture"])
    expect(dropped).toEqual(["search", "experiments"])
  })

  it("turns the server bootstrap on with flags", () => {
    expect(serverTemplate(resolveFeatures(["experiments"], true).features)).toBe(
      "export const flags = true\n"
    )
    expect(serverTemplate(resolveFeatures(["autocapture"], true).features)).toBe(
      "export const flags = false\n"
    )
  })
})
