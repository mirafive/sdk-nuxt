/** Route rules whose response Nitro or a CDN stores and serves to others, whatever `Cache-Control` says. */
export const sharedCacheRules = ["swr", "isr", "cache", "prerender"] as const

/** `context.cache` is set by Nitro's cached handlers. */
export const servedFromCache = (
  context: Readonly<Record<string, unknown>>,
  rules: Readonly<Record<string, unknown>>
): boolean => !!context["cache"] || sharedCacheRules.some((rule) => !!rules[rule])
