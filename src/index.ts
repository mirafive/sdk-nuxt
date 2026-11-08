/**
 * `@mirafive/nuxt`: MIRA FIVE for Nuxt 3 and 4, as a module with no dependencies of its own.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ["@mirafive/nuxt"],
 *   mirafive: { key: "mira_pk_…" }, // or NUXT_PUBLIC_MIRAFIVE_KEY at runtime
 * });
 * ```
 *
 * Components get `useMira()` and `useIdentify()`, server routes `useServerMira(event)`; both are
 * auto-imported. Pageviews on client-side navigation are captured on their own.
 */
import { fileURLToPath } from "node:url";

import type { AutocaptureOptions, ConsentChoice } from "@mirafive/web";

export interface ModuleOptions {
  /** The project's public key (`mira_pk_…`). At runtime: `NUXT_PUBLIC_MIRAFIVE_KEY`. */
  key?: string;
  /** Ingest origin. Default `https://events.mirafive.io`. At runtime: `NUXT_PUBLIC_MIRAFIVE_HOST`. */
  host?: string;
  /** `'auto'` (default) follows the consent banner; an object sets it for custom banners. */
  consent?: "auto" | ConsentChoice;
  /** What the browser SDK captures on its own; all on by default. */
  autocapture?: boolean | AutocaptureOptions;
  debug?: boolean;
  /**
   * Server only, for `useServerMira()`. Prefer `NUXT_MIRAFIVE_SECRET_KEY` or `MIRAFIVE_SECRET_KEY`
   * at runtime, so the key is not in your build.
   */
  secretKey?: string;
}

/** The parts of Nuxt this module touches: documented options and hooks only. */
export interface NuxtLike {
  options: {
    runtimeConfig: Record<string, unknown> & { public: Record<string, unknown> };
    plugins: (string | { src: string; mode?: "all" | "client" | "server" })[];
    build: { transpile: (string | RegExp)[] };
    mirafive?: ModuleOptions;
  };
  hook(name: string, handler: (...args: never[]) => unknown): unknown;
}

interface NitroConfigLike {
  plugins?: string[];
  imports?: false | { imports?: { name: string; from: string }[] };
  externals?: { inline?: (string | RegExp)[] };
}

const runtime = (file: string) => fileURLToPath(new URL(`./runtime/${file}`, import.meta.url));
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};

/** The module. Nuxt calls it with the inline options and the Nuxt instance. */
function mirafive(inlineOptions: ModuleOptions = {}, nuxt: NuxtLike): void {
  const { secretKey, ...browser } = { ...nuxt.options.mirafive, ...inlineOptions };
  const config = nuxt.options.runtimeConfig;

  if ((browser.key ?? "").startsWith("mira_sk_")) {
    throw new Error(
      "MIRA FIVE: mirafive.key is a secret key (mira_sk_…). It would ship to every browser: use the public key, and put the secret key in NUXT_MIRAFIVE_SECRET_KEY.",
    );
  }

  // Written even when empty: Nuxt applies NUXT_* environment overrides only to keys that exist.
  config.public.mirafive = { key: "", host: "", ...browser, ...record(config.public.mirafive) };
  config.mirafive = { secretKey: secretKey ?? "", ...record(config.mirafive) };

  const runtimeDir = fileURLToPath(new URL("./runtime", import.meta.url));
  nuxt.options.build.transpile.push(runtimeDir);
  // First, like @nuxt/kit does it, so the app's own plugins can already use useMira().
  nuxt.options.plugins.unshift({ src: runtime("plugin.js"), mode: "all" });

  nuxt.hook("imports:extend", ((imports: { name: string; from: string }[]) => {
    for (const name of ["useMira", "useIdentify"])
      imports.push({ name, from: runtime("composables.js") });
  }) as (...args: never[]) => unknown);

  nuxt.hook("nitro:config", ((nitro: NitroConfigLike) => {
    nitro.plugins ??= [];
    nitro.plugins.push(runtime("nitro.js"));
    if (nitro.imports !== false) {
      nitro.imports ??= {};
      nitro.imports.imports ??= [];
      nitro.imports.imports.push({ name: "useServerMira", from: runtime("server.js") });
    }
    nitro.externals ??= {};
    nitro.externals.inline ??= [];
    nitro.externals.inline.push(runtimeDir);
  }) as (...args: never[]) => unknown);
}

/** How Nuxt names the module in logs and finds its config key. */
mirafive.getMeta = () =>
  Promise.resolve({
    name: "@mirafive/nuxt",
    configKey: "mirafive",
    compatibility: { nuxt: ">=3.13.0" },
  });

export default mirafive;
