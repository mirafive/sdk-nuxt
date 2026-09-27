# Changelog

## 0.5.0 — unreleased

First release on the v1 protocol, rebuilt from scratch as a thin module over
`@mirafive/sdk-browser`, `@mirafive/sdk-vue` and `@mirafive/sdk-server`.

- Config key `mirafive`: `{ key, host, mode, features, secretKey }`, with
  `NUXT_PUBLIC_MIRAFIVE_KEY`, `NUXT_PUBLIC_MIRAFIVE_HOST` and `MIRAFIVE_SECRET_KEY`
  (or `NUXT_MIRAFIVE_SECRET_KEY`) at runtime. The secret key stays in private runtime
  config.
- A generated client template imports exactly the listed browser plugins; `mode: "full"`
  adds `identity()`, `experiments` brings `flags`, and `search`/`experiments` are left
  out without full mode.
- Auto-imports `useMira`, `useFlag`, `useFlagConfig`; server utils `useServerMira(event)`
  (flushed with `event.waitUntil` after the response) and `miraFlagsFor(event, unit)`
  (reads `Sec-GPC`/`DNT` into `optedOut`).
- With `flags`, the server render answers flags from one bootstrap, writes it to the head
  and sends `Cache-Control: private, no-store`; `event.context.mirafive` names the unit.
- A playground with an offline fake ingest API and `playground:verify`.
