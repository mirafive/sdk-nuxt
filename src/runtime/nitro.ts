import { usedClient } from "./server";

interface EventLike {
  context: Record<string, unknown>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface NitroAppLike {
  hooks: { hook: (name: "afterResponse", handler: (event: EventLike) => void) => unknown };
}

/** Sends a request's server events once its response is out, without holding the response. */
export default function mirafiveNitroPlugin(nitroApp: NitroAppLike): void {
  nitroApp.hooks.hook("afterResponse", (event) => {
    const flushed = usedClient(event)?.flush();
    if (flushed) event.waitUntil?.(flushed);
  });
}
