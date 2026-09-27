# @mirafive/sdk-nuxt

MIRA FIVE for Nuxt 4: one module for pageviews and events, feature flags that are
already answered in the server render, and server-side events. Privacy-first analytics
and feature flags from MIRA FIVE, hosted in the EU.

## Size

The module generates the client plugin at build time and imports only the browser
plugins you list; nothing else reaches the client bundle.

| In the client bundle | min + gzip |
|---|---|
| `@mirafive/sdk-browser` core + `pageviews()` (always) | 2.31 kB |
| `@mirafive/sdk-vue` (plugin and composables) | 0.67 kB |
| `identity()` (added by `mode: "full"`) | 1.07 kB |
| `features: ["autocapture"]` | 0.86 kB |
| `features: ["search"]` (full mode) | 0.40 kB |
| `features: ["flags"]` | 2.82 kB |
| `features: ["experiments"]` (full mode, brings flags) | 0.47 kB |

Numbers are those measured by `@mirafive/sdk-browser` and `@mirafive/sdk-vue`; the
module's own client plugin adds a few hundred bytes. `@mirafive/sdk-server` runs on the
server only and is never bundled for the browser.

## Install

```sh
npx nuxi module add @mirafive/sdk-nuxt
# or: npm install @mirafive/sdk-nuxt @mirafive/sdk-vue @mirafive/sdk-browser @mirafive/sdk-server
```

Nuxt ≥ 4, Node ≥ 20. `@mirafive/sdk-vue`, `@mirafive/sdk-browser` and
`@mirafive/sdk-server` are peer dependencies (npm and pnpm install them for you).

## Quickstart

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@mirafive/sdk-nuxt"],
  mirafive: {
    features: ["flags"]
  }
})
```

```sh
# .env
NUXT_PUBLIC_MIRAFIVE_KEY=mf_…      # the website key (public)
MIRAFIVE_SECRET_KEY=mf_…           # server only: server events and the flag bootstrap
```

```vue
<script setup lang="ts">
const mira = useMira()
const newCheckout = useFlag("new-checkout", false)
</script>

<template>
  <button @click="mira.track('checkout started')">{{ newCheckout ? "Pay now" : "Checkout" }}</button>
</template>
```

```ts
// server/api/order.post.ts
export default defineEventHandler(async (event) => {
  const order = await createOrder(event)

  useServerMira(event).track("order completed", {
    userId: order.customerId,
    properties: { revenue: order.total, currency: "EUR" }
  })

  return order
})
```

Pageviews need no code: sdk-browser's `pageviews()` follows the Nuxt router.

Verify it: deploy (or run on a non-local host), open a page and look for
`POST https://events.mirafive.io/v1/batch/mf_…` answering `202` in the network tab, then
for the pageview in the source's live view in MIRA FIVE. With `flags`, the page source
has `<script type="application/json" id="mirafive-flags">` in its head and the response
carries `Cache-Control: private, no-store`.

## Consent & privacy

- **Default mode: `consentless`.** No cookies, no storage, no ids, no language, time zone
  or screen size; a consentless site needs no consent banner.
- **`mode: "full"`** adds `identity()` to the bundle automatically: an anonymous id, a
  session id, your user id, and it unlocks `search` and `experiments`. Nothing is sent or
  stored before a consent answer. Wire it to your consent manager (CMP):

  ```ts
  // plugins/consent.client.ts
  export default defineNuxtPlugin(() => {
    const mira = useMira()

    window.addEventListener("CookiebotOnConsentReady", () => {
      const { statistics, preferences, marketing } = Cookiebot.consent
      mira.consent({ statistics, experiments: preferences, targeting: marketing })
    })
  })
  ```

- Do Not Track, Global Privacy Control, `window.__mirafive_ignore` and prerendering send
  nothing in the browser. On the server, `miraFlagsFor()` reads `Sec-GPC: 1` and `DNT: 1`
  from the request and passes `optedOut`: no ids, no segment lookup, no exposure.
- The flag bootstrap is per visitor, so pages carrying it are sent with
  `Cache-Control: private, no-store`. Pages stored in a shared cache (route rules `swr`,
  `isr`, `cache`, `prerender`, or any Nitro cached handler) never carry one, because such
  caches ignore `no-store`; see *Cached routes* below.
- The secret key lives in the private runtime config only; it is never written to the
  public config, the generated client code or the page.

## API reference

### Module options (`mirafive` in `nuxt.config.ts`)

| Option | Default | Runtime env | |
|---|---|---|---|
| `key` | `""` | `NUXT_PUBLIC_MIRAFIVE_KEY` | the source's public website key |
| `host` | `https://events.mirafive.io` | `NUXT_PUBLIC_MIRAFIVE_HOST` (browser and server); `MIRAFIVE_HOST` (read at build for the browser, at runtime by the server utils) | needs a scheme |
| `mode` | `"consentless"` | build time only | `"full"` adds `identity()` |
| `features` | `[]` | build time only | any of `"autocapture"`, `"search"`, `"flags"`, `"experiments"`; `search` and `experiments` need `"full"`; `experiments` brings `flags` |

The build fails with a `TypeError` for an unknown `mode` or feature, a `host` without a
scheme, or `search`/`experiments` without `mode: "full"`. A missing website key (neither
`key` nor `NUXT_PUBLIC_MIRAFIVE_KEY` at build) is a build warning, and the browser logs
`[mirafive] no website key` once per page while it is still empty at runtime.
| `secretKey` | `""` | `MIRAFIVE_SECRET_KEY` or `NUXT_MIRAFIVE_SECRET_KEY` | server only; prefer the env var over a literal |

### Auto-imports (app)

| | |
|---|---|
| `useMira<Events>(): Mira<Events>` | the sdk-browser client; on the server a stand-in that does nothing |
| `useFlag(key, fallback: boolean \| string): Readonly<Ref<string \| boolean>>` | exactly what `mira.flag(key, fallback)` answers (`true`/`false` for on/off flags, the variant otherwise) as a ref; the bootstrap during SSR and hydration, then follows flag loads |
| `useFlagConfig<T>(key, fallback: T): Readonly<Ref<T>>` | the variant's remote-config value as a ref |

### Server utils (auto-imported in `server/`)

| | |
|---|---|
| `useServerMira(event): Mira` | a process-wide `@mirafive/sdk-server` client on the secret key; this request's events are flushed with `event.waitUntil` after the response |
| `miraFlagsFor(event, unit?): Promise<UserFlags>` | `MiraFlags.for(unit)` from `@mirafive/sdk-server/flags` on one process-wide client; `optedOut` from `Sec-GPC`/`DNT`; refreshes and exposures go to `event.waitUntil` |

`unit` is `{ userId?, anonymousId?, properties?, consent?: { experiments?, targeting? } }`.

### Flag bootstrap

With `"flags"` in `features` and a secret key, every server render computes the flags
once, renders `useFlag` from them, writes the block into the head and sets
`Cache-Control: private, no-store`. It is computed for an anonymous visitor unless a
server middleware names the unit:

```ts
// server/middleware/mirafive.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  event.context.mirafive = { userId: session.user?.id, properties: { plan: session.user?.plan } }
})
```

### Cached routes

Nitro's `swr`/`isr`/`cache` route rules (and CDN ISR on Vercel or Netlify) store one
rendered page and serve it to every visitor; they ignore `Cache-Control: private, no-store`.
On such routes, and on prerendered pages, the module writes no bootstrap, renders `useFlag`
with its fallback, and warns once per server process
(`[mirafive] no flag bootstrap on cached route …`). The browser then loads the flags
itself and the refs update after hydration. Keep pages that must render a flag's value on
the server off shared caches.

## Framework / runtime notes

- **Serverless and edge.** One client pair per process or isolate; per-request work goes
  to `event.waitUntil` (Nitro provides it on every preset). The first flag read of a cold
  instance waits up to 1.5 s for the flag document; later reads are synchronous.
- **Hash routing** (`router.options.hashMode`) switches `pageviews({ hash: true })` on.
- **Prerendering / `nuxi generate`, `swr`, `isr`, `cache`.** No bootstrap on these pages
  (see *Cached routes*); the browser fetches its flags instead.
- **`MIRAFIVE_HOST`.** For the browser it is baked in at build time (the client never sees
  server env); set `NUXT_PUBLIC_MIRAFIVE_HOST` to change it per deployment. The server
  utils also read `MIRAFIVE_HOST` at runtime when the public host is empty.
- **Development.** `localhost` sends nothing (sdk-browser's local-host guard); a
  `[mirafive] local host` warning in the console confirms the client is running.
- **CSP.** `connect-src https://events.mirafive.io` (or your `host`). The bootstrap block
  is `type="application/json"` and is not executed.
- Without a website key the client stays off (logged once in the browser) and the
  composables answer fallbacks; a configuration error in the browser is logged, never
  thrown into your app.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Nothing arrives | Local hosts send nothing; check Do Not Track / GPC; in `mode: "full"` a `consent(…)` call must have run; check `NUXT_PUBLIC_MIRAFIVE_KEY` (the browser logs `no website key`) and `host`. |
| Build fails with `[@mirafive/sdk-nuxt] …` | An unknown `mode` or feature, a `host` without a scheme, or `search`/`experiments` without `mode: "full"`. |
| `403 secret_key_in_path` / `website_key_as_bearer` | The key kinds are swapped: `key` is the website key (`mf_…`), `secretKey` the server's. |
| `403 origin_not_allowed` | Add the site's origin to the source's allowed origins in MIRA FIVE. |
| A flag always returns its fallback | Not in this source's flags, `"flags"` missing from `features`, no secret key (no bootstrap; the browser still loads flags after hydration), a `u: p` flag without `event.context.mirafive.userId`, or the fallback has the other kind (boolean vs string). |
| No `#mirafive-flags` block in the head | `"flags"` is not in `features`, no secret key at runtime, or the route is prerendered or cached (`swr`, `isr`, `cache`); the server logs which. |
| Server events missing | `MIRAFIVE_SECRET_KEY` is not set at runtime; transport errors are logged with a `[mirafive]` prefix. |

## For AI agents

Copy-paste setup prompt:

```text
Add MIRA FIVE analytics (and feature flags) to this Nuxt 4 app with @mirafive/sdk-nuxt.
1. Run `npx nuxi module add @mirafive/sdk-nuxt` (or install @mirafive/sdk-nuxt,
   @mirafive/sdk-vue, @mirafive/sdk-browser and @mirafive/sdk-server and add
   "@mirafive/sdk-nuxt" to `modules`).
2. In nuxt.config.ts add `mirafive: { features: [] }`; add "flags" if the app reads flags,
   "autocapture" if clicks should be counted. Leave `mode` out (consentless) unless the
   site already has a consent manager.
3. Env: NUXT_PUBLIC_MIRAFIVE_KEY=<website key mf_…> (public). If server events or the flag
   bootstrap are needed: MIRAFIVE_SECRET_KEY=<secret key> (server only, never in client
   code or nuxt.config literals).
4. In components use the auto-imports: `const mira = useMira()`, `mira.track("name", {…})`
   in handlers, `const on = useFlag("key", false)` (a Ref). In server/ routes use
   `useServerMira(event).track(…)` and `await miraFlagsFor(event, { userId })`.
   Do not add pageview code; pageviews are automatic.
5. Only with an existing consent manager: set `mode: "full"` and call
   `useMira().consent({ statistics, experiments, targeting })` from its callback in a
   `.client.ts` plugin.
6. Verify: `nuxi build`, run it on a non-local host, check the network tab for
   POST https://events.mirafive.io/v1/batch/<key> answering 202; with flags, check the
   page head for id="mirafive-flags". Report what you changed.
Do not add other analytics libraries, cookies or consent banners.
```

Facts for agents:

- Config key `mirafive`: `{ key, host, mode, features, secretKey }`. `features` is a list of
  `"autocapture" | "search" | "flags" | "experiments"`; pageviews are always on.
- Auto-imports: `useMira`, `useFlag`, `useFlagConfig` (app); `useServerMira(event)`,
  `miraFlagsFor(event, unit)` (Nitro `server/`). No manual imports needed; outside Nuxt
  they come from `@mirafive/sdk-vue` and `@mirafive/sdk-server`.
- Env vars: `NUXT_PUBLIC_MIRAFIVE_KEY` (website key, public), `NUXT_PUBLIC_MIRAFIVE_HOST`
  (optional, runtime), `MIRAFIVE_HOST` (optional; build time for the browser, runtime for
  the server), `MIRAFIVE_SECRET_KEY` or `NUXT_MIRAFIVE_SECRET_KEY` (server only).
- The secret key is only ever read from private runtime config or the server's
  environment; never put it under `runtimeConfig.public`, in `app.config`, or in client code.
- Consentless (default) needs no banner and stores nothing. `mode: "full"` bundles
  `identity()` and sends nothing until `consent(…)`; put it behind the site's CMP.
- `search` and `experiments` work only with `mode: "full"`; the build fails otherwise, as
  it does for an unknown mode or feature.
- The flag bootstrap needs `"flags"` and a secret key; it sets
  `Cache-Control: private, no-store` on the page and is skipped (with a server warning) on
  `swr`/`isr`/`cache`/`prerender` routes, where `useFlag` renders its fallback on the server. Name a signed-in user with
  `event.context.mirafive = { userId }` in a server middleware.
- Nothing throws for transport reasons: the browser SDK warns once on local hosts, the
  server SDK logs `[mirafive] …` warnings.
- Verify an install: `POST …/v1/batch/{key}` answers `202 { "accepted": n }`; the event
  shows in the source's live view; with flags the head has `#mirafive-flags`.
- Wire contract: [mirafive/protocol](https://github.com/mirafive/protocol).

## License

[MIT](LICENSE) © 2026 Cloo GmbH
