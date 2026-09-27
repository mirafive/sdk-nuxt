# Changelog

## 1.0.0 — unreleased

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
