import { createMiraPlugin } from "@mirafive/sdk-vue"

import { defineNuxtPlugin, useRuntimeConfig } from "#app"
import { createMira, mode, plugins } from "#build/mirafive/client.mjs"

export default defineNuxtPlugin({
  name: "mirafive",
  setup(nuxtApp) {
    const { key, host } = (useRuntimeConfig().public["mirafive"] ?? {}) as { key?: string; host?: string }
    let client

    // A configuration mistake costs the measurement, never the page.
    try {
      client = key ? createMira({ key, mode, plugins: plugins(), ...(host ? { host } : {}) }) : undefined
    } catch (error) {
      // oxlint-disable-next-line no-console -- a client plugin has no other channel
      console.error(error)
    }

    nuxtApp.vueApp.use(createMiraPlugin(client))
  }
})
