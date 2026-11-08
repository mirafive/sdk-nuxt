import { Mira } from "@mirafive/node";

import { useRuntimeConfig } from "#imports";

// The app renderer and Nitro may load this file twice; both share one client per process.
const KEY = Symbol.for("mirafive.server");
const holder: { client?: Mira; used: WeakSet<object> } = ((globalThis as Record<symbol, unknown>)[
  KEY
] ??= { used: new WeakSet() }) as { client?: Mira; used: WeakSet<object> };

/**
 * The process-wide server client (secret key from `NUXT_MIRAFIVE_SECRET_KEY`, else
 * `MIRAFIVE_SECRET_KEY`). Its events are sent after the response, through `event.waitUntil`.
 *
 * ```ts
 * export default defineEventHandler((event) => {
 *   useServerMira(event).track({ event: "report_exported", userId: "user_42" });
 * });
 * ```
 */
export function useServerMira(event: object): Mira {
  const config = useRuntimeConfig(event) as {
    mirafive?: { secretKey?: string };
    public?: { mirafive?: { host?: string } };
  };
  holder.client ??= new Mira({
    secretKey: config.mirafive?.secretKey || undefined,
    host: config.public?.mirafive?.host || undefined,
  });
  holder.used.add(event);
  return holder.client;
}

/** For the Nitro plugin: the client, if a handler used it. */
export const usedClient = (event: object) => (holder.used.has(event) ? holder.client : undefined);
