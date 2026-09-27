export default defineEventHandler(async (event) => {
  const flags = await miraFlagsFor(event, { userId: "u_42" })

  useServerMira(event).track("signup", { userId: "u_42", properties: { plan: "pro" } })

  return { newCheckout: flags.enabled("new-checkout"), serverOnly: flags.enabled("server-only") }
})
