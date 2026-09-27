# Agents working in mirafive/sdk-nuxt

`@mirafive/sdk-nuxt`: the Nuxt 4 module wiring `@mirafive/sdk-browser` (client),
`@mirafive/sdk-vue` (composables) and `@mirafive/sdk-server` (server utils, flag
bootstrap). Part of the MIRA FIVE SDK family; the wire contract, flag semantics and
public API live in [mirafive/protocol](https://github.com/mirafive/protocol)
(PROTOCOL.md, FLAGS.md, API.md).

## Commands

```sh
bun install --frozen-lockfile
bun run check               # format, lint, typecheck, test, build (nuxt-module-build), publint, attw
bun run test                # vitest: template generator and module setup (loadNuxt on test/fixture)
bun run playground          # nuxt dev playground (offline: the playground fakes the ingest API)
bun run playground:verify   # nuxt build playground, then checks the client bundle and a running server
```

`playground:verify` asserts that the client bundle holds exactly the configured browser
plugins and no server SDK, that the server render writes the `#mirafive-flags` block with
`Cache-Control: private, no-store`, and that `useServerMira()` events are flushed after
the response, while a `swr` route gets no bootstrap and a server warning. Run it after any
change to `src/`.

## Layout

- `src/module.ts`: options, runtime config, templates, plugins, auto-imports.
- `src/templates.ts`: the generated `#build/mirafive/client.mjs` (the only file that
  imports sdk-browser, one import per listed feature) and `#build/mirafive/server.mjs`.
- `src/runtime/`: client and server Nuxt plugins, composables re-export, `cache.ts`
  (which routes a shared cache stores), `server/mira.ts` (shared by the app renderer and
  Nitro through `globalThis`, because the two are bundled separately) and
  `server/nitro.ts` (marks cached routes on `request`, flushes on `afterResponse`).
- `types/nuxt.d.ts`: type-checking shims for `#app`, `#imports` and `#build/…`; never shipped.
- `playground/`: a Nuxt app using the module from `src/`; not in the npm package.

## Rules

- API.md is the contract for this package's public surface (config key, auto-imports,
  server utils). Do not add, rename or remove them without changing API.md first.
- Thin by design: no transport, no evaluator, no router hooks. Pageviews come from
  sdk-browser's `pageviews()`.
- Only listed features may reach the client bundle; keep every sdk-browser import in the
  generated template. `playground:verify` guards this.
- The secret key goes to private runtime config only; the module test asserts it is in no
  template and not in `runtimeConfig.public`.
- A runtime plugin never throws into the app; configuration errors are logged. Invalid
  module options throw at build time.
- Never write the per-visitor bootstrap into a response a shared cache stores (Nitro
  `swr`/`isr`/`cache`/`prerender`, `event.context.cache`): those caches ignore `no-store`.
- `context.sdk` stays what the underlying SDK reports.
- TypeScript is 6.x here, not 7: `@nuxt/module-builder` needs the TypeScript JS API.
- Comments only for a non-obvious constraint, one or two lines.
- Do not run git write commands unless asked; the maintainer commits.

## Local development

`@mirafive/sdk-browser`, `@mirafive/sdk-vue` and `@mirafive/sdk-server` are unpublished:
`devDependencies` and `overrides` point at `file:../sdk-browser`, `file:../sdk-vue` and
`file:../sdk-server` (build their `dist` first). Once 1.0.0 is on npm, switch them to
`^1.0.0` and drop `overrides`; CI cannot install until then.
