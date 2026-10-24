export default defineEventHandler((event) => {
  useServerMira(event).track("signup", { userId: "u_42", properties: { plan: "pro" } })

  return { ok: true }
})
