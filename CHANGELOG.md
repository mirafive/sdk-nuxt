# Changelog

## Unreleased

- **Breaking:** feature flags and A/B experiments are removed. `features` no longer
  accepts `"flags"` or `"experiments"` (the build fails for them), the auto-imports
  `useFlag`, `useFlagConfig` and `miraFlagsFor` are gone, and the server render writes no
  `#mirafive-flags` block and no longer sets `Cache-Control: private, no-store`.
  `@mirafive/sdk-server/flags` is no longer used.
- Consent: statistics is the only purpose. The `experiments` and `targeting` purposes are
  gone. `useMira().consent({ experiments, targeting })` from an existing site still
  works; sdk-browser accepts and ignores the keys.


## 1.0.0 — 2026-09-27

First release on the v1 protocol, rebuilt from scratch as a thin module over
`@mirafive/sdk-browser`, `@mirafive/sdk-vue` and `@mirafive/sdk-server`.

- Config key `mirafive`: `{ key, host, mode, features, secretKey }`, with
  `NUXT_PUBLIC_MIRAFIVE_KEY`, `NUXT_PUBLIC_MIRAFIVE_HOST` and `MIRAFIVE_SECRET_KEY`
  (or `NUXT_MIRAFIVE_SECRET_KEY`) at runtime. The secret key stays in private runtime
  config.
- A generated client template imports exactly the listed browser plugins; `mode: "full"`
  adds `identity()` and `experiments` brings `flags`. The build fails for an unknown mode
  or feature, a host without a scheme, or `search`/`experiments` without full mode.
- A missing website key warns at build (unless `NUXT_PUBLIC_MIRAFIVE_KEY` is set) and once
  in the browser.
- Auto-imports `useMira`, `useFlag`, `useFlagConfig`; server utils `useServerMira(event)`
  (flushed with `event.waitUntil` after the response) and `miraFlagsFor(event, unit)`
  (reads `Sec-GPC`/`DNT` into `optedOut`).
- With `flags`, the server render answers flags from one bootstrap, writes it to the head
  and sends `Cache-Control: private, no-store`; `event.context.mirafive` names the unit.
  Routes a shared cache stores (`swr`, `isr`, `cache`, `prerender`) get no bootstrap and a
  one-time server warning.
- The server utils read `MIRAFIVE_HOST` at runtime when the public host is empty.
- A playground with an offline fake ingest API and `playground:verify`.
