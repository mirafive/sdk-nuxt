import { createMiraPlugin, type MiraOptions } from "@mirafive/vue";

import { defineNuxtPlugin, useRuntimeConfig } from "#app";

/** Installs `@mirafive/vue`; the client starts in the browser and does nothing on the server. */
export default defineNuxtPlugin({
  name: "mirafive",
  setup(nuxtApp) {
    const { key, host, ...options } = (useRuntimeConfig().public.mirafive ??
      {}) as Partial<MiraOptions>;
    nuxtApp.vueApp.use(createMiraPlugin({ ...options, key: key ?? "", ...(host ? { host } : {}) }));
  },
});
