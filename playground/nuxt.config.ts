export default defineNuxtConfig({
  modules: ["../src/module"],
  mirafive: {
    key: "mf_playground_demo",
    mode: "full",
    features: ["autocapture", "flags"]
  },
  // Stored by Nitro and served to everyone: no per-visitor bootstrap here.
  routeRules: { "/cached/**": { swr: 60 } },
  devtools: { enabled: false },
  telemetry: false,
  compatibilityDate: "2026-09-01"
})
