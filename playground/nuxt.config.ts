export default defineNuxtConfig({
  modules: ["../src/module"],
  mirafive: {
    key: "mf_playground_demo",
    mode: "full",
    features: ["autocapture"]
  },
  devtools: { enabled: false },
  telemetry: false,
  compatibilityDate: "2026-09-01"
})
